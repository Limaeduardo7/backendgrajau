import { BlogPost, Category, Comment, Prisma, PrismaClient } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { unlinkSync } from 'fs';
import { join } from 'path';
import slugify from 'slugify';
import { withRetry } from '../utils/retryHandler';
import logger from '../config/logger';
import { Role } from '@prisma/client';

interface ListPostsParams {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  tag?: string;
  featured?: boolean;
}

export class BlogService {
  async list({ page = 1, limit = 10, search, category, tag, featured }: ListPostsParams) {
    const skip = (page - 1) * limit;

    const where: any = {
      published: true,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { content: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
      ];
    }

    if (category) {
      where.categoryId = category;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (featured) {
      where.featured = { equals: true } as any;
    }

    try {
      // Usar o mecanismo de retry para buscar os posts
      const [posts, total] = await withRetry(
        async () => {
          return Promise.all([
            prisma.blogPost.findMany({
              where,
              include: {
                author: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
                category: true,
              } as Prisma.BlogPostInclude,
              skip,
              take: limit,
              orderBy: { publishedAt: 'desc' },
            }),
            prisma.blogPost.count({ where }),
          ]);
        },
        {
          maxRetries: 3,
          initialDelay: 500,
          backoffFactor: 2,
          onRetry: (error, attempt) => {
            logger.warn(`Erro ao buscar posts do blog (tentativa ${attempt}): ${error.message}`);
          },
        }
      );

      return {
        posts: posts || [],
        total: total || 0,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error: any) {
      logger.error(`Falha ao buscar posts do blog: ${error.message}`);
      // Em caso de erro, retornamos um objeto com valores padrão seguros
      return {
        posts: [],
        total: 0,
        pages: 0,
        currentPage: page,
      };
    }
  }

  async getById(id: string) {
    try {
      const post = await withRetry(
        async () => {
          return prisma.blogPost.findUnique({
            where: { id },
            include: {
              author: {
                select: {
                  name: true,
                  email: true,
                },
              },
              category: true,
              comments: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          });
        },
        {
          maxRetries: 3,
          initialDelay: 500,
          backoffFactor: 2,
          onRetry: (error, attempt) => {
            logger.warn(`Erro ao buscar post por ID ${id} (tentativa ${attempt}): ${error.message}`);
          },
        }
      );

      if (!post) {
        throw new ApiError(404, 'Post não encontrado');
      }

      return post;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Falha ao buscar post por ID ${id}: ${error.message}`);
      throw new ApiError(500, 'Erro ao buscar post');
    }
  }

  async getBySlug(slug: string) {
    try {
      const post = await withRetry(
        async () => {
          return prisma.blogPost.findUnique({
            where: { slug },
            include: {
              author: {
                select: {
                  name: true,
                  email: true,
                },
              },
              category: true,
              comments: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          });
        },
        {
          maxRetries: 3,
          initialDelay: 500,
          backoffFactor: 2,
          onRetry: (error, attempt) => {
            logger.warn(`Erro ao buscar post por slug ${slug} (tentativa ${attempt}): ${error.message}`);
          },
        }
      );

      if (!post) {
        throw new ApiError(404, 'Post não encontrado');
      }

      return post;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Falha ao buscar post por slug ${slug}: ${error.message}`);
      throw new ApiError(500, 'Erro ao buscar post');
    }
  }

  async create(data: any) {
    const slug = slugify(data.title, { lower: true });

    const existingPost = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (existingPost) {
      throw new ApiError(400, 'Já existe um post com este título');
    }

    return prisma.blogPost.create({
      data: {
        ...data,
        slug,
        publishedAt: data.published ? new Date() : null,
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
      },
    });
  }

  async update(id: string, data: any, userId: string) {
    const post = await this.getById(id);

    if (post.authorId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== Role.ADMIN) {
        throw new ApiError(403, 'Você não tem permissão para atualizar este post');
      }
    }

    if (data.title) {
      const slug = slugify(data.title, { lower: true });
      const existingPost = await prisma.blogPost.findFirst({
        where: { slug, NOT: { id } },
      });

      if (existingPost) {
        throw new ApiError(400, 'Já existe um post com este título');
      }

      data.slug = slug;
    }

    if (data.published && !post.published) {
      data.publishedAt = new Date();
    }

    if (data.image && post.image) {
      try {
        unlinkSync(join(__dirname, '../../uploads', post.image));
      } catch (error) {
        console.error(`Erro ao deletar imagem ${post.image}:`, error);
      }
    }

    return prisma.blogPost.update({
      where: { id },
      data,
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
      },
    });
  }

  async delete(id: string, userId: string) {
    const post = await this.getById(id);

    if (post.authorId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== Role.ADMIN) {
        throw new ApiError(403, 'Você não tem permissão para deletar este post');
      }
    }

    if (post.image) {
      try {
        unlinkSync(join(__dirname, '../../uploads', post.image));
      } catch (error) {
        console.error(`Erro ao deletar imagem ${post.image}:`, error);
      }
    }

    await prisma.blogPost.delete({ where: { id } });
  }

  async addComment(postId: string, content: string, userId: string) {
    return prisma.comment.create({
      data: {
        content,
        postId,
        userId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteComment(postId: string, commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new ApiError(404, 'Comentário não encontrado');
    }

    if (comment.userId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== Role.ADMIN) {
        throw new ApiError(403, 'Você não tem permissão para deletar este comentário');
      }
    }

    await prisma.comment.delete({ where: { id: commentId } });
  }

  async listCategories() {
    try {
      return await prisma.category.findMany({
        orderBy: {
          name: 'asc',
        },
      });
    } catch (error) {
      logger.error('Erro ao listar categorias:', error);
      // Em caso de erro, retornamos um array vazio em vez de lançar uma exceção
      return [];
    }
  }

  async getCategoryById(id: string) {
    try {
      const category = await withRetry(
        async () => {
          return prisma.category.findUnique({
            where: { id },
            include: {
              posts: {
                where: { published: true },
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  publishedAt: true,
                },
              },
            },
          });
        },
        {
          maxRetries: 3,
          initialDelay: 500,
          backoffFactor: 2,
          onRetry: (error, attempt) => {
            logger.warn(`Erro ao buscar categoria por ID ${id} (tentativa ${attempt}): ${error.message}`);
          },
        }
      );

      if (!category) {
        throw new ApiError(404, 'Categoria não encontrada');
      }

      return category;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Falha ao buscar categoria por ID ${id}: ${error.message}`);
      throw new ApiError(500, 'Erro ao buscar categoria');
    }
  }

  async createCategory(data: any) {
    const slug = slugify(data.name, { lower: true });

    const existingCategory = await prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      throw new ApiError(400, 'Já existe uma categoria com este nome');
    }

    return prisma.category.create({
      data: {
        ...data,
        slug,
      },
    });
  }

  async updateCategory(id: string, data: any, userId: string) {
    const category = await this.getCategoryById(id);
    
    // Verificar se o usuário é admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.ADMIN) {
      throw new ApiError(403, 'Você não tem permissão para atualizar esta categoria');
    }

    if (data.name) {
      const slug = slugify(data.name, { lower: true });
      const existingCategory = await prisma.category.findFirst({
        where: { slug, NOT: { id } },
      });

      if (existingCategory) {
        throw new ApiError(400, 'Já existe uma categoria com este nome');
      }

      data.slug = slug;
    }

    return prisma.category.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string, userId: string) {
    const category = await this.getCategoryById(id);
    
    // Verificar se o usuário é admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.ADMIN) {
      throw new ApiError(403, 'Você não tem permissão para deletar esta categoria');
    }

    // Verificar se existem posts usando esta categoria
    const postsCount = await prisma.blogPost.count({
      where: { categoryId: id },
    });

    if (postsCount > 0) {
      throw new ApiError(400, 'Não é possível excluir uma categoria que possui posts associados');
    }

    await prisma.category.delete({ where: { id } });
  }

  async getCommentsByPostId(postId: string) {
    try {
      const post = await prisma.blogPost.findUnique({
        where: { id: postId },
      });

      if (!post) {
        logger.warn(`Post não encontrado ao buscar comentários: ${postId}`);
        return [];
      }

      const comments = await prisma.comment.findMany({
        where: { postId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return comments;
    } catch (error) {
      logger.error(`Erro ao buscar comentários do post ${postId}:`, error);
      // Em caso de erro, retornamos um array vazio em vez de lançar uma exceção
      return [];
    }
  }

  async removeComment(id: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new ApiError(404, 'Comentário não encontrado');
    }

    // Verificar se o usuário é o autor do comentário ou um admin
    if (comment.userId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== Role.ADMIN) {
        throw new ApiError(403, 'Você não tem permissão para excluir este comentário');
      }
    }

    await prisma.comment.delete({ where: { id } });
  }

  async listTags() {
    try {
      // Buscar todos os posts e extrair as tags
      const posts = await prisma.blogPost.findMany({
        select: {
          tags: true,
        },
      });
      
      // Extrair todas as tags e remover duplicatas
      const allTags = posts.flatMap(post => post.tags);
      const uniqueTags = [...new Set(allTags)].sort();
      
      return uniqueTags.map(tag => ({ name: tag }));
    } catch (error) {
      logger.error('Erro ao listar tags:', error);
      // Em caso de erro, retornamos um array vazio em vez de lançar uma exceção
      return [];
    }
  }

  async getAllPosts() {
    try {
      const posts = await prisma.blogPost.findMany({
        where: { published: true },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          category: true,
        },
        orderBy: { publishedAt: 'desc' },
      });

      return posts;
    } catch (error: any) {
      logger.error(`Falha ao buscar todos os posts: ${error.message}`);
      return [];
    }
  }

  async publishPost(id: string, userId: string) {
    const post = await this.getById(id);

    // Verificar se o usuário é o autor ou admin
    if (post.authorId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== Role.ADMIN) {
        throw new ApiError(403, 'Você não tem permissão para publicar este post');
      }
    }

    return prisma.blogPost.update({
      where: { id },
      data: { 
        published: true,
        publishedAt: new Date()
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
      },
    });
  }

  async unpublishPost(id: string, userId: string) {
    const post = await this.getById(id);

    // Verificar se o usuário é o autor ou admin
    if (post.authorId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== Role.ADMIN) {
        throw new ApiError(403, 'Você não tem permissão para despublicar este post');
      }
    }

    return prisma.blogPost.update({
      where: { id },
      data: { 
        published: false,
        // Não removemos publishedAt para manter o histórico
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
      },
    });
  }

  async featurePost(id: string, userId: string) {
    const post = await this.getById(id);

    // Apenas admin pode destacar posts
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.ADMIN) {
      throw new ApiError(403, 'Apenas administradores podem destacar posts');
    }

    return prisma.blogPost.update({
      where: { id },
      data: { featured: true },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
      },
    });
  }

  async unfeaturePost(id: string, userId: string) {
    const post = await this.getById(id);

    // Apenas admin pode remover destaque de posts
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.ADMIN) {
      throw new ApiError(403, 'Apenas administradores podem remover destaque de posts');
    }

    return prisma.blogPost.update({
      where: { id },
      data: { featured: false },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
      },
    });
  }

  async getBlogStats() {
    try {
      const [
        totalPosts,
        publishedPosts,
        draftPosts,
        featuredPosts,
        categories,
        comments
      ] = await Promise.all([
        prisma.blogPost.count(),
        prisma.blogPost.count({ where: { published: true } }),
        prisma.blogPost.count({ where: { published: false } }),
        prisma.blogPost.count({ where: { featured: true } }),
        prisma.category.count(),
        prisma.comment.count(),
      ]);

      // Buscar o número de tags únicas
      const allPosts = await prisma.blogPost.findMany({
        select: { tags: true }
      });
      
      // Obter todas as tags únicas
      const uniqueTags = new Set<string>();
      allPosts.forEach(post => {
        post.tags.forEach(tag => uniqueTags.add(tag));
      });

      // Contar o número total de visualizações (essa informação pode não estar disponível)
      const totalViews = 0; // Implementar se o modelo tiver este campo

      return {
        totalPosts,
        publishedPosts,
        draftPosts,
        featuredPosts,
        totalViews,
        totalComments: comments,
        categories,
        tags: uniqueTags.size
      };
    } catch (error: any) {
      logger.error(`Falha ao obter estatísticas do blog: ${error.message}`);
      throw new ApiError(500, 'Erro ao obter estatísticas do blog');
    }
  }

  async getPublishedPosts({ page = 1, limit = 10 }: { page: number, limit: number }) {
    const skip = (page - 1) * limit;

    try {
      const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
          where: { published: true },
          include: {
            author: {
              select: {
                name: true,
                email: true,
              },
            },
            category: true,
          },
          skip,
          take: limit,
          orderBy: { publishedAt: 'desc' },
        }),
        prisma.blogPost.count({ where: { published: true } }),
      ]);

      return {
        posts,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error: any) {
      logger.error(`Falha ao buscar posts publicados: ${error.message}`);
      return {
        posts: [],
        total: 0,
        pages: 0,
        currentPage: page,
      };
    }
  }

  async approveComment(commentId: string, userId: string) {
    // Verificar se o usuário é admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.ADMIN) {
      throw new ApiError(403, 'Apenas administradores podem aprovar comentários');
    }

    // Verificar se o comentário existe
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new ApiError(404, 'Comentário não encontrado');
    }

    // Implementar se houver um campo de status no modelo Comment
    // Como não há um campo status no modelo atual, esta função é um placeholder
    return comment;
  }

  async rejectComment(commentId: string, userId: string) {
    // Verificar se o usuário é admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== Role.ADMIN) {
      throw new ApiError(403, 'Apenas administradores podem rejeitar comentários');
    }

    // Verificar se o comentário existe
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new ApiError(404, 'Comentário não encontrado');
    }

    // Implementar se houver um campo de status no modelo Comment
    // Como não há um campo status no modelo atual, esta função é um placeholder
    return comment;
  }
} 