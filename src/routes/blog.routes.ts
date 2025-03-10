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

// Rotas públicas
router.get('/', handlePublicRouteErrors(blogController.list));
router.get('/stats', handlePublicRouteErrors(blogController.getBlogStats));

// Posts - rotas específicas antes de rotas com parâmetros
router.get('/posts', handlePublicRouteErrors(blogController.list));
router.get('/posts/all', handlePublicRouteErrors(blogController.getAllPosts));
router.get('/posts/featured', handlePublicRouteErrors((req, res) => {
  req.query.featured = 'true';
  return blogController.list(req, res);
}));
router.get('/posts/published', handlePublicRouteErrors(blogController.getPublishedPosts));
router.get('/posts/slug/:slug', handlePublicRouteErrors(blogController.getBySlug));
router.get('/posts/:id', handlePublicRouteErrors(blogController.getById));

// Categorias
router.get('/categories', handlePublicRouteErrors(blogController.listCategories));
router.get('/categories/:id', handlePublicRouteErrors(blogController.getCategoryById));

// Tags
router.get('/tags', handlePublicRouteErrors(blogController.listTags));

// Comentários - listar comentários de um post (público)
router.get('/posts/:postId/comments', handlePublicRouteErrors(blogController.getCommentsByPostId));

// Rotas protegidas
router.use(requireAuth);
router.use(validateUser);

// Rotas de posts que requerem autenticação - rotas específicas antes de rotas com parâmetros
router.get('/posts/drafts', requireRole(['ADMIN', 'EDITOR']), blogController.getDraftPosts);
router.post('/posts', requireRole(['ADMIN', 'EDITOR']), uploadMiddleware('image', 1), blogController.create);
router.put('/posts/:id', requireRole(['ADMIN', 'EDITOR']), uploadMiddleware('image', 1), blogController.update);
router.delete('/posts/:id', requireRole(['ADMIN', 'EDITOR']), blogController.delete);

// Novas rotas para publicação, destaque etc.
router.put('/posts/:id/publish', requireRole(['ADMIN', 'EDITOR']), blogController.publishPost);
router.put('/posts/:id/unpublish', requireRole(['ADMIN', 'EDITOR']), blogController.unpublishPost);
router.put('/posts/:id/feature', requireRole(['ADMIN']), blogController.featurePost);
router.put('/posts/:id/unfeature', requireRole(['ADMIN']), blogController.unfeaturePost);

// Rotas de categorias
router.post('/categories', requireRole(['ADMIN']), blogController.createCategory);
router.put('/categories/:id', requireRole(['ADMIN']), blogController.updateCategory);
router.delete('/categories/:id', requireRole(['ADMIN']), blogController.deleteCategory);

// Rotas de comentários
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

export default router; 