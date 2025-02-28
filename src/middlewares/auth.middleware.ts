import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ApiError } from '../utils/ApiError';
import prisma from '../config/prisma';

// Definindo uma interface para estender o Request
interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new ApiError(401, 'Token não fornecido');
    }

    const session = await clerkClient.sessions.verifySession(token, token);

    if (!session) {
      throw new ApiError(401, 'Sessão inválida');
    }

    const clerkUser = await clerkClient.users.getUser(session.userId);

    if (!clerkUser) {
      throw new ApiError(401, 'Usuário não encontrado');
    }

    // Buscar ou criar usuário no nosso banco
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      // Criar usuário no nosso banco
      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          name: `${clerkUser.firstName} ${clerkUser.lastName}`,
          email: clerkUser.emailAddresses[0].emailAddress,
          role: 'USER',
          status: 'PENDING',
        },
      });
    }

    req.user = {
      id: user.id,
      clerkId: user.clerkId,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Erro de autenticação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

export const validateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
    });

    if (!user) {
      throw new ApiError(401, 'Usuário não encontrado');
    }

    if (user.status === 'REJECTED') {
      throw new ApiError(403, 'Sua conta foi rejeitada');
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      console.error('Erro na validação do usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};

export const requireRole = (roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user?.id },
      });

      if (!user) {
        throw new ApiError(401, 'Usuário não encontrado');
      }

      if (!roles.includes(user.role)) {
        throw new ApiError(403, 'Você não tem permissão para acessar este recurso');
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Erro na validação de papel:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };
}; 