import { Request, Response } from 'express';
import prisma from '../config/prisma';
import logger from '../config/logger';
import tokenService from '../services/token.service';

export class TokenController {
  renewToken = async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário está autenticado (middleware requireAuth já fez isso)
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Não autorizado' });
      }
      
      // Buscar usuário no banco de dados
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      });
      
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      // Extrair o token atual do cabeçalho
      const currentToken = req.headers.authorization?.split(' ')[1];
      
      // Se houver um token atual, revogá-lo
      if (currentToken) {
        await tokenService.revokeToken(currentToken);
        logger.info(`Token anterior revogado para usuário ${user.id}`);
      }
      
      // Gerar um novo token
      const token = tokenService.generateToken(user.id, user.email, user.role);
      
      // Registrar a renovação do token
      logger.info(`Token renovado para usuário ${user.id}`);
      
      // Retornar o novo token
      return res.status(200).json({ token });
    } catch (error) {
      logger.error('Erro ao renovar token:', error);
      return res.status(500).json({ message: 'Erro ao renovar token' });
    }
  };
  
  revokeToken = async (req: Request, res: Response) => {
    try {
      // Verificar se o usuário está autenticado
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'Não autorizado' });
      }
      
      // Extrair o token do cabeçalho
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(400).json({ message: 'Token não fornecido' });
      }
      
      // Revogar o token
      await tokenService.revokeToken(token);
      
      logger.info(`Token revogado para usuário ${req.user.id}`);
      
      return res.status(200).json({ message: 'Token revogado com sucesso' });
    } catch (error) {
      logger.error('Erro ao revogar token:', error);
      return res.status(500).json({ message: 'Erro ao revogar token' });
    }
  };
  
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