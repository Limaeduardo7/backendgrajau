import { Request, Response } from 'express';
import prisma from '../config/prisma';
import logger from '../config/logger';
import { ApiError } from '../utils/ApiError';

class UserController {
  // Obter perfil do usuário
  getProfile = async (req: Request, res: Response) => {
    try {
      // Se tiver usuário autenticado, usar o ID dele
      const userId = req.user?.id;
      
      // Registrar acesso para depuração
      logger.debug(`Acesso a profile - userId: ${userId || 'não autenticado'}`);

      // Se não tiver usuário, retornar objeto vazio mas com status 200
      if (!userId) {
        logger.info(`Acesso não autenticado a /users/profile de ${req.ip || 'IP desconhecido'}`);
        return res.status(200).json({
          data: {},
          message: 'Usuário não autenticado'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          document: true,
          documentType: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        logger.warn(`Usuário ${userId} não encontrado no banco de dados`);
        return res.status(200).json({
          data: {},
          message: 'Usuário não encontrado'
        });
      }

      logger.debug(`Retornando perfil para usuário ${userId}`);

      return res.status(200).json({
        data: user,
      });
    } catch (error) {
      logger.error('Erro ao obter perfil do usuário:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Obter empresas do usuário
  getBusinesses = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      // Se tiver usuário autenticado, usar o ID dele
      const userId = req.user?.id;
      
      // Registrar acesso para depuração
      logger.debug(`Acesso a businesses - page: ${page}, limit: ${limit}, userId: ${userId || 'não autenticado'}`);

      // Se não tiver usuário, retornar lista vazia mas com status 200
      if (!userId) {
        logger.info(`Acesso não autenticado a /users/businesses de ${req.ip || 'IP desconhecido'}`);
        return res.status(200).json({
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0,
          },
        });
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

      logger.debug(`Retornando ${businesses.length} businesses para usuário ${userId}`);

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
      return res.status(500).json({ 
        error: 'Erro ao obter empresas', 
        code: 'SERVER_ERROR',
        message: 'Ocorreu um erro ao processar sua solicitação'
      });
    }
  };

  // Obter candidaturas do usuário
  getApplications = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      // Se tiver usuário autenticado, usar o ID dele
      const userId = req.user?.id;
      
      // Registrar acesso para depuração
      logger.debug(`Acesso a applications - page: ${page}, limit: ${limit}, userId: ${userId || 'não autenticado'}`);

      // Se não tiver usuário, retornar lista vazia mas com status 200
      if (!userId) {
        logger.info(`Acesso não autenticado a /users/applications de ${req.ip || 'IP desconhecido'}`);
        return res.status(200).json({
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0,
          },
        });
      }

      const applications = await prisma.application.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          job: {
            include: {
              business: true,
            },
          },
        },
      });

      const total = await prisma.application.count({
        where: { userId },
      });

      logger.debug(`Retornando ${applications.length} applications para usuário ${userId}`);

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
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      // Se tiver usuário autenticado, usar o ID dele
      const userId = req.user?.id;
      
      // Registrar acesso para depuração
      logger.debug(`Acesso a notifications - page: ${page}, limit: ${limit}, userId: ${userId || 'não autenticado'}`);

      // Se não tiver usuário, retornar lista vazia mas com status 200
      if (!userId) {
        logger.info(`Acesso não autenticado a /users/notifications de ${req.ip || 'IP desconhecido'}`);
        return res.status(200).json({
          data: [],
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0,
          },
        });
      }

      // Como o modelo Notification ainda não está disponível no Prisma,
      // retornamos um array vazio por enquanto
      const notifications: any[] = [];
      const total = 0;

      logger.debug(`Retornando ${notifications.length} notifications para usuário ${userId}`);

      return res.status(200).json({
        data: notifications,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
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
      // Se tiver usuário autenticado, usar o ID dele
      const userId = req.user?.id;
      
      // Registrar acesso para depuração
      logger.debug(`Tentativa de atualização de profile - userId: ${userId || 'não autenticado'}`);

      // Se não tiver usuário, retornar erro mas com status 200
      if (!userId) {
        logger.info(`Tentativa de atualização não autenticada de /users/profile de ${req.ip || 'IP desconhecido'}`);
        return res.status(200).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const { name, email, phone, document, documentType } = req.body;

      // Validar dados
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          message: 'Nome e email são obrigatórios'
        });
      }

      // Verificar se o usuário existe
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!existingUser) {
        logger.warn(`Tentativa de atualização para usuário inexistente ${userId}`);
        return res.status(200).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }

      // Atualizar usuário
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          email,
          phone,
          document,
          documentType
        }
      });

      logger.info(`Perfil atualizado com sucesso para usuário ${userId}`);

      return res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Perfil atualizado com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao atualizar perfil do usuário:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Erro interno do servidor' 
      });
    }
  };
}

export default new UserController(); 