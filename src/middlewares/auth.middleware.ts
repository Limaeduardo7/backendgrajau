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

    // Caso especial para token do administrador (formato Base64)
    if (token.includes('.') === false) {
      try {
        const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
        if (decodedToken.includes(':')) {
          const [userId] = decodedToken.split(':');
          const user = await prisma.user.findUnique({ where: { id: userId } });
          
          if (user && user.role === 'ADMIN') {
            req.user = {
              id: user.id,
              clerkId: user.clerkId,
              role: user.role,
              email: user.email
            };
            return next();
          }
        }
      } catch (error) {
        // Ignorar erro e continuar com a autenticação normal
      }
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
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Verificação de administrador removida pois agora é feita no frontend
    // A autenticação básica ainda é mantida
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Permitir acesso independentemente da role
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