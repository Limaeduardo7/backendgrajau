import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import prisma from '../config/prisma';
import { Status } from '@prisma/client';

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

// Middleware para verificar autenticação usando Clerk
export const requireAuth = ClerkExpressRequireAuth({
  // Opções do Clerk, se necessário
});

// Middleware para verificar role do usuário
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verificar se o usuário está autenticado
      if (!req.auth?.userId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      // Buscar usuário no banco de dados
      const user = await prisma.user.findUnique({
        where: { clerkId: req.auth.userId }
      });

      // Verificar se o usuário existe e está ativo
      if (!user || user.status !== Status.APPROVED) {
        return res.status(403).json({ error: 'Usuário inativo ou não encontrado' });
      }

      // Verificar se o usuário tem a role necessária
      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: 'Permissão insuficiente' });
      }

      // Adicionar informações do usuário ao request
      req.user = user;

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware para validar usuário em rotas públicas
export const validateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    // Se não houver token, prosseguir sem usuário
    if (!token) {
      req.user = undefined;
      return next();
    }

    // Verificar se o token está revogado
    if (tokenService.isTokenRevoked(token)) {
      req.user = undefined;
      return next();
    }

    // Tentar autenticar com o token disponível
    try {
      // Verificar o token (função atualizada que suporta ambos os formatos)
      const userData = await verifyClerkToken(token);
      
      // Buscar usuário no banco de dados
      const user = await prisma.user.findUnique({
        where: { clerkId: userData.clerkId },
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

// Middleware para recuperação de sessão em caso de falhas repetidas de autenticação
export const sessionRecoveryMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Armazenar tentativas de autenticação para cada IP
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Verificar cabeçalho de autorização
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return next();
  }
  
  // Verificar se é o token problemático conhecido
  if (token === '2tzoIYjxqtSE6LbFHL9mecf9JKM') {
    logger.info(`Detectado token problemático na rota ${req.originalUrl} de ${ipAddress}`);
    
    // Adicionar informações para depuração
    res.setHeader('X-Auth-Recovery', 'problem-token-detected');
  }
  
  // Em qualquer caso, continuar para o próximo middleware
  next();
}; 