import { Router } from 'express';
const paymentController = require('../controllers/payment.controller');
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { 
  validatePlan, 
  validateUpdatePlan, 
  validateSubscription, 
  validateCancelSubscription 
} from '../validators/payment.validator';
import { auditAdminAction, auditUserAction } from '../middlewares/audit.middleware';

const router = Router();

// Middleware para verificar se o usuário é admin
const isAdmin = requireRole(['ADMIN']);

/**
 * @swagger
 * /payments/plans:
 *   post:
 *     summary: Cria um novo plano
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *               - duration
 *               - type
 *               - features
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               duration:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [BUSINESS, PROFESSIONAL, JOB]
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Plano criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.post(
  '/plans', 
  requireAuth, 
  isAdmin, 
  validatePlan, 
  auditAdminAction('CREATE_PLAN', 'PLAN'),
  paymentController.createPlan
);

/**
 * @swagger
 * /payments/plans:
 *   get:
 *     summary: Lista todos os planos
 *     tags: [Pagamentos]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [BUSINESS, PROFESSIONAL, JOB]
 *         description: Filtrar por tipo de plano
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filtrar por status ativo/inativo
 *     responses:
 *       200:
 *         description: Lista de planos
 */
router.get('/plans', paymentController.getPlans);

/**
 * @swagger
 * /payments/plans/{id}:
 *   get:
 *     summary: Obtém um plano pelo ID
 *     tags: [Pagamentos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do plano
 *     responses:
 *       200:
 *         description: Detalhes do plano
 *       404:
 *         description: Plano não encontrado
 */
router.get('/plans/:id', paymentController.getPlan);

/**
 * @swagger
 * /payments/plans/{id}:
 *   patch:
 *     summary: Atualiza um plano existente
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do plano
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               duration:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [BUSINESS, PROFESSIONAL, JOB]
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Plano atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 *       404:
 *         description: Plano não encontrado
 */
router.patch(
  '/plans/:id', 
  requireAuth, 
  isAdmin, 
  validateUpdatePlan, 
  auditAdminAction('UPDATE_PLAN', 'PLAN'),
  paymentController.updatePlan
);

/**
 * @swagger
 * /payments/plans/{id}:
 *   delete:
 *     summary: Remove um plano
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do plano
 *     responses:
 *       200:
 *         description: Plano removido com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 *       404:
 *         description: Plano não encontrado
 */
router.delete(
  '/plans/:id', 
  requireAuth, 
  isAdmin, 
  auditAdminAction('DELETE_PLAN', 'PLAN'),
  paymentController.deletePlan
);

/**
 * @swagger
 * /payments/subscriptions:
 *   post:
 *     summary: Cria uma nova assinatura
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - paymentMethod
 *             properties:
 *               planId:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, pix, boleto]
 *               cardToken:
 *                 type: string
 *               businessId:
 *                 type: string
 *               professionalId:
 *                 type: string
 *               couponCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Assinatura criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 */
router.post(
  '/subscriptions', 
  requireAuth, 
  validateSubscription, 
  auditUserAction('CREATE_SUBSCRIPTION', 'SUBSCRIPTION'),
  paymentController.createSubscription
);

/**
 * @swagger
 * /payments/subscriptions:
 *   get:
 *     summary: Lista as assinaturas do usuário
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de assinaturas
 *       401:
 *         description: Não autorizado
 */
router.get(
  '/subscriptions', 
  requireAuth, 
  paymentController.getUserSubscriptions
);

/**
 * @swagger
 * /payments/subscriptions/{id}:
 *   get:
 *     summary: Obtém uma assinatura pelo ID
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da assinatura
 *     responses:
 *       200:
 *         description: Detalhes da assinatura
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é o proprietário
 *       404:
 *         description: Assinatura não encontrada
 */
router.get(
  '/subscriptions/:id', 
  requireAuth, 
  paymentController.getSubscription
);

/**
 * @swagger
 * /payments/subscriptions/{id}:
 *   delete:
 *     summary: Cancela uma assinatura
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da assinatura
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Assinatura cancelada com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é o proprietário
 *       404:
 *         description: Assinatura não encontrada
 */
router.delete(
  '/subscriptions/:id', 
  requireAuth, 
  validateCancelSubscription, 
  auditUserAction('CANCEL_SUBSCRIPTION', 'SUBSCRIPTION'),
  paymentController.cancelSubscription
);

/**
 * @swagger
 * /payments/payments:
 *   get:
 *     summary: Lista os pagamentos do usuário
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, FAILED, REFUNDED]
 *         description: Filtrar por status
 *     responses:
 *       200:
 *         description: Lista de pagamentos
 *       401:
 *         description: Não autorizado
 */
router.get(
  '/payments', 
  requireAuth, 
  paymentController.getUserPayments
);

/**
 * @swagger
 * /payments/payments/{id}:
 *   get:
 *     summary: Obtém um pagamento pelo ID
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do pagamento
 *     responses:
 *       200:
 *         description: Detalhes do pagamento
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é o proprietário
 *       404:
 *         description: Pagamento não encontrado
 */
router.get(
  '/payments/:id', 
  requireAuth, 
  paymentController.getPayment
);

/**
 * @swagger
 * /payments/payments/webhook:
 *   post:
 *     summary: Webhook para processamento de pagamentos
 *     tags: [Pagamentos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processado com sucesso
 *       400:
 *         description: Dados inválidos
 */
router.post(
  '/payments/webhook', 
  paymentController.handlePaymentWebhook
);

/**
 * @swagger
 * /payments/invoices:
 *   get:
 *     summary: Lista as faturas do usuário
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de faturas
 *       401:
 *         description: Não autorizado
 */
router.get(
  '/invoices', 
  requireAuth, 
  paymentController.getUserInvoices
);

/**
 * @swagger
 * /payments/invoices/{id}:
 *   get:
 *     summary: Obtém uma fatura pelo ID
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da fatura
 *     responses:
 *       200:
 *         description: Detalhes da fatura
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é o proprietário
 *       404:
 *         description: Fatura não encontrada
 */
router.get(
  '/invoices/:id', 
  requireAuth, 
  paymentController.getInvoice
);

/**
 * @swagger
 * /payments/invoices/{id}/pdf:
 *   get:
 *     summary: Obtém o PDF de uma fatura
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da fatura
 *     responses:
 *       200:
 *         description: PDF da fatura
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é o proprietário
 *       404:
 *         description: Fatura não encontrada
 */
router.get(
  '/invoices/:id/pdf', 
  requireAuth, 
  paymentController.getInvoicePdf
);

/**
 * @swagger
 * /payments/subscriptions/{id}/renew:
 *   post:
 *     summary: Renova uma assinatura manualmente
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da assinatura
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethod
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [credit_card, pix, boleto]
 *               cardToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Assinatura renovada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é o proprietário
 *       404:
 *         description: Assinatura não encontrada
 */
router.post(
  '/subscriptions/:id/renew', 
  requireAuth, 
  auditUserAction('RENEW_SUBSCRIPTION', 'SUBSCRIPTION'),
  paymentController.renewSubscription
);

/**
 * @swagger
 * /payments/subscriptions/{id}/auto-renew:
 *   patch:
 *     summary: Ativa ou desativa a renovação automática
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da assinatura
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - autoRenew
 *             properties:
 *               autoRenew:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Configuração de renovação automática atualizada
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é o proprietário
 *       404:
 *         description: Assinatura não encontrada
 */
router.patch(
  '/subscriptions/:id/auto-renew', 
  requireAuth, 
  auditUserAction('UPDATE_AUTO_RENEW', 'SUBSCRIPTION'),
  paymentController.toggleAutoRenew
);

/**
 * @swagger
 * /payments/admin/check-expiring:
 *   post:
 *     summary: Verifica assinaturas prestes a expirar e envia notificações
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verificação concluída com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.post(
  '/admin/check-expiring', 
  requireAuth, 
  isAdmin, 
  auditAdminAction('CHECK_EXPIRING_SUBSCRIPTIONS', 'SUBSCRIPTION'),
  paymentController.checkExpiringSubscriptions
);

/**
 * @swagger
 * /payments/admin/process-renewals:
 *   post:
 *     summary: Processa renovações automáticas de assinaturas expiradas
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Processamento concluído com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - usuário não é administrador
 */
router.post(
  '/admin/process-renewals', 
  requireAuth, 
  isAdmin, 
  auditAdminAction('PROCESS_AUTO_RENEWALS', 'SUBSCRIPTION'),
  paymentController.processAutoRenewals
);

export default router; 