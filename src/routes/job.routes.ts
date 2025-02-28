import { Router } from 'express';
import { JobController } from '../controllers/job.controller';
import { requireAuth, validateUser, requireRole } from '../middlewares/auth.middleware';
import { uploadMiddleware } from '../middlewares/upload.middleware';

const router = Router();
const jobController = new JobController();

// Rotas públicas
router.get('/', jobController.list);
router.get('/:id', jobController.getById);

// Rotas protegidas
router.use(requireAuth);
router.use(validateUser);

// Rotas que requerem autenticação
router.post('/business/:businessId', requireRole(['USER', 'BUSINESS']), jobController.create);
router.put('/:id', requireRole(['USER', 'BUSINESS']), jobController.update);
router.delete('/:id', requireRole(['USER', 'BUSINESS', 'ADMIN']), jobController.delete);
router.post('/:id/apply', requireRole(['USER', 'PROFESSIONAL']), uploadMiddleware('resume', 1), jobController.apply);
router.patch('/:id/status', requireRole(['ADMIN']), jobController.updateStatus);
router.get('/:id/applications', requireRole(['USER', 'BUSINESS']), jobController.listApplications);

export default router; 