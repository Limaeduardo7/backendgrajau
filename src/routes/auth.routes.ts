import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRegister, validateLogin } from '../validators/auth.validator';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

// Definir rotas
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/status', authController.status);

// Adicionar novas rotas
router.post('/webhook', authController.webhook);
router.get('/me', requireAuth, authController.getMe);
router.patch('/profile', requireAuth, authController.updateProfile);

export default router; 