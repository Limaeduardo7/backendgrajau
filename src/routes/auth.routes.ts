import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRegister, validateLogin } from '../validators/auth.validator';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
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

// Validação de token
router.get('/validate-token', requireAuth, tokenController.validateToken);

// Rota para geração de tokens de recuperação (apenas para administradores)
router.post('/recovery-token', requireAuth, requireRole(['ADMIN']), authController.generateRecoveryToken);

// Rota para verificação e correção de problemas de autenticação (endpoint público)
router.post('/check-auth', authController.checkAuthProblems);

export default router; 