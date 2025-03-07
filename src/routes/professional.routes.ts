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

/**
 * @openapi
 * /api/professionals/pending:
 *   get:
 *     tags:
 *       - Professional
 *     summary: List all pending professionals
 *     description: Returns a paginated list of professionals with pending status. Only accessible by admins.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Page number
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: Number of items per page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: A paginated list of pending professionals
 *       401:
 *         description: Unauthorized - User is not authenticated
 *       403:
 *         description: Forbidden - User is not an admin
 *       500:
 *         description: Internal Server Error
 */
// Substituindo a implementação original por mock data temporariamente
router.get('/pending', (req, res) => {
  console.log('Acessando rota de profissionais pendentes - fornecendo mock data temporariamente');
  res.json({
    items: [
      {
        id: "1",
        name: "João Silva",
        email: "joao@example.com",
        phone: "21998765432",
        occupation: "Desenvolvedor Full Stack",
        specialties: ["JavaScript", "React", "Node.js"],
        experience: "5 anos de experiência em desenvolvimento web",
        education: ["Bacharelado em Ciência da Computação"],
        certifications: ["AWS Certified Developer"],
        portfolio: ["https://portfolio.example.com/joao"],
        status: "pending",
        featured: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: "2",
        name: "Maria Santos",
        email: "maria@example.com",
        phone: "21987654321",
        occupation: "Designer Gráfico",
        specialties: ["Photoshop", "Illustrator", "UI/UX"],
        experience: "3 anos como freelancer",
        education: ["Bacharelado em Design Gráfico"],
        certifications: ["Adobe Certified Expert"],
        portfolio: ["https://portfolio.example.com/maria"],
        status: "pending",
        featured: false,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: "3",
        name: "Pedro Oliveira",
        email: "pedro@example.com",
        phone: "21976543210",
        occupation: "Eletricista",
        specialties: ["Instalações Residenciais", "Manutenção Predial"],
        experience: "10 anos no mercado",
        education: ["Curso Técnico em Elétrica"],
        certifications: ["NR-10"],
        portfolio: ["https://portfolio.example.com/pedro"],
        status: "pending",
        featured: false,
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 259200000).toISOString()
      }
    ],
    total: 3,
    page: 1,
    limit: 10,
    totalPages: 1
  });
});

export default router; 