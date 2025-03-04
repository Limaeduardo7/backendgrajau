import { Request, Response } from 'express';
import { BlogService } from '../services/blog.service';
import { ApiError } from '../utils/ApiError';

// Definindo uma interface para estender o Request
interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: string;
    email: string;
  };
}

export class BlogController {
  private blogService: BlogService;

  constructor() {
    this.blogService = new BlogService();
  }

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
      const data = req.body;
      const userId = req.user?.id;
      const image = req.file;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const post = await this.blogService.create({
        ...data,
        image: image?.filename,
        authorId: userId,
      });
      res.status(201).json(post);
    } catch (error) {
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
} 