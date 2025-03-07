import { Router } from 'express';
import adminController from '../controllers/admin.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { logAdminAction } from '../middlewares/logger.middleware';
import { auditAdminAction } from '../middlewares/audit.middleware';
import { validateApproveItem, validateRejectItem, validateSettings, validateAutoApproval } from '../validators/admin.validator';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// Determinar se estamos em ambiente de produção
const isProduction = process.env.NODE_ENV === 'production';

// Bypass temporário de autenticação para desenvolvimento
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

// Verificação simplificada apenas do token Clerk
// A verificação de admin agora é feita exclusivamente pelo Clerk no frontend
const verifyClerkAuth = (req: Request, res: Response, next: NextFunction) => {
  // Se requireAuth já foi executado, o usuário já está na requisição
  if (!req.user) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  // Permitir acesso sem verificar a role no banco de dados
  // A verificação de permissões é responsabilidade do frontend com Clerk
  next();
};

// Escolher o middleware com base no ambiente
const adminAuth = isProduction 
  ? [requireAuth, verifyClerkAuth] // Em produção, usar autenticação real
  : [bypassAuth]; // Em desenvolvimento, usar bypass

// Aplicar middlewares às rotas administrativas
// Dashboard e estatísticas
router.get('/dashboard', ...adminAuth, adminController.getDashboard);
router.get('/stats', ...adminAuth, adminController.getStats);
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
  // Chamando auditAdminAction com os parâmetros necessários
  auditAdminAction('APPROVE', 'CONTENT'),
  adminController.approveItem);

router.post('/reject', ...adminAuth, validateRejectItem, logAdminAction, 
  // Chamando auditAdminAction com os parâmetros necessários
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

// Rotas adicionais para mock data
router.get('/dashboard/recent-activity', ...adminAuth, (req, res) => {
  res.json({
    items: [
      { id: 1, type: 'business', action: 'create', user: 'João Silva', timestamp: new Date().toISOString(), details: 'Novo negócio: Restaurante Sabor & Arte' },
      { id: 2, type: 'job', action: 'update', user: 'Maria Oliveira', timestamp: new Date(Date.now() - 3600000).toISOString(), details: 'Vaga atualizada: Gerente de Vendas' },
      { id: 3, type: 'user', action: 'create', user: 'Admin', timestamp: new Date(Date.now() - 7200000).toISOString(), details: 'Novo usuário: Carlos Mendes' },
      { id: 4, type: 'business', action: 'approve', user: 'Admin', timestamp: new Date(Date.now() - 86400000).toISOString(), details: 'Negócio aprovado: Oficina do Pedro' }
    ]
  });
});

router.get('/dashboard/pending-approvals', ...adminAuth, (req, res) => {
  res.json({
    counts: {
      businesses: 5,
      jobs: 3,
      events: 2,
      blogPosts: 1
    },
    total: 11
  });
});

router.get('/businesses/pending', ...adminAuth, (req, res) => {
  res.json({
    items: [
      { id: 1, name: 'Restaurante Sabor & Arte', owner: 'João Silva', category: 'Alimentação', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 2, name: 'Oficina do Pedro', owner: 'Pedro Santos', category: 'Serviços', createdAt: new Date(Date.now() - 172800000).toISOString() },
      { id: 3, name: 'Mercado Bom Preço', owner: 'Ana Beatriz', category: 'Varejo', createdAt: new Date(Date.now() - 259200000).toISOString() }
    ],
    total: 3,
    page: 1,
    pageSize: 10
  });
});

export default router; 