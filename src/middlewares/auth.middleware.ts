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
        email: string;
      };
    }
  }
}

// Middleware para verificar se o usuário está autenticado
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Verificar se é um token simples para o usuário administrador
    try {
      const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
      if (decodedToken.includes(':')) {
        const [userId] = decodedToken.split(':');
        
        // Buscar usuário no banco de dados local
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user && user.email === 'anunciargrajau@gmail.com') {
          logger.info(`Autenticação especial para o usuário administrador: ${user.id}`);
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
      // Ignorar erro e continuar com a verificação normal do Clerk
    }

    // Verificação normal com Clerk
    try {
      const session = await clerkClient.sessions.verifySession(token, token);
      
      if (!session) {
        return res.status(401).json({ error: 'Sessão inválida' });
      }

      const clerkUser = await clerkClient.users.getUser(session.userId);
      
      if (!clerkUser) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      // Buscar usuário no banco de dados local
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
      });

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado no banco de dados' });
      }

      // Adicionar usuário ao objeto de requisição
      req.user = {
        id: user.id,
        clerkId: user.clerkId,
        role: user.role,
        email: user.email
      };

      next();
    } catch (error) {
      logger.error('Erro ao verificar autenticação:', error);
      return res.status(401).json({ error: 'Não autorizado' });
    }
  } catch (error) {
    logger.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Middleware para verificar se o usuário tem o papel necessário
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
  };
};

// Middleware para validar o usuário (usado em rotas públicas)
export const validateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      req.user = undefined;
      return next();
    }

    // Verificar se é um token simples para o usuário administrador
    try {
      const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
      if (decodedToken.includes(':')) {
        const [userId] = decodedToken.split(':');
        
        // Buscar usuário no banco de dados local
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user && user.email === 'anunciargrajau@gmail.com') {
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
      // Ignorar erro e continuar com a verificação normal do Clerk
    }

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

      // Buscar usuário no banco de dados local
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
      });

      if (!user) {
        req.user = undefined;
        return next();
      }

      // Adicionar usuário ao objeto de requisição
      req.user = {
        id: user.id,
        clerkId: user.clerkId,
        role: user.role,
        email: user.email
      };

      next();
    } catch (error) {
      req.user = undefined;
      next();
    }
  } catch (error) {
    req.user = undefined;
    next();
  }
}; 