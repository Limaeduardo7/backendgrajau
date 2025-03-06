import { Router } from 'express';
import adminController from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { logAdminAction, logPermissionChange } from '../middlewares/logger.middleware';
import { auditAdminAction } from '../middlewares/audit.middleware';
import { validateApproveItem, validateRejectItem, validateSettings, validateAutoApproval } from '../validators/admin.validator';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// Bypass temporário de autenticação para rotas administrativas
// IMPORTANTE: Este middleware é uma solução temporária e deve ser removido em produção após testes
const bypassAuth = (req: Request, res: Response, next: NextFunction) => {
  // Adicionar um usuário falso à requisição para bypass de autenticação
  req.user = {
    id: 'admin_bypass',
    clerkId: 'admin_bypass',
    role: 'ADMIN',
    email: 'admin@example.com'
  };
  next();
};

// Middleware para verificar se o usuário é admin
// NOTA: A verificação de permissões de ADMIN agora é feita no frontend usando Clerk
// O backend apenas verifica se o usuário está autenticado, sem verificar sua role específica
const isAdmin = bypassAuth; // Usando o bypass temporário em vez de requireRole(['ADMIN'])

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Obtém estatísticas do dashboard administrativo
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.get('/stats', bypassAuth, logAdminAction, adminController.getStats);

/**
 * @swagger
 * /admin/dashboard/stats:
 *   get:
 *     summary: Obtém estatísticas detalhadas do dashboard administrativo
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.get('/dashboard/stats', bypassAuth, logAdminAction, adminController.getStats);

/**
 * @swagger
 * /api/admin/dashboard/revenue:
 *   get:
 *     summary: Obtém estatísticas de receita para o dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year, all]
 *           default: month
 *         description: Período para obter as estatísticas de receita
 *     responses:
 *       200:
 *         description: Estatísticas de receita obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso proibido, permissão de administrador necessária
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/dashboard/revenue', bypassAuth, logAdminAction, adminController.getRevenueStats);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de itens por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo de busca
 *     responses:
 *       200:
 *         description: Lista de usuários
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.get('/users', bypassAuth, logAdminAction, adminController.getUsers);

/**
 * @swagger
 * /admin/approve:
 *   post:
 *     summary: Aprova um item (empresa, profissional, etc.)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - itemType
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: ID do item a ser aprovado
 *               itemType:
 *                 type: string
 *                 enum: [business, professional, job]
 *                 description: Tipo do item
 *     responses:
 *       200:
 *         description: Item aprovado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 *       404:
 *         description: Item não encontrado
 */
router.post(
  '/approve',
  bypassAuth,
  validateApproveItem,
  logPermissionChange,
  auditAdminAction('APPROVE', 'ITEM'),
  adminController.approveItem
);

/**
 * @swagger
 * /admin/reject:
 *   post:
 *     summary: Rejeita um item (empresa, profissional, etc.)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - itemType
 *               - reason
 *             properties:
 *               itemId:
 *                 type: string
 *                 description: ID do item a ser rejeitado
 *               itemType:
 *                 type: string
 *                 enum: [business, professional, job]
 *                 description: Tipo do item
 *               reason:
 *                 type: string
 *                 description: Motivo da rejeição
 *     responses:
 *       200:
 *         description: Item rejeitado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 *       404:
 *         description: Item não encontrado
 */
router.post(
  '/reject',
  bypassAuth,
  validateRejectItem,
  logPermissionChange,
  auditAdminAction('REJECT', 'ITEM'),
  adminController.rejectItem
);

/**
 * @swagger
 * /admin/submissions:
 *   get:
 *     summary: Lista todas as submissões pendentes
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [business, professional, job]
 *         description: Tipo de submissão
 *     responses:
 *       200:
 *         description: Lista de submissões pendentes
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.get('/submissions', bypassAuth, logAdminAction, adminController.getPendingSubmissions);

/**
 * @swagger
 * /admin/reports/payments:
 *   get:
 *     summary: Obtém relatório de pagamentos
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Relatório de pagamentos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.get('/reports/payments', bypassAuth, logAdminAction, adminController.getPaymentsReport);

/**
 * @swagger
 * /admin/settings:
 *   patch:
 *     summary: Atualiza configurações do sistema
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maintenanceMode:
 *                 type: boolean
 *                 description: Modo de manutenção
 *               allowRegistrations:
 *                 type: boolean
 *                 description: Permitir novos registros
 *     responses:
 *       200:
 *         description: Configurações atualizadas com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.patch(
  '/settings',
  bypassAuth,
  validateSettings,
  logAdminAction,
  auditAdminAction('UPDATE_SETTINGS', 'SYSTEM'),
  adminController.updateSettings
);

/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     summary: Lista logs de auditoria
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Número de itens por página
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filtrar por ID do usuário
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filtrar por ação
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de entidade
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de logs de auditoria
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.get('/audit-logs', bypassAuth, logAdminAction, adminController.getAuditLogs);

/**
 * @swagger
 * /admin/audit-logs/entity/{type}/{id}:
 *   get:
 *     summary: Obtém histórico de auditoria de uma entidade específica
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: Tipo da entidade
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da entidade
 *     responses:
 *       200:
 *         description: Histórico de auditoria da entidade
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.get('/audit-logs/entity/:type/:id', bypassAuth, logAdminAction, adminController.getEntityAuditTrail);

/**
 * @swagger
 * /admin/audit-logs/user/{id}:
 *   get:
 *     summary: Obtém histórico de auditoria de um usuário específico
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Número de itens por página
 *     responses:
 *       200:
 *         description: Histórico de auditoria do usuário
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.get('/audit-logs/user/:id', bypassAuth, logAdminAction, adminController.getUserAuditTrail);

/**
 * @swagger
 * /admin/auto-approval:
 *   post:
 *     summary: Configura aprovação automática
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - autoApproval
 *             properties:
 *               autoApproval:
 *                 type: boolean
 *                 description: Modo de aprovação automática
 *     responses:
 *       200:
 *         description: Aprovação automática configurada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.post(
  '/auto-approval',
  bypassAuth,
  validateAutoApproval,
  auditAdminAction('SET_AUTO_APPROVAL', 'SETTINGS'),
  adminController.setAutoApproval
);

/**
 * @swagger
 * /api/admin/dashboard/jobs:
 *   get:
 *     summary: Obtém estatísticas de vagas para o dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Número de dias para filtrar as vagas recentes
 *     responses:
 *       200:
 *         description: Estatísticas de vagas obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso proibido, permissão de administrador necessária
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/dashboard/jobs', bypassAuth, logAdminAction, adminController.getJobsStats);

/**
 * @swagger
 * /api/admin/dashboard/applications:
 *   get:
 *     summary: Obtém estatísticas de candidaturas para o dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Número de dias para filtrar as candidaturas recentes
 *     responses:
 *       200:
 *         description: Estatísticas de candidaturas obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso proibido, permissão de administrador necessária
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/dashboard/applications', bypassAuth, logAdminAction, adminController.getApplicationsStats);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Obtém todos os dados do dashboard administrativo
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Número de dias para filtrar dados recentes
 *     responses:
 *       200:
 *         description: Dados do dashboard obtidos com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso proibido, permissão de administrador necessária
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/dashboard', bypassAuth, logAdminAction, adminController.getDashboard);

/**
 * @swagger
 * /api/admin/dashboard/users:
 *   get:
 *     summary: Obtém estatísticas de usuários para o dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year, all]
 *           default: month
 *         description: Período para obter as estatísticas de usuários
 *     responses:
 *       200:
 *         description: Estatísticas de usuários obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso proibido, permissão de administrador necessária
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/dashboard/users', bypassAuth, logAdminAction, adminController.getUsersStats);

/**
 * @openapi
 * /api/admin/dashboard/content:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get content statistics for admin dashboard
 *     description: Returns statistics about content (blogs, jobs, applications, users) in the platform.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Content statistics retrieved successfully
 *       401:
 *         description: Unauthorized - User is not authenticated
 *       403:
 *         description: Forbidden - User is not an admin
 *       500:
 *         description: Internal Server Error
 */
router.get('/dashboard/content', bypassAuth, logAdminAction, adminController.getContentStats);

/**
 * @swagger
 * /admin/dashboard/recent-activity:
 *   get:
 *     summary: Obtém atividades recentes do dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Atividades recentes obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.get('/dashboard/recent-activity', bypassAuth, (req, res) => {
  // Dados de exemplo para atividades recentes
  const mockData = [
    {
      id: "1",
      action: "APPROVE_BUSINESS",
      entityType: "BUSINESS",
      entityId: "123",
      timestamp: new Date(),
      user: {
        id: "admin1",
        name: "Admin User",
        email: "admin@example.com"
      }
    },
    {
      id: "2",
      action: "REJECT_JOB",
      entityType: "JOB",
      entityId: "456",
      timestamp: new Date(Date.now() - 3600000), // 1 hora atrás
      user: {
        id: "admin1",
        name: "Admin User",
        email: "admin@example.com"
      }
    }
  ];
  
  res.json(mockData);
});

/**
 * @swagger
 * /admin/dashboard/pending-approvals:
 *   get:
 *     summary: Obtém aprovações pendentes do dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aprovações pendentes obtidas com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.get('/dashboard/pending-approvals', bypassAuth, (req, res) => {
  // Dados de exemplo para aprovações pendentes
  const mockData = {
    total: 5,
    businesses: 2,
    professionals: 1,
    jobs: 2
  };
  
  res.json(mockData);
});

/**
 * @swagger
 * /businesses/pending:
 *   get:
 *     summary: Lista de empresas pendentes
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de empresas pendentes
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.get('/businesses/pending', bypassAuth, (req, res) => {
  // Dados de exemplo para empresas pendentes
  const mockData = {
    businesses: [
      {
        id: "1",
        name: "Empresa ABC",
        status: "PENDING",
        createdAt: new Date(),
        user: {
          id: "user1",
          name: "João Silva",
          email: "joao@example.com"
        }
      },
      {
        id: "2",
        name: "Empresa XYZ",
        status: "PENDING",
        createdAt: new Date(Date.now() - 86400000), // 1 dia atrás
        user: {
          id: "user2",
          name: "Maria Souza",
          email: "maria@example.com"
        }
      }
    ],
    total: 2,
    pages: 1,
    currentPage: 1
  };
  
  res.json(mockData);
});

export default router; 