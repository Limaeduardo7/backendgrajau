import { Router, Request, Response } from 'express';
import businessRoutes from './business.routes';
import jobRoutes from './job.routes';
import professionalRoutes from './professional.routes';
import webhookRoutes from './webhook.routes';
import blogRoutes from './blog.routes';
import emailRoutes from './email.routes';
import adminRoutes from './admin.routes';
import paymentRoutes from './payment.routes';
import reviewRoutes from './review.routes';
import applicationRoutes from './application.routes';
import { requireAuth, validateUser } from '../middlewares/auth.middleware';
import auditRoutes from './audit.routes';

const router = Router();

// Rota de teste/saúde
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'API funcionando corretamente' });
});

// Rota protegida de teste
router.get('/me', requireAuth, validateUser, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// Registrando as rotas de negócios
router.use('/businesses', businessRoutes);

// Registrando as rotas de vagas
router.use('/jobs', jobRoutes);

// Registrando as rotas de profissionais
router.use('/professionals', professionalRoutes);

// Registrando as rotas de webhook
router.use('/webhooks', webhookRoutes);

// Registrando as rotas do blog
router.use('/blog', blogRoutes);

// Registrando as rotas de email
router.use('/email', emailRoutes);

// Registrando as rotas de administração
router.use('/admin', adminRoutes);

// Registrando as rotas de pagamento
router.use('/payments', paymentRoutes);
router.use('/plans', paymentRoutes);
router.use('/subscriptions', paymentRoutes);
router.use('/invoices', paymentRoutes);

// Registrando as rotas de avaliações
router.use('/reviews', reviewRoutes);

// Registrando as rotas de candidaturas
router.use('/applications', applicationRoutes);

// Rotas de auditoria
router.use('/audit', auditRoutes);

// Aqui serão adicionadas as demais rotas
// router.use('/admin', adminRoutes);

export default router; 