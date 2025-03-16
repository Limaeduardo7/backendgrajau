import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import prisma from '../config/prisma';
import { Status, Role } from '@prisma/client';
import logger from '../config/logger';
import { clerkClient } from '@clerk/clerk-sdk-node';
import jwt from 'jsonwebtoken';
import { Clerk } from '@clerk/backend';
import { ApiError } from '../utils/ApiError';

const clerk = Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

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
        role: Role;
        email?: string;
      };
    }
  }
}

export interface AuthRequest extends Request {
  user?: any;
}

// Middleware para verificar autenticação usando Clerk
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('[AUTH] Modo temporário de teste - autenticação desativada');
    
    // Adicionar informações de usuário temporário para testes
    req.user = {
      id: "user_test_temporary",
      clerkId: "user_test_temporary",
      role: Role.ADMIN,
      email: "test@example.com"
    };
    
    logger.info('[AUTH] Usuário de teste configurado');
    return next();
    
    // Código original comentado
    /*
    // Verificar se há um token de autorização
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logger.warn('Nenhum token de autorização fornecido');
      return res.status(401).json({ error: 'Não autorizado - Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      logger.warn('Token vazio ou inválido');
      return res.status(401).json({ error: 'Não autorizado - Token inválido' });
    }

    // Verificar se é um token problemático conhecido
    if (PROBLEM_TOKENS.includes(token)) {
      logger.warn(`Token problemático detectado: ${token}`);
      return res.status(401).json({ error: 'Não autorizado - Token inválido' });
    }

    // Verificar o token com o Clerk
    const session = await clerk.sessions.getSession(token);
    if (!session) {
      logger.warn('Sessão não encontrada para o token fornecido');
      return res.status(401).json({ error: 'Não autorizado - Sessão inválida' });
    }

    const userId = session.userId;
    logger.debug(`ID do usuário obtido do Clerk: ${userId}`);

    // Buscar usuário no banco de dados
    let user = await prisma.user.findFirst({
      where: { clerkId: userId }
    });

    // Se o usuário não existir, criar um novo com papel de ADMIN
    if (!user) {
      logger.info(`Usuário não encontrado no banco de dados. Criando novo usuário com ID do Clerk: ${userId}`);
      
      const clerkUser = await clerkClient.users.getUser(userId);
      
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          name: `${clerkUser.firstName} ${clerkUser.lastName}`,
          email: clerkUser.emailAddresses[0].emailAddress,
          role: Role.ADMIN,
          status: Status.PENDING
        }
      });
      
      logger.info(`Novo usuário criado: ${user.id}`);
    }

    // Adicionar usuário ao objeto de requisição
    req.user = {
      id: user.id,
      clerkId: user.clerkId,
      role: user.role,
      email: user.email
    };
    */

    next();
  } catch (error) {
    logger.error('Erro ao verificar autenticação:', error);
    return res.status(401).json({ error: 'Não autorizado - Erro na verificação' });
  }
};

// Middleware para verificar role do usuário
export const requireRole = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info('[AUTH] Modo temporário de teste - verificação de papel desativada');
      
      // Se o usuário não foi definido pelo middleware anterior, defina-o agora
      if (!req.user) {
        req.user = {
          id: "user_test_temporary",
          clerkId: "user_test_temporary",
          role: Role.ADMIN,
          email: "test@example.com"
        };
      }
      
      logger.info('[AUTH] Usuário de teste configurado para verificação de papel');
      return next();
      
      // Código original comentado
      /*
      if (!req.user) {
        logger.warn('Usuário não encontrado na requisição');
        return res.status(401).json({ error: 'Não autorizado - Usuário não encontrado' });
      }

      const userRole = req.user.role;
      
      if (!roles.includes(userRole)) {
        logger.warn(`Acesso negado - Usuário com papel ${userRole} tentou acessar rota que requer um dos papéis: ${roles.join(', ')}`);
        return res.status(403).json({ error: 'Acesso negado - Papel insuficiente' });
      }
      */

      next();
    } catch (error) {
      logger.error('Erro ao verificar papel do usuário:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
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