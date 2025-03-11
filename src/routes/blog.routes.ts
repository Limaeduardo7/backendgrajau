import { Router, Request, Response, NextFunction } from 'express';
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
      res.status(500).json({ message: 'Erro interno do servidor', details: error.message });
    }
  };

// Rotas protegidas - devem vir ANTES das rotas com parâmetros
router.use(requireAuth);
router.use(validateUser);

// Rotas de posts que requerem autenticação
router.post('/posts', requireRole(['ADMIN', 'EDITOR']), uploadMiddleware('image', 1), blogController.create);
router.get('/posts/drafts', requireRole(['ADMIN', 'EDITOR']), blogController.getDraftPosts);
router.put('/posts/:id', requireRole(['ADMIN', 'EDITOR']), uploadMiddleware('image', 1), blogController.update);
router.delete('/posts/:id', requireRole(['ADMIN', 'EDITOR']), blogController.delete);

// Rotas para publicação e destaque
router.put('/posts/:id/publish', requireRole(['ADMIN', 'EDITOR']), blogController.publishPost);
router.put('/posts/:id/unpublish', requireRole(['ADMIN', 'EDITOR']), blogController.unpublishPost);
router.put('/posts/:id/feature', requireRole(['ADMIN']), blogController.featurePost);
router.put('/posts/:id/unfeature', requireRole(['ADMIN']), blogController.unfeaturePost);

// Rotas de categorias protegidas
router.post('/categories', requireRole(['ADMIN']), blogController.createCategory);
router.put('/categories/:id', requireRole(['ADMIN']), blogController.updateCategory);
router.delete('/categories/:id', requireRole(['ADMIN']), blogController.deleteCategory);

// Rotas de comentários protegidas
router.post('/posts/:id/comments', blogController.addComment);
router.delete('/posts/:id/comments/:commentId', requireRole(['USER', 'ADMIN']), blogController.deleteComment);
router.put('/posts/:postId/comments/:commentId/approve', requireRole(['ADMIN']), blogController.approveComment);
router.put('/posts/:postId/comments/:commentId/reject', requireRole(['ADMIN']), blogController.rejectComment);

// Rota para upload de imagens
router.post('/upload', requireRole(['ADMIN', 'EDITOR']), uploadMiddleware('image', 1), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }
  
  const imageUrl = `/uploads/${req.file.filename}`;
  return res.status(201).json({ url: imageUrl });
});

// Rotas públicas - devem vir DEPOIS das rotas protegidas
router.get('/', handlePublicRouteErrors(blogController.list));
router.get('/stats', handlePublicRouteErrors(blogController.getBlogStats));

// Posts - rotas públicas
router.get('/posts', handlePublicRouteErrors(blogController.list));
router.get('/posts/all', handlePublicRouteErrors(blogController.getAllPosts));
router.get('/posts/featured', handlePublicRouteErrors((req, res) => {
  req.query.featured = 'true';
  return blogController.list(req, res);
}));
router.get('/posts/published', handlePublicRouteErrors(blogController.getPublishedPosts));
router.get('/posts/slug/:slug', handlePublicRouteErrors(blogController.getBySlug));
router.get('/posts/:id', handlePublicRouteErrors(blogController.getById));

// Categorias - rotas públicas
router.get('/categories', handlePublicRouteErrors(blogController.listCategories));
router.get('/categories/:id', handlePublicRouteErrors(blogController.getCategoryById));

// Tags - rotas públicas
router.get('/tags', handlePublicRouteErrors(blogController.listTags));

// Comentários - rotas públicas
router.get('/posts/:postId/comments', handlePublicRouteErrors(blogController.getCommentsByPostId));

export default router; 