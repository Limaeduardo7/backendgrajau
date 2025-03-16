import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../lib/prisma';

const router = Router();

// Rota de teste básica
router.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Servidor está funcionando!' });
});

// Rota pública para criar posts
router.post('/blog/posts', async (req: Request, res: Response) => {
  logger.info('[PUBLIC API] Iniciando POST /blog/posts');
  try {
    const { title, content, categoryId } = req.body;
    
    if (!title || !content || !categoryId) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        categoryId,
        published: true
      }
    });

    logger.info('[PUBLIC API] Post criado com sucesso');
    return res.status(201).json(post);
  } catch (error) {
    logger.error('[PUBLIC API] Erro ao criar post:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota pública para listar posts
router.get('/blog/posts', async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      include: {
        author: true,
        category: true
      }
    });
    return res.json(posts);
  } catch (error) {
    logger.error('[PUBLIC API] Erro ao listar posts:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota pública para buscar post por ID
router.get('/blog/posts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        category: true
      }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }

    return res.json(post);
  } catch (error) {
    logger.error('[PUBLIC API] Erro ao buscar post:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 