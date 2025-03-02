import { Router, Request, Response } from 'express';
import { ProfessionalController } from '../controllers/professional.controller';
import { requireAuth, validateUser, requireRole } from '../middlewares/auth.middleware';
import uploadMiddleware from '../middlewares/uploadMiddleware';

const router = Router();
const professionalController = new ProfessionalController();

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
router.get('/', handlePublicRouteErrors(professionalController.list));
router.get('/:id', handlePublicRouteErrors(professionalController.getById));

// Rotas protegidas
router.use(requireAuth);
router.use(validateUser);

// Rotas que requerem autenticação
router.post('/', requireRole(['USER']), professionalController.create);
router.put('/:id', requireRole(['USER', 'PROFESSIONAL']), professionalController.update);
router.delete('/:id', requireRole(['USER', 'PROFESSIONAL', 'ADMIN']), professionalController.delete);
router.patch('/:id/status', requireRole(['ADMIN']), professionalController.updateStatus);
router.post('/:id/portfolio', requireRole(['USER', 'PROFESSIONAL']), uploadMiddleware.array('portfolio', 10), professionalController.addPortfolio);
router.delete('/:id/portfolio/:itemIndex', requireRole(['USER', 'PROFESSIONAL']), professionalController.removePortfolioItem);
router.get('/me/applications', requireRole(['USER', 'PROFESSIONAL']), professionalController.listApplications);

export default router; 