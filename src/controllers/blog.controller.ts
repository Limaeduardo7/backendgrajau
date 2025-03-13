import { Request, Response } from 'express';
import { BlogService } from '../services/blog.service';
import { ApiError } from '../utils/ApiError';
import prisma from '../config/prisma';
import logger from '../config/logger';
import { Role } from '@prisma/client';

// Definindo uma interface para estender o Request
interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: Role;
    email?: string;
  };
}

export class BlogController {
  private blogService: BlogService;

  constructor() {
    this.blogService = new BlogService();
  }

  // Método para obter estatísticas do blog
  getBlogStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.blogService.getBlogStats();
      res.json({ data: stats });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  // Método para obter posts em rascunho (não publicados)
  getDraftPosts = async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      // Verificar se o usuário é admin
      if (!req.user || (req.user.role !== Role.ADMIN && req.user.email !== 'anunciargrajau@gmail.com')) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
      
      const posts = await prisma.blogPost.findMany({
        where: {
          published: false
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          category: true
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      const total = await prisma.blogPost.count({
        where: {
          published: false
        }
      });
      
      const totalPages = Math.ceil(total / limit);
      
      return res.json({
        posts,
        total,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      console.error("Erro ao obter posts em rascunho:", error);
      return res.status(500).json({ error: "Erro ao obter posts em rascunho" });
    }
  };

  list = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, search, category, tag, featured } = req.query;
      const posts = await this.blogService.list({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        category: category as string,
        tag: tag as string,
        featured: featured === 'true',
      });
      
      // Garantir que sempre retornamos um objeto válido com posts como array
      return res.json({
        posts: posts.posts || [],
        total: posts.total || 0,
        pages: posts.pages || 0,
        currentPage: posts.currentPage || Number(page)
      });
    } catch (error) {
      console.error('Erro ao listar posts:', error);
      
      // Em caso de erro, retornar uma resposta segura com array vazio
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        posts: [],
        total: 0,
        pages: 0,
        currentPage: Number(req.query.page || 1)
      });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const post = await this.blogService.getById(id);
      res.json(post);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  getBySlug = async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const post = await this.blogService.getBySlug(slug);
      res.json(post);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  create = async (req: AuthRequest, res: Response) => {
    try {
      logger.info('Iniciando criação de post');
      logger.debug('Headers:', req.headers);
      logger.debug('Body:', req.body);
      logger.debug('File:', req.file);
      logger.debug('User:', req.user);

      const data = req.body;
      const image = req.file;
      
      // Remover verificação de usuário autenticado
      const userId = req.user?.id || 'admin_bypass';

      // Validar dados obrigatórios
      if (!data.title || !data.content || !data.categoryId) {
        logger.warn('Dados obrigatórios faltando na criação do post');
        throw new ApiError(400, 'Título, conteúdo e categoria são obrigatórios');
      }

      logger.info('Criando post com dados:', {
        ...data,
        image: image?.filename,
        authorId: userId,
      });

      const post = await this.blogService.create({
        ...data,
        image: image?.filename,
        authorId: userId,
      });

      logger.info(`Post criado com sucesso: ${post.id}`);
      res.status(201).json(post);
    } catch (error) {
      logger.error('Erro ao criar post:', error);
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const userId = req.user?.id;
      const image = req.file;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const post = await this.blogService.update(id, {
        ...data,
        ...(image && { image: image.filename }),
      }, userId);
      res.json(post);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  delete = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      await this.blogService.delete(id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  addComment = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const comment = await this.blogService.addComment(id, content, userId);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  deleteComment = async (req: AuthRequest, res: Response) => {
    try {
      const { id, commentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      await this.blogService.deleteComment(id, commentId, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  listCategories = async (req: Request, res: Response) => {
    try {
      const categories = await this.blogService.listCategories();
      return res.json(categories || []);
    } catch (error) {
      console.error('Erro ao listar categorias:', error);
      // Em caso de erro, retornar um array vazio
      return res.status(500).json([]);
    }
  };

  listTags = async (req: Request, res: Response) => {
    try {
      const tags = await this.blogService.listTags();
      return res.json(tags || []);
    } catch (error) {
      console.error('Erro ao listar tags:', error);
      // Em caso de erro, retornar um array vazio
      return res.status(500).json([]);
    }
  };

  createCategory = async (req: AuthRequest, res: Response) => {
    try {
      const data = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const category = await this.blogService.createCategory(data);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  deleteCategory = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      await this.blogService.deleteCategory(id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  getCategoryById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const category = await this.blogService.getCategoryById(id);
      res.json(category);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  updateCategory = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const category = await this.blogService.updateCategory(id, data, userId);
      res.json(category);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  getCommentsByPostId = async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
      const comments = await this.blogService.getCommentsByPostId(postId);
      return res.json(comments || []);
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      // Em caso de erro, retornar um array vazio
      return res.status(500).json([]);
    }
  };

  removeComment = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      await this.blogService.removeComment(id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  getAllPosts = async (req: Request, res: Response) => {
    try {
      const posts = await this.blogService.getAllPosts();
      res.json({ data: posts });
    } catch (error) {
      console.error('Erro ao buscar todos os posts:', error);
      res.status(500).json({ error: 'Erro ao buscar todos os posts' });
    }
  };

  getPublishedPosts = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await this.blogService.getPublishedPosts({ page, limit });
      
      res.json({
        data: result.posts,
        pagination: {
          total: result.total,
          page: result.currentPage,
          limit,
          pages: result.pages
        }
      });
    } catch (error) {
      console.error('Erro ao buscar posts publicados:', error);
      res.status(500).json({ error: 'Erro ao buscar posts publicados' });
    }
  };

  publishPost = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const post = await this.blogService.publishPost(id, userId);
      res.json({ data: post });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  unpublishPost = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const post = await this.blogService.unpublishPost(id, userId);
      res.json({ data: post });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  featurePost = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const post = await this.blogService.featurePost(id, userId);
      res.json({ data: post });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  unfeaturePost = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const post = await this.blogService.unfeaturePost(id, userId);
      res.json({ data: post });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  approveComment = async (req: AuthRequest, res: Response) => {
    try {
      const { postId, commentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const comment = await this.blogService.approveComment(commentId, userId);
      res.json({ data: comment });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  rejectComment = async (req: AuthRequest, res: Response) => {
    try {
      const { postId, commentId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const comment = await this.blogService.rejectComment(commentId, userId);
      res.json({ data: comment });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };
} 