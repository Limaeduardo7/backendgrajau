import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRegister, validateLogin } from '../validators/auth.validator';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

// Definir rotas
// Temporariamente removido o middleware de validação para diagnóstico
router.post('/register', authController.register); // validateRegister removido
router.post('/login', validateLogin, authController.login);
router.get('/status', authController.status);

// Adicionar novas rotas
router.post('/webhook', authController.webhook);
router.get('/me', requireAuth, authController.getMe);
router.patch('/profile', requireAuth, authController.updateProfile);

export default router; 