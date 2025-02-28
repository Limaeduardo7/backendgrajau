import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import EmailService from '../services/EmailService';
import AuditService from '../services/AuditService';
import ApprovalService from '../services/ApprovalService';

// Definindo uma interface para estender o Request
interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: string;
  };
}

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
  };

  // Listar todos os usuários com filtros
  getUsers = async (req: Request, res: Response) => {
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
          { name: { contains: search as string, mode: 'insensitive' as any } },
          { email: { contains: search as string, mode: 'insensitive' as any } }
        ];
      }
      
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
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
                status: true
              }
            }
          }
        }),
        prisma.user.count({ where })
      ]);
      
      return res.json({
        users,
        total,
        pages: Math.ceil(total / Number(limit)),
        currentPage: Number(page)
      });
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  };

  // Aprovar um item (empresa, profissional, vaga)
  approveItem = async (req: AuthRequest, res: Response) => {
    try {
      const { itemId, itemType } = req.body;
      const adminId = req.user?.id;
      
      if (!adminId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }
      
      let result;
      
      switch (itemType) {
        case 'business':
          result = await ApprovalService.approveBusiness(itemId, adminId);
          break;
        case 'professional':
          result = await ApprovalService.approveProfessional(itemId, adminId);
          break;
        case 'job':
          result = await ApprovalService.approveJob(itemId, adminId);
          break;
        default:
          throw new ApiError(400, 'Tipo de item inválido');
      }
      
      return res.json(result);
    } catch (error) {
      console.error('Erro ao aprovar item:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao aprovar item' });
    }
  };

  // Rejeitar um item (empresa, profissional, vaga)
  rejectItem = async (req: AuthRequest, res: Response) => {
    try {
      const { itemId, itemType, reason } = req.body;
      const adminId = req.user?.id;
      
      if (!adminId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }
      
      let result;
      
      switch (itemType) {
        case 'business':
          result = await ApprovalService.rejectBusiness(itemId, adminId, reason);
          break;
        case 'professional':
          result = await ApprovalService.rejectProfessional(itemId, adminId, reason);
          break;
        case 'job':
          result = await ApprovalService.rejectJob(itemId, adminId, reason);
          break;
        default:
          throw new ApiError(400, 'Tipo de item inválido');
      }
      
      return res.json(result);
    } catch (error) {
      console.error('Erro ao rejeitar item:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao rejeitar item' });
    }
  };

  // Listar submissões pendentes
  getPendingSubmissions = async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      
      const result = await ApprovalService.getPendingItems(type as 'business' | 'professional' | 'job' | undefined);
      
      return res.json(result);
    } catch (error) {
      console.error('Erro ao buscar submissões pendentes:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao buscar submissões pendentes' });
    }
  };

  // Configurar aprovação automática
  setAutoApproval = async (req: Request, res: Response) => {
    try {
      const { enabled } = req.body;
      
      // Como não temos o modelo Setting, vamos apenas retornar a configuração
      // Em uma implementação real, isso seria armazenado em um modelo adequado
      
      return res.json({
        success: true,
        message: `Aprovação automática ${enabled ? 'ativada' : 'desativada'} com sucesso`,
        setting: { key: 'autoApproval', value: JSON.stringify({ enabled }) }
      });
    } catch (error) {
      console.error('Erro ao configurar aprovação automática:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao configurar aprovação automática' });
    }
  };

  // Relatório de pagamentos
  getPaymentsReport = async (req: Request, res: Response) => {
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
          where.createdAt.lte = new Date(endDate as string);
        }
      }
      
      // Buscar pagamentos
      const payments = await prisma.payment.findMany({
        where,
        include: {
          subscription: {
            include: {
              plan: true,
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });
      
      // Calcular valor total
      const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      
      // Agrupar por plano
      const planMap = new Map();
      
      payments.forEach(payment => {
        const planId = payment.subscription?.plan?.id;
        const planName = payment.subscription?.plan?.name || 'Plano removido';
        
        if (!planMap.has(planId)) {
          planMap.set(planId, {
            planId,
            planName,
            count: 0,
            totalAmount: 0
          });
        }
        
        const planStats = planMap.get(planId);
        planStats.count += 1;
        planStats.totalAmount += Number(payment.amount);
      });
      
      return res.json({
        totalPayments: payments.length,
        totalAmount,
        paymentsByPlan: Array.from(planMap.values())
      });
    } catch (error) {
      console.error('Erro ao gerar relatório de pagamentos:', error);
      return res.status(500).json({ error: 'Erro ao gerar relatório de pagamentos' });
    }
  };

  // Configurações do sistema
  updateSettings = async (req: Request, res: Response) => {
    try {
      const { maintenanceMode, allowRegistrations, featuredLimit, emailNotifications, autoApproveUsers } = req.body;
      
      // Como não temos o modelo Setting, vamos apenas retornar as configurações
      // Em uma implementação real, isso seria armazenado em um modelo adequado
      const settings = {
        maintenanceMode: maintenanceMode !== undefined ? { enabled: maintenanceMode } : undefined,
        allowRegistrations: allowRegistrations !== undefined ? { enabled: allowRegistrations } : undefined,
        featuredLimit: featuredLimit !== undefined ? { value: featuredLimit } : undefined,
        emailNotifications: emailNotifications !== undefined ? { enabled: emailNotifications } : undefined,
        autoApproveUsers: autoApproveUsers !== undefined ? { enabled: autoApproveUsers } : undefined
      };
      
      return res.json({
        success: true,
        message: 'Configurações atualizadas com sucesso',
        settings: Object.fromEntries(
          Object.entries(settings).filter(([_, value]) => value !== undefined)
        )
      });
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      return res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
  };

  // Logs de auditoria
  getAuditLogs = async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        action,
        entityType,
        userId
      } = req.query;
      
      const result = await AuditService.getAuditLogs({
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        action: action as string,
        entityType: entityType as string,
        userId: userId as string
      });
      
      return res.json(result);
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
    }
  };

  // Trilha de auditoria de uma entidade
  getEntityAuditTrail = async (req: Request, res: Response) => {
    try {
      const { type, id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
      const result = await AuditService.getEntityAuditTrail(type, id);
      
      return res.json(result);
    } catch (error) {
      console.error('Erro ao buscar histórico de auditoria da entidade:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao buscar histórico de auditoria da entidade' });
    }
  };

  // Trilha de auditoria de um usuário
  getUserAuditTrail = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      
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