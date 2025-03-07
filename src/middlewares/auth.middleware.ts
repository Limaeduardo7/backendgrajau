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
    // Verificar se o token está no header de autorização
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn(`Acesso não autorizado: Token não fornecido para ${req.originalUrl}`);
      return res.status(401).json({ 
        error: 'Token não fornecido',
        code: 'AUTH_TOKEN_MISSING',
        redirectTo: '/login'
      });
    }

    // Extrair o token do header
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      logger.warn(`Acesso não autorizado: Token inválido para ${req.originalUrl}`);
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'AUTH_TOKEN_INVALID',
        redirectTo: '/login'
      });
    }

    // Verificar se é um token problemático conhecido
    if (PROBLEM_TOKENS.includes(token)) {
      logger.info(`Token problemático detectado para ${req.originalUrl}`);
      
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
            
            logger.info(`Autenticação recuperada para usuário ${user.id} usando JWT`);
            return next();
          }
        }
      } catch (jwtError) {
        logger.warn('Erro ao verificar token JWT:', jwtError);
      }
      
      // Se chegou aqui, não foi possível recuperar com JWT
      return res.status(401).json({ 
        error: 'Token problemático detectado',
        code: 'AUTH_PROBLEM_TOKEN',
        redirectTo: '/api/auth-recovery'
      });
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
        logger.warn(`Usuário não encontrado para Clerk ID: ${clerkUser.id}`);
        return res.status(401).json({ 
          error: 'Usuário não encontrado',
          code: 'AUTH_USER_NOT_FOUND',
          redirectTo: '/login'
        });
      }

      req.user = {
        id: user.id,
        clerkId: user.clerkId,
        role: user.role,
        email: user.email
      };

      logger.debug(`Usuário ${user.id} autenticado com sucesso para ${req.originalUrl}`);
      next();
    } catch (error) {
      logger.error(`Erro ao verificar token: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      // Verificar se é um erro de token expirado
      if (error instanceof Error && error.message.includes('expired')) {
        return res.status(401).json({ 
          error: 'Token expirado',
          code: 'AUTH_TOKEN_EXPIRED',
          redirectTo: '/login'
        });
      }
      
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'AUTH_TOKEN_INVALID',
        redirectTo: '/login'
      });
    }
  } catch (error) {
    logger.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      code: 'SERVER_ERROR'
    });
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
    // Verificar se o token está no header de autorização
    const authHeader = req.headers.authorization;
    
    // Se não houver token, prosseguir sem usuário
    if (!authHeader) {
      req.user = undefined;
      return next();
    }

    // Extrair o token do header
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;
    
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
            
            logger.info(`Autenticação recuperada para usuário ${user.id} usando JWT em rota pública`);
            return next();
          }
        }
      } catch (jwtError) {
        logger.warn('Erro ao verificar token JWT em rota pública:', jwtError);
        req.user = undefined;
        return next();
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
        
        logger.debug(`Usuário ${user.id} validado com sucesso em rota pública`);
      } else {
        req.user = undefined;
        logger.debug(`Usuário Clerk ${clerkUser.id} não encontrado no banco de dados`);
      }
      
      next();
    } catch (error) {
      // Em caso de erro, prosseguir sem usuário
      logger.debug(`Erro ao validar token em rota pública: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      req.user = undefined;
      next();
    }
  } catch (error) {
    // Em caso de erro, prosseguir sem usuário
    logger.error('Erro no middleware de validação de usuário:', error);
    req.user = undefined;
    next();
  }
};

// Middleware para recuperação de sessão em caso de falhas repetidas de autenticação
export const sessionRecoveryMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Lista de tokens problemáticos conhecidos
  const PROBLEM_TOKENS = [
    '2tzoIYjxqtSE6LbFHL9mecf9JKM',
    '2u0AiWfTasYZwnkd4Hunqt0dE9u'
  ];

  // Obter informações do cliente
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Verificar cabeçalho de autorização
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  // Extrair o token do header
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;
  
  if (!token) {
    return next();
  }
  
  // Verificar se é um token problemático conhecido
  if (PROBLEM_TOKENS.includes(token)) {
    logger.info(`Detectado token problemático na rota ${req.originalUrl} de ${ipAddress}`);
    
    // Adicionar informações para depuração
    res.setHeader('X-Auth-Recovery', 'problem-token-detected');
    
    // Adicionar informações ao request para uso posterior
    (req as any).problemToken = true;
    (req as any).recoveryNeeded = true;
  }
  
  // Em qualquer caso, continuar para o próximo middleware
  next();
}; 