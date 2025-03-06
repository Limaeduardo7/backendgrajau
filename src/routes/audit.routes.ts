import { Router } from 'express';
import auditController from '../controllers/audit.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { logAdminAction } from '../middlewares/logger.middleware';

const router = Router();

// Middleware para verificar se o usuário é admin
// NOTA: A verificação de permissões de ADMIN agora é feita no frontend usando Clerk
// O backend apenas verifica se o usuário está autenticado, sem verificar sua role específica
const isAdmin = requireRole(['ADMIN']);

/**
 * @swagger
 * /audit/logs:
 *   get:
 *     summary: Lista logs de auditoria
 *     tags: [Auditoria]
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
router.get('/logs', requireAuth, isAdmin, logAdminAction, auditController.getAuditLogs);

/**
 * @swagger
 * /audit/entity/{type}/{id}:
 *   get:
 *     summary: Obtém histórico de auditoria de uma entidade específica
 *     tags: [Auditoria]
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
router.get('/entity/:type/:id', requireAuth, isAdmin, logAdminAction, auditController.getEntityAuditTrail);

/**
 * @swagger
 * /audit/user/{id}:
 *   get:
 *     summary: Obtém histórico de auditoria de um usuário específico
 *     tags: [Auditoria]
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
router.get('/user/:id', requireAuth, isAdmin, logAdminAction, auditController.getUserAuditTrail);

/**
 * @swagger
 * /audit/log:
 *   post:
 *     summary: Registra manualmente uma ação de auditoria
 *     tags: [Auditoria]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - entityType
 *             properties:
 *               action:
 *                 type: string
 *                 description: Ação realizada
 *               entityType:
 *                 type: string
 *                 description: Tipo da entidade
 *               entityId:
 *                 type: string
 *                 description: ID da entidade (opcional)
 *               details:
 *                 type: object
 *                 description: Detalhes adicionais (opcional)
 *     responses:
 *       201:
 *         description: Ação de auditoria registrada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 */
router.post('/log', requireAuth, auditController.logAction);

export default router; 