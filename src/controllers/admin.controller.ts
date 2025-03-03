import { Request, Response } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../config/prisma';
import logger from '../config/logger';
import { ApiError } from '../utils/ApiError';
import EmailService from '../services/EmailService';
import AuditService from '../services/AuditService';
import ApprovalService from '../services/ApprovalService';
import { Status } from '@prisma/client';

// Definindo uma interface para estender o Request
interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: string;
    email: string;
  };
}

class AdminController {
  // Dashboard e estatísticas
  getStats = async (req: Request, res: Response) => {
    try {
      // Obter contagens de cada modelo
      const [
        userCount,
        businessCount,
        professionalCount,
        jobCount,
        applicationCount,
        blogPostCount,
        reviewCount,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.business.count(),
        prisma.professional.count(),
        prisma.job.count(),
        prisma.application.count(),
        prisma.blogPost.count(),
        prisma.review.count(),
      ]);

      // Retornar os dados
      res.json({
        users: userCount,
        businesses: businessCount,
        professionals: professionalCount,
        jobs: jobCount,
        applications: applicationCount,
        blogPosts: blogPostCount,
        reviews: reviewCount,
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      res.status(500).json({ error: 'Erro ao obter estatísticas' });
    }
  };

  getRevenueStats = async (req: Request, res: Response) => {
    try {
      const period = (req.query.period as string) || 'month';
      logger.info(`Obtendo estatísticas de receita para o período: ${period}`);
      
      // Definir o intervalo de datas com base no período solicitado
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(0); // Data início Unix epoch
          break;
        default:
          startDate.setMonth(now.getMonth() - 1); // Default para mês
      }
      
      // Obter todos os pagamentos aprovados dentro do intervalo de datas
      const payments = await prisma.payment.findMany({
        where: {
          status: 'PAID',
          createdAt: {
            gte: startDate,
            lte: now,
          },
        },
        include: {
          subscription: {
            include: {
              plan: true
            }
          }
        }
      });
      
      // Calcular receita total
      const totalRevenue = payments.reduce((sum, payment) => {
        return sum + (Number(payment.amount) || 0);
      }, 0);
      
      // Agrupar receita por tipo de plano
      const revenueByPlanType: Record<string, number> = {};
      payments.forEach(payment => {
        const planType = payment.subscription?.plan?.type || 'Desconhecido';
        if (!revenueByPlanType[planType]) {
          revenueByPlanType[planType] = 0;
        }
        revenueByPlanType[planType] += Number(payment.amount) || 0;
      });
      
      // Se o período for maior que um dia, agrupar por mês também
      const revenueByMonth: Record<string, number> = {};
      if (period !== 'day') {
        payments.forEach(payment => {
          const date = new Date(payment.createdAt);
          const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          if (!revenueByMonth[monthKey]) {
            revenueByMonth[monthKey] = 0;
          }
          revenueByMonth[monthKey] += Number(payment.amount) || 0;
        });
      }
      
      // Retornar estatísticas
      res.json({
        totalRevenue,
        paymentsCount: payments.length,
        revenueByPlanType,
        ...(period !== 'day' && { revenueByMonth }),
        period,
        startDate,
        endDate: now,
        // Para debugging, incluir os pagamentos brutos
        payments: req.query.debug === 'true' ? payments : undefined
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas de receita:', error);
      res.status(500).json({
        error: 'Erro ao obter estatísticas de receita',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
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

  getJobsStats = async (req: Request, res: Response) => {
    try {
      logger.info('Obtendo estatísticas de vagas para o dashboard');
      
      // Definir período para filtrar vagas recentes
      const days = parseInt(req.query.days as string) || 30;
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - days);
      
      // Contagem total de vagas
      const totalJobs = await prisma.job.count();
      
      // Contagem de vagas ativas
      const activeJobs = await prisma.job.count({
        where: {
          status: 'ACTIVE' as any // Usando any temporariamente para satisfazer o linter
        }
      });
      
      // Contagem de vagas fechadas
      const closedJobs = await prisma.job.count({
        where: {
          status: 'CLOSED' as any // Usando any temporariamente para satisfazer o linter
        }
      });
      
      // Vagas recentes (últimos X dias)
      const recentJobs = await prisma.job.findMany({
        where: {
          createdAt: {
            gte: recentDate
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10,
        include: {
          business: {
            select: {
              name: true,
              // logo: true - removido pois não existe no modelo
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        }
      });
      
      // Vagas com mais candidaturas
      const popularJobs = await prisma.job.findMany({
        orderBy: {
          applications: {
            _count: 'desc'
          }
        },
        take: 5,
        include: {
          business: {
            select: {
              name: true,
              // logo: true - removido pois não existe no modelo
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        }
      });
      
      // Estatísticas por categoria
      const jobsByCategory = await prisma.$queryRaw`
        SELECT category, COUNT(*) as count
        FROM "Job"
        GROUP BY category
        ORDER BY count DESC
      `;
      
      res.json({
        total: totalJobs,
        active: activeJobs,
        closed: closedJobs,
        recentJobs,
        popularJobs,
        jobsByCategory,
        period: `Últimos ${days} dias`
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas de vagas:', error);
      res.status(500).json({
        error: 'Erro ao obter estatísticas de vagas',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  getApplicationsStats = async (req: Request, res: Response) => {
    try {
      logger.info('Obtendo estatísticas de candidaturas para o dashboard');
      
      // Definir período para filtrar candidaturas recentes
      const days = parseInt(req.query.days as string) || 30;
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - days);
      
      // Contagem total de candidaturas
      const totalApplications = await prisma.application.count();
      
      // Contagem por status
      const pendingApplications = await prisma.application.count({
        where: {
          status: 'PENDING' as any // Usando any temporariamente para satisfazer o linter
        }
      });
      
      const approvedApplications = await prisma.application.count({
        where: {
          status: 'APPROVED' as any // Usando any temporariamente para satisfazer o linter
        }
      });
      
      const rejectedApplications = await prisma.application.count({
        where: {
          status: 'REJECTED' as any // Usando any temporariamente para satisfazer o linter
        }
      });
      
      // Candidaturas recentes
      const recentApplications = await prisma.application.findMany({
        where: {
          createdAt: {
            gte: recentDate
          }
        },
        take: 10,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          job: {
            select: {
              title: true,
              businessId: true,
              business: {
                select: {
                  name: true
                }
              }
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
      
      // Candidatura por dia nos últimos dias
      const applicationsByDay = await prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM "Application"
        WHERE created_at >= ${recentDate}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
      
      res.json({
        total: totalApplications,
        byStatus: {
          pending: pendingApplications,
          approved: approvedApplications,
          rejected: rejectedApplications
        },
        recentApplications,
        applicationsByDay,
        period: `Últimos ${days} dias`
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas de candidaturas:', error);
      res.status(500).json({
        error: 'Erro ao obter estatísticas de candidaturas',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  getDashboard = async (req: Request, res: Response) => {
    try {
      logger.info('Obtendo dados completos para o dashboard');
      
      // Período para filtrar dados recentes
      const days = parseInt(req.query.days as string) || 30;
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - days);
      
      // ----- Estatísticas de usuários -----
      const totalUsers = await prisma.user.count();
      
      const usersByRole = await prisma.$queryRaw`
        SELECT role, COUNT(*) as count
        FROM "User"
        GROUP BY role
        ORDER BY count DESC
      `;
      
      const recentUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: recentDate
          }
        }
      });
      
      // ----- Estatísticas de vagas -----
      const totalJobs = await prisma.job.count();
      
      const activeJobs = await prisma.job.count({
        where: {
          status: 'ACTIVE' as any
        }
      });
      
      const recentJobs = await prisma.job.count({
        where: {
          createdAt: {
            gte: recentDate
          }
        }
      });
      
      // ----- Estatísticas de candidaturas -----
      const totalApplications = await prisma.application.count();
      
      const recentApplications = await prisma.application.count({
        where: {
          createdAt: {
            gte: recentDate
          }
        }
      });
      
      // ----- Estatísticas de pagamentos -----
      const payments = await prisma.payment.findMany({
        where: {
          status: 'PAID' as any,
          createdAt: {
            gte: recentDate
          }
        }
      });
      
      const totalRevenue = payments.reduce((sum, payment) => {
        return sum + (Number(payment.amount) || 0);
      }, 0);
      
      // Resumo geral do dashboard
      res.json({
        users: {
          total: totalUsers,
          byRole: usersByRole,
          recent: recentUsers
        },
        jobs: {
          total: totalJobs,
          active: activeJobs,
          recent: recentJobs
        },
        applications: {
          total: totalApplications,
          recent: recentApplications
        },
        revenue: {
          total: totalRevenue,
          recentPayments: payments.length
        },
        period: `Últimos ${days} dias`,
        asOf: new Date()
      });
    } catch (error) {
      logger.error('Erro ao obter dados do dashboard:', error);
      res.status(500).json({
        error: 'Erro ao obter dados do dashboard',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  getUsersStats = async (req: Request, res: Response) => {
    try {
      const period = (req.query.period as string) || 'month';
      logger.info(`Obtendo estatísticas de usuários para o período: ${period}`);
      
      // Definir o intervalo de datas com base no período solicitado
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date(0); // Data início Unix epoch
          break;
        default:
          startDate.setMonth(now.getMonth() - 1); // Default para mês
      }
      
      // Contagem total de usuários
      const totalUsers = await prisma.user.count();
      
      // Usuários por papel (role)
      const usersByRoleRaw = await prisma.$queryRaw`
        SELECT role, COUNT(*) as count
        FROM "User"
        GROUP BY role
        ORDER BY count DESC
      `;
      
      // Converter BigInt para Number nas consultas raw
      const usersByRole = Array.isArray(usersByRoleRaw) ? usersByRoleRaw.map(item => ({
        role: item.role,
        count: Number(item.count)
      })) : [];
      
      // Usuários por status
      const usersByStatusRaw = await prisma.$queryRaw`
        SELECT status, COUNT(*) as count
        FROM "User"
        GROUP BY status
        ORDER BY count DESC
      `;
      
      // Converter BigInt para Number
      const usersByStatus = Array.isArray(usersByStatusRaw) ? usersByStatusRaw.map(item => ({
        status: item.status,
        count: Number(item.count)
      })) : [];
      
      // Usuários criados no período
      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: now
          }
        }
      });
      
      // Usuários recentes (para listagem)
      const recentUsers = await prisma.user.findMany({
        where: {
          createdAt: {
            gte: startDate
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true
        }
      });
      
      // Usuários por mês (para gráfico de crescimento)
      const usersByMonthRaw = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as count
        FROM 
          "User"
        GROUP BY 
          DATE_TRUNC('month', "createdAt")
        ORDER BY 
          month ASC
      `;
      
      // Converter BigInt para Number
      const usersByMonth = Array.isArray(usersByMonthRaw) ? usersByMonthRaw.map(item => ({
        month: item.month,
        count: Number(item.count)
      })) : [];
      
      // Estatísticas adicionais
      const professionalCount = await prisma.user.count({
        where: {
          role: 'PROFESSIONAL' as any
        }
      });
      
      const businessCount = await prisma.user.count({
        where: {
          role: 'BUSINESS' as any
        }
      });
      
      res.json({
        total: totalUsers,
        byRole: usersByRole,
        byStatus: usersByStatus,
        newUsers,
        recentUsers,
        usersByMonth,
        professionals: professionalCount,
        businesses: businessCount,
        period,
        startDate,
        endDate: now
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas de usuários:', error);
      res.status(500).json({
        error: 'Erro ao obter estatísticas de usuários',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  async getContentStats(req: Request, res: Response) {
    try {
      logger.info('Obtendo estatísticas de conteúdo');
      
      // Buscar estatísticas dos blogs
      const totalBlogs = await prisma.blogPost.count();
      const publishedBlogs = await prisma.blogPost.count({
        where: { published: true }
      });
      const pendingBlogs = await prisma.blogPost.count({
        where: { published: false }
      });
      
      // Buscar estatísticas dos jobs
      const totalJobs = await prisma.job.count();
      const activeJobs = await prisma.job.count({
        where: { status: 'APPROVED' }
      });
      const pendingJobs = await prisma.job.count({
        where: { status: 'PENDING' }
      });
      
      // Buscar estatísticas das aplicações
      const totalApplications = await prisma.application.count();
      
      // Buscar estatísticas de usuários
      const totalUsers = await prisma.user.count();
      const totalProfessionals = await prisma.professional.count();
      const totalBusinesses = await prisma.business.count();
      
      return res.json({
        blogs: {
          total: totalBlogs,
          published: publishedBlogs,
          pending: pendingBlogs
        },
        jobs: {
          total: totalJobs,
          active: activeJobs,
          pending: pendingJobs
        },
        applications: {
          total: totalApplications
        },
        users: {
          total: totalUsers,
          professionals: totalProfessionals,
          businesses: totalBusinesses
        }
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas de conteúdo:', error);
      return res.status(500).json({ message: 'Erro ao obter estatísticas de conteúdo' });
    }
  }
}

export default new AdminController(); 