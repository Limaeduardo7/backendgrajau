import { Router, Request, Response } from 'express';
import { BusinessController } from '../controllers/business.controller';
import { ProfessionalController } from '../controllers/professional.controller';
import { BlogController } from '../controllers/blog.controller';

const router = Router();
const businessController = new BusinessController();
const professionalController = new ProfessionalController();
const blogController = new BlogController();

// Middleware para bypass temporário de autenticação
// IMPORTANTE: Isso é apenas uma solução temporária até que o frontend seja atualizado
const bypassAuth = (req: Request, res: Response, next: Function) => {
  console.log('Bypass temporário de autenticação aplicado para compatibilidade');
  req.user = {
    id: 'admin_bypass',
    clerkId: 'admin_bypass',
    role: 'ADMIN',
    email: 'admin@example.com'
  };
  next();
};

// Rotas temporárias para empresas pendentes
router.get('/businesses/pending', (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /businesses/pending');
  res.json({
    items: [],
    total: 0,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
    totalPages: 0
  });
});

// Rotas temporárias para profissionais pendentes
router.get('/professionals/pending', (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /professionals/pending');
  res.json({
    items: [],
    total: 0,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
    totalPages: 0
  });
});

// Rota temporária para posts em rascunho
router.get('/blog/posts/drafts', bypassAuth, (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /blog/posts/drafts');
  return blogController.getDraftPosts(req, res);
});

// Rota temporária para posts publicados
router.get('/blog/posts/published', (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /blog/posts/published');
  req.query.published = 'true';
  return blogController.list(req, res);
});

// Rotas temporárias para o painel administrativo
// Dashboard e estatísticas
router.get('/admin/dashboard/stats', bypassAuth, (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /admin/dashboard/stats');
  res.json({
    totalUsers: 0,
    totalBusinesses: 0,
    totalProfessionals: 0,
    totalJobs: 0,
    totalApplications: 0,
    pendingApprovals: 0,
    recentActivity: []
  });
});

router.get('/admin/dashboard/users', bypassAuth, (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /admin/dashboard/users');
  res.json({
    totalUsers: 0,
    newUsers: 0,
    activeUsers: 0,
    usersByRole: {
      ADMIN: 0,
      USER: 0,
      BUSINESS: 0,
      PROFESSIONAL: 0
    },
    usersByStatus: {
      ACTIVE: 0,
      PENDING: 0,
      SUSPENDED: 0
    },
    usersByMonth: {},
    period: req.query.period || 'month'
  });
});

router.get('/admin/dashboard/content', bypassAuth, (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /admin/dashboard/content');
  res.json({
    totalBusinesses: 0,
    totalProfessionals: 0,
    totalJobs: 0,
    totalBlogPosts: 0,
    pendingApprovals: 0,
    contentByStatus: {
      APPROVED: 0,
      PENDING: 0,
      REJECTED: 0
    },
    contentByMonth: {},
    period: req.query.period || 'month'
  });
});

router.get('/admin/dashboard/revenue', bypassAuth, (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /admin/dashboard/revenue');
  res.json({
    total: 0,
    monthly: 0,
    yearly: 0,
    paymentsCount: 0,
    revenueByPlanType: {
      BUSINESS: 0,
      PROFESSIONAL: 0,
      PREMIUM: 0
    },
    revenueByMonth: {},
    period: req.query.period || 'month',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString()
  });
});

router.get('/admin/dashboard/pending-approvals', bypassAuth, (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /admin/dashboard/pending-approvals');
  res.json({
    businesses: 0,
    professionals: 0,
    jobs: 0,
    blogPosts: 0,
    total: 0,
    items: []
  });
});

router.get('/admin/dashboard/recent-activity', bypassAuth, (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /admin/dashboard/recent-activity');
  res.json({
    items: []
  });
});

router.get('/admin/submissions', bypassAuth, (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /admin/submissions');
  const status = (req.query.status as string || '').toLowerCase();
  
  res.json({
    submissions: [],
    total: 0,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
    totalPages: 0
  });
});

export default router; 