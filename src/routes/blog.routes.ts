import { Router, Request, Response } from 'express';
import { BlogController } from '../controllers/blog.controller';
import { requireAuth, validateUser, requireRole } from '../middlewares/auth.middleware';
import { uploadMiddleware } from '../middlewares/upload.middleware';

const router = Router();
const blogController = new BlogController();

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
router.get('/', handlePublicRouteErrors(blogController.list));
router.get('/posts', handlePublicRouteErrors(blogController.list));
router.get('/posts/featured', handlePublicRouteErrors((req, res) => {
  req.query.featured = 'true';
  return blogController.list(req, res);
}));
router.get('/categories', handlePublicRouteErrors(blogController.listCategories));
router.get('/tags', handlePublicRouteErrors(blogController.listTags));
router.get('/slug/:slug', handlePublicRouteErrors(blogController.getBySlug));
router.get('/:id', handlePublicRouteErrors(blogController.getById));

// Rotas protegidas
router.use(requireAuth);
router.use(validateUser);

// Rotas que requerem autenticação
router.post('/', requireRole(['ADMIN', 'EDITOR']), uploadMiddleware('image', 1), blogController.create);
router.put('/:id', requireRole(['ADMIN', 'EDITOR']), uploadMiddleware('image', 1), blogController.update);
router.delete('/:id', requireRole(['ADMIN', 'EDITOR']), blogController.delete);

// Rotas de comentários
router.post('/:id/comments', requireRole(['USER']), blogController.addComment);
router.delete('/:id/comments/:commentId', requireRole(['USER', 'ADMIN']), blogController.deleteComment);

// Rotas de categorias
router.post('/categories', requireAuth, requireRole(['ADMIN']), blogController.createCategory);
router.get('/categories', blogController.listCategories);
router.get('/categories/:id', blogController.getCategoryById);
router.patch('/categories/:id', requireAuth, requireRole(['ADMIN']), blogController.updateCategory);
router.delete('/categories/:id', requireAuth, requireRole(['ADMIN']), blogController.deleteCategory);

// Comentários
router.post('/posts/:postId/comments', requireAuth, blogController.addComment);
router.get('/posts/:postId/comments', blogController.getCommentsByPostId);
router.delete('/comments/:id', requireAuth, blogController.removeComment);

// Rota para obter posts em rascunho (acesso administrativo)
router.get('/posts/drafts', requireAuth, blogController.getDraftPosts);

export default router; 