import { Router } from 'express';
import adminController from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { logAdminAction, logPermissionChange } from '../middlewares/logger.middleware';
import { auditAdminAction } from '../middlewares/audit.middleware';
import { validateApproveItem, validateRejectItem, validateSettings, validateAutoApproval } from '../validators/admin.validator';

const router = Router();

// Middleware para verificar se o usuário é admin
const isAdmin = requireRole(['ADMIN']);

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
router.get('/stats', requireAuth, isAdmin, logAdminAction, adminController.getStats);

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
router.get('/dashboard/stats', requireAuth, isAdmin, logAdminAction, adminController.getStats);

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
router.get('/users', requireAuth, isAdmin, logAdminAction, adminController.getUsers);

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
  requireAuth,
  isAdmin,
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
  requireAuth,
  isAdmin,
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
router.get('/submissions', requireAuth, isAdmin, logAdminAction, adminController.getPendingSubmissions);

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
router.get('/reports/payments', requireAuth, isAdmin, logAdminAction, adminController.getPaymentsReport);

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
  requireAuth,
  isAdmin,
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
router.get('/audit-logs', requireAuth, isAdmin, logAdminAction, adminController.getAuditLogs);

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
router.get('/audit-logs/entity/:type/:id', requireAuth, isAdmin, logAdminAction, adminController.getEntityAuditTrail);

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
router.get('/audit-logs/user/:id', requireAuth, isAdmin, logAdminAction, adminController.getUserAuditTrail);

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
  requireAuth,
  isAdmin,
  validateAutoApproval,
  auditAdminAction('SET_AUTO_APPROVAL', 'SETTINGS'),
  adminController.setAutoApproval
);

export default router; 