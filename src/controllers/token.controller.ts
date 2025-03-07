import { Request, Response } from 'express';
import prisma from '../config/prisma';
import logger from '../config/logger';
import { clerkClient } from '@clerk/clerk-sdk-node';

export class TokenController {
  validateToken = async (req: Request, res: Response) => {
    try {
      // O middleware requireAuth já verificou o token
      // Se chegou aqui, o token é válido
      
      return res.status(200).json({ 
        valid: true,
        user: {
          id: req.user?.id,
          role: req.user?.role,
          email: req.user?.email
        }
      });
    } catch (error) {
      logger.error('Erro ao validar token:', error);
      return res.status(500).json({ message: 'Erro ao validar token' });
    }
  };
}

export default new TokenController(); 