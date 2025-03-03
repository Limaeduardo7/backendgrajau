import { Request, Response } from 'express';
import prisma from '../config/prisma';
import logger from '../config/logger';

class UserController {
  // Obter perfil do usuário
  getProfile = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          document: true,
          documentType: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      return res.status(200).json(user);
    } catch (error) {
      logger.error('Erro ao obter perfil do usuário:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Obter empresas do usuário
  getBusinesses = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const businesses = await prisma.business.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.business.count({
        where: { userId },
      });

      return res.status(200).json({
        data: businesses,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Erro ao obter empresas do usuário:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Obter candidaturas do usuário
  getApplications = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const applications = await prisma.application.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              business: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      const total = await prisma.application.count({
        where: { userId },
      });

      return res.status(200).json({
        data: applications,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Erro ao obter candidaturas do usuário:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Obter notificações do usuário
  getNotifications = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      // Como o modelo Notification ainda não está disponível no Prisma,
      // retornamos um array vazio por enquanto
      return res.status(200).json({
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
      });
    } catch (error) {
      logger.error('Erro ao obter notificações do usuário:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Atualizar perfil do usuário
  updateProfile = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { name, phone, document, documentType } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          phone,
          document,
          documentType,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          document: true,
          documentType: true,
          role: true,
          status: true,
        },
      });

      return res.status(200).json({
        message: 'Perfil atualizado com sucesso',
        user: updatedUser,
      });
    } catch (error) {
      logger.error('Erro ao atualizar perfil do usuário:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
}

export default new UserController(); 