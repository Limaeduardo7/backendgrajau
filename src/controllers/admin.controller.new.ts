import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import EmailService from '../services/EmailService';
import AuditService from '../services/AuditService';

class AdminController {
  // Dashboard e estatísticas
  async getStats(req: Request, res: Response) {
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
                  name: true,
                  email: true
                }
              },
              plan: true
            }
          }
        }
      });

      return res.json({
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
        recentPayments
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
  }

  // Listar todos os usuários com filtros
  async getUsers(req: Request, res: Response) {
    try {
      const { role, status, search, page = 1, limit = 10 } = req.query;
      
      const skip = (Number(page) - 1) * Number(limit);
      
      const where: any = {};
      
      if (role) {
        where.role = role;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } }
        ];
      }
      
      const users = await prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          businesses: {
            select: {
              id: true,
              name: true
            }
          },
          professional: {
            select: {
              id: true,
              occupation: true
            }
          }
        }
      });
      
      const total = await prisma.user.count({ where });
      
      return res.json({
        users,
        pagination: {
          total,
          pages: Math.ceil(total / Number(limit)),
          page: Number(page),
          limit: Number(limit)
        }
      });
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      return res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  }

  // Aprovar um item (empresa, profissional, vaga)
  async approveItem(req: Request, res: Response) {
    try {
      const { itemId, itemType } = req.body;
      
      if (!itemId || !itemType) {
        throw new ApiError(400, 'ID e tipo do item são obrigatórios');
      }
      
      let result;
      let email;
      let name;
      let subject;
      let message;
      
      switch (itemType) {
        case 'business':
          result = await prisma.business.update({
            where: { id: itemId },
            data: { status: 'APPROVED' },
            include: { user: true }
          });
          
          email = result.user.email;
          name = result.user.name;
          subject = 'Sua empresa foi aprovada!';
          message = `Olá ${name}, sua empresa "${result.name}" foi aprovada com sucesso no Anunciar Grajaú! Agora ela está visível para todos os usuários da plataforma.`;
          break;
          
        case 'professional':
          result = await prisma.professional.update({
            where: { id: itemId },
            data: { status: 'APPROVED' },
            include: { user: true }
          });
          
          email = result.user.email;
          name = result.user.name;
          subject = 'Seu perfil profissional foi aprovado!';
          message = `Olá ${name}, seu perfil profissional foi aprovado com sucesso no Anunciar Grajaú! Agora você está visível para todos os usuários da plataforma.`;
          break;
          
        case 'job':
          result = await prisma.job.update({
            where: { id: itemId },
            data: { status: 'APPROVED' },
            include: { business: { include: { user: true } } }
          });
          
          email = result.business.user.email;
          name = result.business.user.name;
          subject = 'Sua vaga foi aprovada!';
          message = `Olá ${name}, sua vaga "${result.title}" foi aprovada com sucesso no Anunciar Grajaú! Agora ela está visível para todos os usuários da plataforma.`;
          break;
          
        default:
          throw new ApiError(400, 'Tipo de item inválido');
      }
      
      // Enviar email de notificação
      await EmailService.sendEmail({
        to: email,
        subject,
        html: `<p>${message}</p>`,
      });
      
      return res.json({ 
        success: true, 
        message: `${itemType} aprovado com sucesso`,
        data: result
      });
    } catch (error) {
      console.error('Erro ao aprovar item:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao aprovar item' });
    }
  }

  // Rejeitar um item (empresa, profissional, vaga)
  async rejectItem(req: Request, res: Response) {
    try {
      const { itemId, itemType, reason } = req.body;
      
      if (!itemId || !itemType || !reason) {
        throw new ApiError(400, 'ID, tipo do item e motivo são obrigatórios');
      }
      
      let result;
      let email;
      let name;
      let subject;
      let message;
      
      switch (itemType) {
        case 'business':
          result = await prisma.business.update({
            where: { id: itemId },
            data: { status: 'REJECTED' },
            include: { user: true }
          });
          
          email = result.user.email;
          name = result.user.name;
          subject = 'Sua empresa não foi aprovada';
          message = `Olá ${name}, infelizmente sua empresa "${result.name}" não foi aprovada no Anunciar Grajaú. Motivo: ${reason}. Você pode editar as informações e solicitar uma nova revisão.`;
          break;
          
        case 'professional':
          result = await prisma.professional.update({
            where: { id: itemId },
            data: { status: 'REJECTED' },
            include: { user: true }
          });
          
          email = result.user.email;
          name = result.user.name;
          subject = 'Seu perfil profissional não foi aprovado';
          message = `Olá ${name}, infelizmente seu perfil profissional não foi aprovado no Anunciar Grajaú. Motivo: ${reason}. Você pode editar as informações e solicitar uma nova revisão.`;
          break;
          
        case 'job':
          result = await prisma.job.update({
            where: { id: itemId },
            data: { status: 'REJECTED' },
            include: { business: { include: { user: true } } }
          });
          
          email = result.business.user.email;
          name = result.business.user.name;
          subject = 'Sua vaga não foi aprovada';
          message = `Olá ${name}, infelizmente sua vaga "${result.title}" não foi aprovada no Anunciar Grajaú. Motivo: ${reason}. Você pode editar as informações e solicitar uma nova revisão.`;
          break;
          
        default:
          throw new ApiError(400, 'Tipo de item inválido');
      }
      
      // Enviar email de notificação
      await EmailService.sendEmail({
        to: email,
        subject,
        html: `<p>${message}</p>`,
      });
      
      return res.json({ 
        success: true, 
        message: `${itemType} rejeitado com sucesso`,
        data: result
      });
    } catch (error) {
      console.error('Erro ao rejeitar item:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao rejeitar item' });
    }
  }

  // Listar submissões pendentes
  async getPendingSubmissions(req: Request, res: Response) {
    try {
      const { type } = req.query;
      
      let businesses: any[] = [];
      let professionals: any[] = [];
      let jobs: any[] = [];
      
      if (!type || type === 'business') {
        businesses = await prisma.business.findMany({
          where: { status: 'PENDING' },
          include: { user: true },
          orderBy: { createdAt: 'desc' }
        });
      }
      
      if (!type || type === 'professional') {
        professionals = await prisma.professional.findMany({
          where: { status: 'PENDING' },
          include: { user: true },
          orderBy: { createdAt: 'desc' }
        });
      }
      
      if (!type || type === 'job') {
        jobs = await prisma.job.findMany({
          where: { status: 'PENDING' },
          include: { business: true },
          orderBy: { createdAt: 'desc' }
        });
      }
      
      return res.json({
        businesses,
        professionals,
        jobs,
        total: businesses.length + professionals.length + jobs.length
      });
    } catch (error) {
      console.error('Erro ao listar submissões pendentes:', error);
      return res.status(500).json({ error: 'Erro ao listar submissões pendentes' });
    }
  }

  // Relatório de pagamentos
  async getPaymentsReport(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const where: any = {
        status: 'PAID'
      };
      
      if (startDate || endDate) {
        where.createdAt = {};
        
        if (startDate) {
          where.createdAt.gte = new Date(startDate as string);
        }
        
        if (endDate) {
          const end = new Date(endDate as string);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
      
      const payments = await prisma.payment.findMany({
        where,
        include: {
          subscription: {
            include: {
              user: {
                select: {
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
      
      const totalAmount = await prisma.payment.aggregate({
        where,
        _sum: { amount: true }
      });
      
      // Agrupar por plano
      const planStats = await prisma.payment.groupBy({
        by: ['subscriptionId'],
        where,
        _sum: { amount: true },
        _count: true
      });
      
      // Agrupar por mês
      const monthlyStats = await prisma.payment.groupBy({
        by: ['createdAt'],
        where,
        _sum: { amount: true },
        _count: true
      });
      
      return res.json({
        payments,
        totalAmount: totalAmount._sum.amount || 0,
        totalCount: payments.length,
        planStats,
        monthlyStats
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de pagamentos:', error);
      return res.status(500).json({ error: 'Erro ao gerar relatório de pagamentos' });
    }
  }

  // Atualizar configurações
  async updateSettings(req: Request, res: Response) {
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
  }

  // Métodos de auditoria
  async getAuditLogs(req: Request, res: Response) {
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
  }

  async getEntityAuditTrail(req: Request, res: Response) {
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
  }

  async getUserAuditTrail(req: Request, res: Response) {
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
  }
}

export default new AdminController(); 