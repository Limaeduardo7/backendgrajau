import { Request, Response } from 'express';
import prisma from '../config/prisma';
import logger from '../config/logger';
import { ApiError } from '../utils/ApiError';
import EmailService from '../services/EmailService';
import AuditService from '../services/AuditService';
import { Prisma } from '@prisma/client';

class AdminController {
  // Dashboard e estatísticas
  getStats = async (req: Request, res: Response) => {
    try {
      const usersCount = await prisma.user.count();
      const businessesCount = await prisma.business.count();
      const professionalsCount = await prisma.professional.count();
      const jobsCount = await prisma.job.count();
      const applicationsCount = await prisma.application.count();
      const postsCount = await prisma.blogPost.count();
      const paymentsCount = await prisma.payment.count();
      
      // Estatísticas de pagamentos
      const totalRevenue = await prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true }
      });
      
      // Usuários recentes
      const recentUsers = await prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true
        }
      });
      
      // Pagamentos recentes
      const recentPayments = await prisma.payment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              plan: true
            }
          }
        }
      });
      
      // Submissões pendentes
      const pendingBusinesses = await prisma.business.count({
        where: { status: 'PENDING' }
      });
      
      const pendingProfessionals = await prisma.professional.count({
        where: { status: 'PENDING' }
      });
      
      const pendingJobs = await prisma.job.count({
        where: { status: 'PENDING' }
      });
      
      return res.status(200).json({
        counts: {
          users: usersCount,
          businesses: businessesCount,
          professionals: professionalsCount,
          jobs: jobsCount,
          applications: applicationsCount,
          posts: postsCount,
          payments: paymentsCount
        },
        revenue: totalRevenue._sum.amount || 0,
        recentUsers,
        recentPayments,
        pending: {
          businesses: pendingBusinesses,
          professionals: pendingProfessionals,
          jobs: pendingJobs,
          total: pendingBusinesses + pendingProfessionals + pendingJobs
        }
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Listar todos os usuários
  getUsers = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const skip = (page - 1) * limit;
      
      let whereClause: Prisma.UserWhereInput = {};
      
      if (search) {
        whereClause = {
          OR: [
            { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
            { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
          ]
        };
      }
      
      const users = await prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          businesses: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          professional: {
            select: {
              id: true,
              occupation: true,
              status: true
            }
          },
          _count: {
            select: {
              jobs: true,
              applications: true
            }
          }
        }
      });
      
      const total = await prisma.user.count({
        where: whereClause
      });
      
      return res.status(200).json({
        data: users,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Erro ao listar usuários:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Obter submissões pendentes
  getPendingSubmissions = async (req: Request, res: Response) => {
    try {
      const type = req.query.type as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      let businesses: any[] = [];
      let professionals: any[] = [];
      let jobs: any[] = [];
      let total = 0;
      
      if (!type || type === 'business') {
        businesses = await prisma.business.findMany({
          where: { status: 'PENDING' },
          skip: type ? skip : 0,
          take: type ? limit : 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
        
        if (type === 'business') {
          total = await prisma.business.count({
            where: { status: 'PENDING' }
          });
        }
      }
      
      if (!type || type === 'professional') {
        professionals = await prisma.professional.findMany({
          where: { status: 'PENDING' },
          skip: type ? skip : 0,
          take: type ? limit : 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
        
        if (type === 'professional') {
          total = await prisma.professional.count({
            where: { status: 'PENDING' }
          });
        }
      }
      
      if (!type || type === 'job') {
        jobs = await prisma.job.findMany({
          where: { status: 'PENDING' },
          skip: type ? skip : 0,
          take: type ? limit : 5,
          orderBy: { createdAt: 'desc' },
          include: {
            business: {
              select: {
                id: true,
                name: true
              }
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
        
        if (type === 'job') {
          total = await prisma.job.count({
            where: { status: 'PENDING' }
          });
        }
      }
      
      if (!type) {
        return res.status(200).json({
          businesses,
          professionals,
          jobs
        });
      }
      
      const data = type === 'business' 
        ? businesses 
        : type === 'professional' 
          ? professionals 
          : jobs;
      
      return res.status(200).json({
        data,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Erro ao obter submissões pendentes:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Aprovar um item
  approveItem = async (req: Request, res: Response) => {
    try {
      const { itemId, itemType } = req.body;
      
      if (!itemId || !itemType) {
        return res.status(400).json({ error: 'ID e tipo do item são obrigatórios' });
      }
      
      if (!['business', 'professional', 'job'].includes(itemType)) {
        return res.status(400).json({ error: 'Tipo de item inválido' });
      }
      
      let result;
      
      if (itemType === 'business') {
        result = await prisma.business.update({
          where: { id: itemId },
          data: { status: 'APPROVED' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
        
        // Criar notificação (comentado até o modelo estar disponível)
        /*
        try {
          await prisma.notification.create({
            data: {
              userId: result.userId,
              type: 'BUSINESS_APPROVED',
              title: 'Empresa aprovada',
              message: `Sua empresa "${result.name}" foi aprovada e já está disponível na plataforma.`,
              entityId: result.id
            }
          });
        } catch (notifError) {
          logger.error('Erro ao criar notificação:', notifError);
        }
        */
      } else if (itemType === 'professional') {
        result = await prisma.professional.update({
          where: { id: itemId },
          data: { status: 'APPROVED' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
        
        // Criar notificação (comentado até o modelo estar disponível)
        /*
        try {
          await prisma.notification.create({
            data: {
              userId: result.userId,
              type: 'PROFESSIONAL_APPROVED',
              title: 'Perfil profissional aprovado',
              message: 'Seu perfil profissional foi aprovado e já está disponível na plataforma.',
              entityId: result.id
            }
          });
        } catch (notifError) {
          logger.error('Erro ao criar notificação:', notifError);
        }
        */
      } else {
        result = await prisma.job.update({
          where: { id: itemId },
          data: { status: 'APPROVED' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            business: true
          }
        });
        
        // Criar notificação (comentado até o modelo estar disponível)
        /*
        try {
          await prisma.notification.create({
            data: {
              userId: result.userId,
              type: 'JOB_APPROVED',
              title: 'Vaga aprovada',
              message: `Sua vaga "${result.title}" foi aprovada e já está disponível na plataforma.`,
              entityId: result.id
            }
          });
        } catch (notifError) {
          logger.error('Erro ao criar notificação:', notifError);
        }
        */
      }
      
      return res.status(200).json({
        message: 'Item aprovado com sucesso',
        item: result
      });
    } catch (error) {
      logger.error('Erro ao aprovar item:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Rejeitar um item
  rejectItem = async (req: Request, res: Response) => {
    try {
      const { itemId, itemType, reason } = req.body;
      
      if (!itemId || !itemType || !reason) {
        return res.status(400).json({ error: 'ID, tipo do item e motivo são obrigatórios' });
      }
      
      if (!['business', 'professional', 'job'].includes(itemType)) {
        return res.status(400).json({ error: 'Tipo de item inválido' });
      }
      
      let result;
      
      if (itemType === 'business') {
        result = await prisma.business.update({
          where: { id: itemId },
          data: { status: 'REJECTED' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
        
        // Criar notificação (comentado até o modelo estar disponível)
        /*
        try {
          await prisma.notification.create({
            data: {
              userId: result.userId,
              type: 'BUSINESS_REJECTED',
              title: 'Empresa rejeitada',
              message: `Sua empresa "${result.name}" foi rejeitada. Motivo: ${reason}`,
              entityId: result.id
            }
          });
        } catch (notifError) {
          logger.error('Erro ao criar notificação:', notifError);
        }
        */
      } else if (itemType === 'professional') {
        result = await prisma.professional.update({
          where: { id: itemId },
          data: { status: 'REJECTED' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
        
        // Criar notificação (comentado até o modelo estar disponível)
        /*
        try {
          await prisma.notification.create({
            data: {
              userId: result.userId,
              type: 'PROFESSIONAL_REJECTED',
              title: 'Perfil profissional rejeitado',
              message: `Seu perfil profissional foi rejeitado. Motivo: ${reason}`,
              entityId: result.id
            }
          });
        } catch (notifError) {
          logger.error('Erro ao criar notificação:', notifError);
        }
        */
      } else {
        result = await prisma.job.update({
          where: { id: itemId },
          data: { status: 'REJECTED' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            business: true
          }
        });
        
        // Criar notificação (comentado até o modelo estar disponível)
        /*
        try {
          await prisma.notification.create({
            data: {
              userId: result.userId,
              type: 'JOB_REJECTED',
              title: 'Vaga rejeitada',
              message: `Sua vaga "${result.title}" foi rejeitada. Motivo: ${reason}`,
              entityId: result.id
            }
          });
        } catch (notifError) {
          logger.error('Erro ao criar notificação:', notifError);
        }
        */
      }
      
      return res.status(200).json({
        message: 'Item rejeitado com sucesso',
        item: result
      });
    } catch (error) {
      logger.error('Erro ao rejeitar item:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Obter relatório de pagamentos
  getPaymentsReport = async (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string) 
        : new Date(new Date().setMonth(new Date().getMonth() - 1));
      
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string) 
        : new Date();
      
      // Ajustar endDate para o final do dia
      endDate.setHours(23, 59, 59, 999);
      
      const payments = await prisma.payment.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          subscription: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              plan: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Calcular totais
      const totalAmount = payments.reduce((sum, payment) => {
        return payment.status === 'PAID' ? sum + Number(payment.amount) : sum;
      }, 0);
      
      const totalPaid = payments.filter(p => p.status === 'PAID').length;
      const totalPending = payments.filter(p => p.status === 'PENDING').length;
      const totalFailed = payments.filter(p => p.status === 'FAILED').length;
      
      // Agrupar por plano
      const planStats: Record<string, { count: number; amount: number }> = {};
      payments.forEach(payment => {
        if (payment.subscription?.plan) {
          const planName = payment.subscription.plan.name;
          if (!planStats[planName]) {
            planStats[planName] = {
              count: 0,
              amount: 0
            };
          }
          
          if (payment.status === 'PAID') {
            planStats[planName].count++;
            planStats[planName].amount += Number(payment.amount);
          }
        }
      });
      
      return res.status(200).json({
        payments,
        stats: {
          totalAmount,
          totalPaid,
          totalPending,
          totalFailed,
          total: payments.length
        },
        planStats,
        dateRange: {
          startDate,
          endDate
        }
      });
    } catch (error) {
      logger.error('Erro ao obter relatório de pagamentos:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };

  // Atualizar configurações
  updateSettings = async (req: Request, res: Response) => {
    try {
      const { maintenanceMode, allowRegistrations, featuredLimit, emailNotifications, autoApproveUsers } = req.body;
      
      // Aqui você pode implementar a lógica para salvar as configurações
      // Por exemplo, em um modelo Settings no banco de dados
      
      return res.json({
        success: true,
        message: 'Configurações atualizadas com sucesso',
        settings: {
          maintenanceMode,
          allowRegistrations,
          featuredLimit,
          emailNotifications,
          autoApproveUsers
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      return res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
  };

  // Métodos de auditoria
  getAuditLogs = async (req: Request, res: Response) => {
    try {
      const {
        userId,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        page = '1',
        limit = '20',
      } = req.query;

      // Converter datas
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate && typeof startDate === 'string') {
        parsedStartDate = new Date(startDate);
      }

      if (endDate && typeof endDate === 'string') {
        parsedEndDate = new Date(endDate);
        // Definir para o final do dia
        parsedEndDate.setHours(23, 59, 59, 999);
      }

      const result = await AuditService.getAuditLogs({
        userId: userId as string,
        action: action as string,
        entityType: entityType as string,
        entityId: entityId as string,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });

      return res.json(result);
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
    }
  };

  getEntityAuditTrail = async (req: Request, res: Response) => {
    try {
      const { type, id } = req.params;

      if (!type || !id) {
        throw new ApiError(400, 'Tipo e ID são obrigatórios');
      }

      const logs = await AuditService.getEntityAuditTrail(type, id);

      return res.json(logs);
    } catch (error) {
      console.error('Erro ao buscar histórico de auditoria da entidade:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao buscar histórico de auditoria da entidade' });
    }
  };

  getUserAuditTrail = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { page = '1', limit = '20' } = req.query;

      if (!id) {
        throw new ApiError(400, 'ID do usuário é obrigatório');
      }

      const result = await AuditService.getUserAuditTrail(
        id,
        parseInt(page as string, 10),
        parseInt(limit as string, 10)
      );

      return res.json(result);
    } catch (error) {
      console.error('Erro ao buscar histórico de auditoria do usuário:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao buscar histórico de auditoria do usuário' });
    }
  };
}

export default new AdminController(); 