import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ApiError } from '../utils/ApiError';
import prisma from '../config/prisma';
import logger from '../config/logger';
import { verifyClerkToken } from '../config/clerk';
import { verifyClerkJWT } from '../services/clerk.service';
import tokenService from '../services/token.service';

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

// Middleware para verificar se o usuário está autenticado
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verificar se o token existe
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      logger.warn('Tentativa de acesso sem token de autenticação');
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    // Verificar se o token está revogado
    if (tokenService.isTokenRevoked(token)) {
      logger.warn('Tentativa de acesso com token revogado');
      return res.status(401).json({ message: 'Token revogado' });
    }

    try {
      // MÉTODO 1: Tentar verificar como JWT do Clerk (novo método)
      if (token.includes('.') && !token.startsWith('clerk_token_') && !token.startsWith('clerk_recovery_')) {
        try {
          const userData = await verifyClerkJWT(token);
          req.user = {
            id: userData.userId,
            clerkId: userData.clerkId,
            role: userData.role,
            email: userData.email
          };
          return next();
        } catch (jwtError) {
          logger.debug(`Verificação JWT falhou, tentando método legado: ${jwtError instanceof Error ? jwtError.message : 'Erro desconhecido'}`);
          // Continuar para o método legado
        }
      }
      
      // MÉTODO 2: Tentar verificar como token personalizado/legacy (método anterior)
      const userData = await verifyClerkToken(token);
      
      // Buscar usuário no banco de dados
      const user = await prisma.user.findUnique({
        where: { clerkId: userData.clerkId },
      });

      if (!user) {
        logger.warn(`Usuário com clerkId ${userData.clerkId} não encontrado no banco de dados`);
        return res.status(401).json({ message: 'Usuário não encontrado no banco de dados' });
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
      // Verificar se é erro de token expirado
      if (error instanceof Error) {
        if (error.message === 'Token expirado') {
          logger.warn('Tentativa de acesso com token expirado');
          return res.status(401).json({ message: 'Token expirado' });
        } else if (error.message === 'Usuário não encontrado') {
          logger.warn(`Usuário não encontrado para token: ${token.substring(0, 10)}...`);
          return res.status(401).json({ message: 'Usuário não encontrado' });
        } else if (error.message === 'Usuário inativo') {
          logger.warn('Tentativa de acesso com usuário inativo');
          return res.status(401).json({ message: 'Usuário inativo' });
        }
        
        logger.error(`Erro na autenticação: ${error.message}`);
      } else {
        logger.error(`Erro na autenticação: Erro desconhecido`);
      }
      
      return res.status(401).json({ message: 'Falha na autenticação' });
    }
  } catch (error) {
    logger.error(`Erro geral no middleware: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Middleware para verificar papel/função do usuário
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