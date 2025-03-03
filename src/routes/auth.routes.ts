import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

// Rota de registro
router.post('/register', authController.register);

// Rota para verificar status de autenticação
router.get('/status', authController.status);

export default router; 