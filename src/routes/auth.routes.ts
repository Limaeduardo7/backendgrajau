import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRegister, validateLogin } from '../validators/auth.validator';
import { requireAuth } from '../middlewares/auth.middleware';
import tokenController from '../controllers/token.controller';

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

// Rotas de gerenciamento de tokens
router.post('/renew-token', requireAuth, tokenController.renewToken);
router.post('/revoke-token', requireAuth, tokenController.revokeToken);
router.get('/validate-token', requireAuth, tokenController.validateToken);

export default router; 