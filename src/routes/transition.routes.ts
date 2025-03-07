import { Router, Request, Response } from 'express';
import { BusinessController } from '../controllers/business.controller';
import { ProfessionalController } from '../controllers/professional.controller';
import { BlogController } from '../controllers/blog.controller';

const router = Router();
const businessController = new BusinessController();
const professionalController = new ProfessionalController();
const blogController = new BlogController();

// Middleware para bypass temporário de autenticação
// IMPORTANTE: Isso é apenas uma solução temporária até que o frontend seja atualizado
const bypassAuth = (req: Request, res: Response, next: Function) => {
  console.log('Bypass temporário de autenticação aplicado para compatibilidade');
  req.user = {
    id: 'admin_bypass',
    clerkId: 'admin_bypass',
    role: 'ADMIN',
    email: 'admin@example.com'
  };
  next();
};

// Rotas temporárias para empresas pendentes
router.get('/businesses/pending', (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /businesses/pending');
  res.json({
    items: [],
    total: 0,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
    totalPages: 0
  });
});

// Rotas temporárias para profissionais pendentes
router.get('/professionals/pending', (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /professionals/pending');
  res.json({
    items: [],
    total: 0,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 10,
    totalPages: 0
  });
});

// Rota temporária para posts em rascunho
router.get('/blog/posts/drafts', bypassAuth, (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /blog/posts/drafts');
  return blogController.getDraftPosts(req, res);
});

// Rota temporária para posts publicados
router.get('/blog/posts/published', (req: Request, res: Response) => {
  console.log('Acessando rota de transição: /blog/posts/published');
  req.query.published = 'true';
  return blogController.list(req, res);
});

export default router; 