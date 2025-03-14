import { Router, Request, Response } from 'express';
import { BlogController } from '../controllers/blog.controller';
import { uploadMiddleware } from '../middlewares/upload.middleware';
import logger from '../config/logger';

const router = Router();
const blogController = new BlogController();

// Rotas de posts
router.get('/', blogController.list);
router.get('/stats', blogController.getBlogStats);
router.get('/posts', blogController.list);
router.get('/posts/all', blogController.getAllPosts);
router.get('/posts/featured', (req, res) => {
  req.query.featured = 'true';
  return blogController.list(req, res);
});
router.get('/posts/published', blogController.getPublishedPosts);
router.get('/posts/drafts', blogController.getDraftPosts);
router.get('/posts/slug/:slug', blogController.getBySlug);
router.get('/posts/:id', blogController.getById);
router.post('/posts', blogController.create);
router.put('/posts/:id', uploadMiddleware('image', 1), blogController.update);
router.delete('/posts/:id', blogController.delete);

// Rotas para publicação e destaque
router.put('/posts/:id/publish', blogController.publishPost);
router.put('/posts/:id/unpublish', blogController.unpublishPost);
router.put('/posts/:id/feature', blogController.featurePost);
router.put('/posts/:id/unfeature', blogController.unfeaturePost);

// Rotas de categorias
router.get('/categories', blogController.listCategories);
router.get('/categories/:id', blogController.getCategoryById);
router.post('/categories', blogController.createCategory);
router.put('/categories/:id', blogController.updateCategory);
router.delete('/categories/:id', blogController.deleteCategory);

// Rotas de tags
router.get('/tags', blogController.listTags);

// Rotas de comentários
router.get('/posts/:postId/comments', blogController.getCommentsByPostId);
router.post('/posts/:id/comments', blogController.addComment);
router.delete('/posts/:id/comments/:commentId', blogController.deleteComment);
router.put('/posts/:postId/comments/:commentId/approve', blogController.approveComment);
router.put('/posts/:postId/comments/:commentId/reject', blogController.rejectComment);

// Rota para upload de imagens
router.post('/upload', uploadMiddleware('image', 1), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  }
  
  const imageUrl = `/uploads/${req.file.filename}`;
  return res.status(201).json({ url: imageUrl });
});

// Rota de debug para posts
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

// Rota alternativa com upload
router.post('/posts-upload', uploadMiddleware('image', 1), (req: Request, res: Response) => {
  logger.debug('[Blog Routes] Requisição POST /posts-upload recebida');
  logger.debug('[Blog Routes] Body:', req.body);
  logger.debug('[Blog Routes] File:', req.file);
  return blogController.create(req, res);
});

export default router; 