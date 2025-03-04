import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRegister } from '../validators/auth.validator';

const router = Router();
const authController = new AuthController();

// Definir rotas
router.post('/register', validateRegister, authController.register);
router.post('/login', authController.login);
router.get('/status', authController.status);

export default router; 