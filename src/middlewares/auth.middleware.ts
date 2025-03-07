import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ApiError } from '../utils/ApiError';
import prisma from '../config/prisma';
import logger from '../config/logger';

// Estender a interface Request para incluir o usuário
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        clerkId: string;
        role: string;
        email?: string;
      };
    }
  }
}

// Middleware simplificado para verificar se o usuário está autenticado
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar se o token existe
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      logger.warn('Tentativa de acesso sem token de autenticação');
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Autenticação via Clerk
    try {
      // Verificar a sessão com o Clerk
      const session = await clerkClient.sessions.verifySession(token, token);
      if (!session) {
        return res.status(401).json({ error: 'Sessão inválida' });
      }

      // Obter o usuário do Clerk
      const clerkUser = await clerkClient.users.getUser(session.userId);
      if (!clerkUser) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      // Obter o email do usuário Clerk
      const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress || '';

      // Buscar ou criar o usuário no banco de dados local
      let user = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
      });

      if (!user) {
        // Criar novo usuário no banco de dados
        user = await prisma.user.create({
          data: {
            clerkId: clerkUser.id,
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Usuário',
            email: clerkEmail,
            role: 'USER',
            status: 'PENDING',
          }
        });
      }

      // Definir o usuário na requisição
      req.user = {
        id: user.id,
        clerkId: user.clerkId,
        role: user.role,
        email: user.email
      };

      next();
    } catch (error) {
      logger.error(`Erro na autenticação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return res.status(401).json({ error: 'Não autorizado' });
    }
  } catch (error) {
    logger.error(`Erro geral no middleware: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware simplificado para verificar papel/função do usuário
// A verificação de roles foi REMOVIDA pois agora é feita no frontend com Clerk
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Verificar se o usuário está autenticado
    if (!req.user || !req.user.id) {
      logger.warn('Tentativa de acesso sem autenticação a rota protegida por role');
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // Verificar se o usuário tem a role necessária
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      logger.warn(`Usuário ${req.user.id} com role ${req.user.role} tentou acessar rota que requer ${roles.join(', ')}`);
      return res.status(403).json({ message: 'Acesso negado. Permissão insuficiente.' });
    }

    // Permitir acesso
    next();
  };
};

// Middleware simplificado para validar usuário em rotas públicas
export const validateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    // Se não houver token, prosseguir sem usuário
    if (!token) {
      req.user = undefined;
      return next();
    }

    // Tentar autenticar com o token disponível
    try {
      const session = await clerkClient.sessions.verifySession(token, token);
      if (!session) {
        req.user = undefined;
        return next();
      }

      const clerkUser = await clerkClient.users.getUser(session.userId);
      if (!clerkUser) {
        req.user = undefined;
        return next();
      }

      // Buscar usuário no banco local
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
      });

      if (user) {
        req.user = {
          id: user.id,
          clerkId: user.clerkId,
          role: user.role,
          email: user.email
        };
      }
    } catch (error) {
      // Em caso de erro, prosseguir sem usuário
      req.user = undefined;
    }
    
    next();
  } catch (error) {
    // Em caso de erro, prosseguir sem usuário
    req.user = undefined;
    next();
  }
}; 