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
      logger.warn('Tentativa de acesso sem token de autenticação');
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Verificar se é um token simples para o usuário administrador
    try {
      const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
      if (decodedToken.includes(':')) {
        const [userId] = decodedToken.split(':');
        
        logger.info(`Tentando autenticar com token simples para usuário ID: ${userId}`);
        
        // Buscar usuário no banco de dados local
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user) {
          logger.info(`Usuário encontrado: ${user.id}, email: ${user.email}, role: ${user.role}`);
          
          if (user.email === 'anunciargrajau@gmail.com' && user.role === 'ADMIN') {
            logger.info(`Autenticação bem-sucedida para o administrador: ${user.id}`);
            req.user = {
              id: user.id,
              clerkId: user.clerkId,
              role: user.role,
              email: user.email
            };
            return next();
          } else {
            logger.warn(`Usuário encontrado mas não é admin: ${user.id}, role: ${user.role}`);
          }
        } else {
          logger.warn(`Usuário não encontrado para ID: ${userId}`);
        }
      }
    } catch (error) {
      logger.error(`Erro ao verificar token simples: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      // Ignorar erro e continuar com a verificação normal do Clerk
    }

    // Verificação normal com Clerk
    try {
      const session = await clerkClient.sessions.verifySession(token, token);
      
      if (!session) {
        logger.warn('Sessão inválida');
        return res.status(401).json({ error: 'Sessão inválida' });
      }

      const clerkUser = await clerkClient.users.getUser(session.userId);
      
      if (!clerkUser) {
        logger.warn(`Usuário Clerk não encontrado: ${session.userId}`);
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      // Obter email do usuário Clerk
      const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress || 'no-email@example.com';
      
      // Buscar usuário no banco de dados local
      let user = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
      });

      // Se o usuário não existir no banco, criar um novo
      if (!user) {
        logger.info(`Criando novo usuário para Clerk ID: ${clerkUser.id}`);
        try {
          user = await prisma.user.create({
            data: {
              clerkId: clerkUser.id,
              name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Usuário',
              email: clerkEmail,
              role: 'USER',
              status: 'PENDING',
            }
          });
          logger.info(`Novo usuário criado: ${user.id}`);
        } catch (createError) {
          logger.error(`Erro ao criar usuário: ${createError instanceof Error ? createError.message : 'Erro desconhecido'}`);
          // Criar um usuário temporário para não interromper o fluxo
          req.user = {
            id: 'temp-user-id',
            clerkId: clerkUser.id,
            role: 'USER',
            email: clerkEmail
          };
          return next();
        }
      }

      // Adicionar usuário ao objeto de requisição
      req.user = {
        id: user.id,
        clerkId: user.clerkId,
        role: user.role,
        email: user.email || clerkEmail // Garantir que o email sempre existe
      };

      next();
    } catch (error) {
      logger.error(`Erro ao verificar autenticação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      // Verificar se é um erro específico do Clerk
      if (error instanceof Error && error.message.includes('Invalid session')) {
        return res.status(401).json({ error: 'Sessão inválida' });
      }
      
      return res.status(401).json({ error: 'Não autorizado' });
    }
  } catch (error) {
    logger.error(`Erro no middleware de autenticação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return res.status(401).json({ error: 'Não autorizado' });
  }
};

// Middleware para verificar se o usuário tem um papel/função específico
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        logger.warn('requireRole: req.user não está definido');
        return res.status(401).json({ error: 'Não autorizado' });
      }

      if (!req.user.id) {
        logger.warn('requireRole: req.user.id não está definido');
        return res.status(401).json({ error: 'Não autorizado' });
      }

      // Buscar o usuário no banco de dados para garantir que temos as informações mais recentes
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        logger.warn(`requireRole: Usuário não encontrado no banco de dados, ID: ${req.user.id}`);
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      // Verificar se o usuário tem um dos papéis exigidos
      if (!roles.includes(user.role)) {
        logger.warn(`requireRole: Usuário não tem o papel necessário. ID: ${user.id}, papel: ${user.role}, papéis exigidos: ${roles.join(', ')}`);
        return res.status(403).json({ error: 'Acesso negado', message: 'Você não tem permissão para acessar este recurso' });
      }

      next();
    } catch (error) {
      logger.error(`Erro ao verificar papel do usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return res.status(500).json({ error: 'Erro ao verificar autorização' });
    }
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
        
        logger.info(`Tentando autenticar com token simples para usuário ID: ${userId}`);
        
        // Buscar usuário no banco de dados local
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user) {
          logger.info(`Usuário encontrado: ${user.id}, email: ${user.email}, role: ${user.role}`);
          
          if (user.email === 'anunciargrajau@gmail.com' && user.role === 'ADMIN') {
            logger.info(`Autenticação bem-sucedida para o administrador: ${user.id}`);
            req.user = {
              id: user.id,
              clerkId: user.clerkId,
              role: user.role,
              email: user.email
            };
            return next();
          } else {
            logger.warn(`Usuário encontrado mas não é admin: ${user.id}, role: ${user.role}`);
          }
        } else {
          logger.warn(`Usuário não encontrado para ID: ${userId}`);
        }
      }
    } catch (error) {
      logger.error(`Erro ao verificar token simples: ${error}`);
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