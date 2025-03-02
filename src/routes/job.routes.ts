import { Router, Request, Response } from 'express';
import { JobController } from '../controllers/job.controller';
import { requireAuth, validateUser, requireRole } from '../middlewares/auth.middleware';
import { uploadMiddleware } from '../middlewares/upload.middleware';

const router = Router();
const jobController = new JobController();

// Middleware para tratar erros nas rotas públicas
const handlePublicRouteErrors = (handler: (req: Request, res: Response) => Promise<any>) => 
  async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error('Erro na rota pública:', error);
      res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
  };

// Rotas públicas
router.get('/', handlePublicRouteErrors(jobController.list));
router.get('/search', handlePublicRouteErrors(jobController.list));
router.get('/:id', handlePublicRouteErrors(jobController.getById));

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