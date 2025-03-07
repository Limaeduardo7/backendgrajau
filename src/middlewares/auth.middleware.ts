import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import prisma from '../config/prisma';
import { Status } from '@prisma/client';
import logger from '../config/logger';
import { clerkClient } from '@clerk/clerk-sdk-node';
import jwt from 'jsonwebtoken';

// Lista de tokens problemáticos conhecidos
const PROBLEM_TOKENS = [
  '2tzoIYjxqtSE6LbFHL9mecf9JKM',
  '2u0AiWfTasYZwnkd4Hunqt0dE9u'
];

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
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Verificar se é um token problemático conhecido
    if (PROBLEM_TOKENS.includes(token)) {
      // Tentar recuperar usando JWT
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
        
        if (decoded.userId) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
          });

          if (user) {
            req.user = {
              id: user.id,
              clerkId: user.clerkId,
              role: user.role,
              email: user.email
            };
            return next();
          }
        }
      } catch (jwtError) {
        logger.warn('Erro ao verificar token JWT:', jwtError);
      }
    }

    // Tentar verificar com Clerk
    try {
      const session = await clerkClient.sessions.verifySession(token, token);
      const clerkUser = await clerkClient.users.getUser(session.userId);
      
      // Buscar usuário no banco de dados
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id }
      });

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      req.user = {
        id: user.id,
        clerkId: user.clerkId,
        role: user.role,
        email: user.email
      };

      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error) {
    logger.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para verificar role do usuário
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      // Verificar se o usuário tem a role necessária
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Permissão insuficiente' });
      }

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

    // Verificar se é um token problemático conhecido
    if (PROBLEM_TOKENS.includes(token)) {
      // Tentar recuperar usando JWT
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
        
        if (decoded.userId) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
          });

          if (user) {
            req.user = {
              id: user.id,
              clerkId: user.clerkId,
              role: user.role,
              email: user.email
            };
            return next();
          }
        }
      } catch (jwtError) {
        logger.warn('Erro ao verificar token JWT:', jwtError);
      }
    }

    // Tentar verificar com Clerk
    try {
      const session = await clerkClient.sessions.verifySession(token, token);
      const clerkUser = await clerkClient.users.getUser(session.userId);
      
      // Buscar usuário no banco de dados
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id }
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