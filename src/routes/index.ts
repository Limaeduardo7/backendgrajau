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
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import { requireAuth, validateUser } from '../middlewares/auth.middleware';
import auditRoutes from './audit.routes';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

// Rota de teste/saúde
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'API funcionando corretamente' });
});

// Rota protegida de teste
router.get('/me', requireAuth, validateUser, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// Registrando as rotas de autenticação
router.use('/auth', authRoutes);

// Registrando as rotas de usuário
router.use('/users', userRoutes);

// Alias para a rota de registro (para compatibilidade)
router.post('/register', authController.register);

// Alias para a rota de login (para compatibilidade)
router.post('/login', authController.login);

// Registrando as rotas principais
router.use('/businesses', businessRoutes);
router.use('/jobs', jobRoutes);
router.use('/professionals', professionalRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/blog', blogRoutes);
router.use('/email', emailRoutes);
router.use('/admin', adminRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/applications', applicationRoutes);
router.use('/audit', auditRoutes);

export default router; 