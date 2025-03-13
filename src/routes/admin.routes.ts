import { Router } from 'express';
import adminController from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { logAdminAction } from '../middlewares/logger.middleware';
import { auditAdminAction } from '../middlewares/audit.middleware';
import { validateApproveItem, validateRejectItem, validateSettings, validateAutoApproval } from '../validators/admin.validator';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// Configuração de autenticação para rotas administrativas
const adminAuth = [requireAuth, requireRole(['ADMIN'])];

// Aplicar middlewares às rotas administrativas
// Dashboard e estatísticas
router.get('/dashboard', ...adminAuth, adminController.getDashboard);
router.get('/stats', adminController.getStats);
router.get('/user-stats', ...adminAuth, adminController.getUserStats);
router.get('/revenue', ...adminAuth, adminController.getRevenueStats);
router.get('/jobs-stats', ...adminAuth, adminController.getJobsStats);
router.get('/applications-stats', ...adminAuth, adminController.getApplicationsStats);
router.get('/users-stats', ...adminAuth, adminController.getUsersStats);
router.get('/content-stats', ...adminAuth, adminController.getContentStats);

// Novas rotas para o painel administrativo
router.get('/dashboard/stats', ...adminAuth, adminController.getDashboardStats);
router.get('/dashboard/users', ...adminAuth, adminController.getUserStats);
router.get('/dashboard/content', ...adminAuth, adminController.getContentStats);
router.get('/submissions', ...adminAuth, adminController.getSubmissions);

router.get('/dashboard/pending-approvals', ...adminAuth, adminController.getPendingApprovals);

// Gerenciamento de usuários
router.get('/users', ...adminAuth, adminController.getUsers);

// Gerenciamento de conteúdo
router.post('/approve', ...adminAuth, validateApproveItem, logAdminAction, 
  auditAdminAction('APPROVE', 'CONTENT'),
  adminController.approveItem);

router.post('/reject', ...adminAuth, validateRejectItem, logAdminAction, 
  auditAdminAction('REJECT', 'CONTENT'),
  adminController.rejectItem);

router.get('/pending', ...adminAuth, adminController.getPendingSubmissions);

// Configurações
router.post('/auto-approval', ...adminAuth, validateAutoApproval, logAdminAction, adminController.setAutoApproval);
router.post('/settings', ...adminAuth, validateSettings, logAdminAction, adminController.updateSettings);

// Relatórios
router.get('/payments', ...adminAuth, adminController.getPaymentsReport);
router.get('/audit-logs', ...adminAuth, adminController.getAuditLogs);
router.get('/entity-audit/:entityType/:entityId', ...adminAuth, adminController.getEntityAuditTrail);
router.get('/user-audit/:userId', ...adminAuth, adminController.getUserAuditTrail);

// Rota para atividade recente
router.get('/dashboard/recent-activity', ...adminAuth, adminController.getAuditLogs);

// Rota para estatísticas de receita
router.get('/dashboard/revenue', ...adminAuth, adminController.getRevenueStats);

export default router; 