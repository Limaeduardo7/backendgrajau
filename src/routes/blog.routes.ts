import { Router, Request, Response, NextFunction } from 'express';
import { BlogController } from '../controllers/blog.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { uploadMiddleware } from '../middlewares/upload.middleware';
import logger from '../config/logger';
import { Role } from '@prisma/client';

const router = Router();
const blogController = new BlogController();

// Rotas públicas
router.get('/', blogController.list);
router.get('/stats', blogController.getBlogStats);

// Posts - rotas públicas
router.get('/posts', blogController.list);
router.get('/posts/all', blogController.getAllPosts);
router.get('/posts/featured', (req, res) => {
  req.query.featured = 'true';
  return blogController.list(req, res);
});
router.get('/posts/published', blogController.getPublishedPosts);
router.get('/posts/slug/:slug', blogController.getBySlug);
router.get('/posts/:id', blogController.getById);

// Categorias - rotas públicas
router.get('/categories', blogController.listCategories);
router.get('/categories/:id', blogController.getCategoryById);

// Tags - rotas públicas
router.get('/tags', blogController.listTags);

// Comentários - rotas públicas
router.get('/posts/:postId/comments', blogController.getCommentsByPostId);

// Middleware de autenticação para rotas protegidas
router.use((req: Request, res: Response, next: NextFunction) => {
  logger.debug(`[Blog Routes] Requisição recebida: ${req.method} ${req.path}`);
  logger.debug(`[Blog Routes] Headers:`, req.headers);
  next();
});

router.use(requireAuth);

// Rotas de posts que requerem autenticação
router.post('/posts', (req: Request, res: Response) => {
  logger.debug('[Blog Routes] Requisição POST /posts recebida');
  logger.debug('[Blog Routes] User:', req.user);
  logger.debug('[Blog Routes] Body:', req.body);
  return blogController.create(req, res);
});

router.get('/posts/drafts', requireAuth, requireRole([Role.ADMIN]), blogController.getDraftPosts);
router.put('/posts/:id', requireAuth, requireRole([Role.ADMIN]), uploadMiddleware('image', 1), blogController.update);
router.delete('/posts/:id', requireAuth, requireRole([Role.ADMIN]), blogController.delete);

// Rotas para publicação e destaque
router.put('/posts/:id/publish', requireAuth, requireRole([Role.ADMIN]), blogController.publishPost);
router.put('/posts/:id/unpublish', requireAuth, requireRole([Role.ADMIN]), blogController.unpublishPost);
router.put('/posts/:id/feature', requireAuth, requireRole([Role.ADMIN]), blogController.featurePost);
router.put('/posts/:id/unfeature', requireAuth, requireRole([Role.ADMIN]), blogController.unfeaturePost);

// Rotas de categorias protegidas
router.post('/categories', requireAuth, requireRole([Role.ADMIN]), blogController.createCategory);
router.put('/categories/:id', requireAuth, requireRole([Role.ADMIN]), blogController.updateCategory);
router.delete('/categories/:id', requireAuth, requireRole([Role.ADMIN]), blogController.deleteCategory);

// Rotas de comentários
router.post('/posts/:id/comments', requireAuth, blogController.addComment);
router.delete('/posts/:id/comments/:commentId', requireAuth, requireRole([Role.USER, Role.ADMIN]), blogController.deleteComment);
router.put('/posts/:postId/comments/:commentId/approve', requireAuth, requireRole([Role.ADMIN]), blogController.approveComment);
router.put('/posts/:postId/comments/:commentId/reject', requireAuth, requireRole([Role.ADMIN]), blogController.rejectComment);

// Rota para upload de imagens
router.post('/upload', requireAuth, requireRole([Role.ADMIN]), uploadMiddleware('image', 1), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }
  
  const imageUrl = `/uploads/${req.file.filename}`;
  return res.status(201).json({ url: imageUrl });
});

// Rota alternativa para posts - sem autenticação e multer
router.post('/posts-alt', (req: Request, res: Response) => {
  logger.debug('[Blog Routes] Requisição POST /posts-alt recebida');
  logger.debug('[Blog Routes] Headers:', req.headers);
  logger.debug('[Blog Routes] Body:', req.body);
  return res.status(200).json({ 
    message: 'Rota alternativa de posts funcionando corretamente',
    receivedData: {
      headers: req.headers,
      body: req.body
    }
  });
});

// Definir uma terceira rota com upload em endpoint diferente
router.post('/posts-upload', requireAuth, requireRole([Role.ADMIN]), uploadMiddleware('image', 1), (req: Request, res: Response) => {
  logger.debug('[Blog Routes] Requisição POST /posts-upload recebida');
  logger.debug('[Blog Routes] User:', req.user);
  logger.debug('[Blog Routes] Body:', req.body);
  logger.debug('[Blog Routes] File:', req.file);
  return blogController.create(req, res);
});

export default router; 