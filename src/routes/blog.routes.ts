import { Router } from 'express';
import { BlogController } from '../controllers/blog.controller';
import { requireAuth, validateUser, requireRole } from '../middlewares/auth.middleware';
import { uploadMiddleware } from '../middlewares/upload.middleware';

const router = Router();
const blogController = new BlogController();

// Rotas públicas
router.get('/', blogController.list);
router.get('/posts/featured', blogController.list);
router.get('/:id', blogController.getById);
router.get('/slug/:slug', blogController.getBySlug);
router.get('/categories', blogController.listCategories);

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

export default router; 