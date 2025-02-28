import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { requireAuth, validateUser, requireRole } from '../middlewares/auth.middleware';

const router = Router();
const emailController = new EmailController();

// Rota protegida apenas para administradores
router.post('/test', requireAuth, validateUser, requireRole(['ADMIN']), emailController.testEmail);

export default router; 