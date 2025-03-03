import { BlogPost, Category, Comment, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { unlinkSync } from 'fs';
import { join } from 'path';
import slugify from 'slugify';
import { withRetry } from '../utils/retryHandler';
import logger from '../config/logger';

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
              },
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
        posts,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error: any) {
      logger.error(`Falha ao buscar posts do blog: ${error.message}`);
      throw new ApiError(500, 'Erro ao buscar posts do blog');
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
      if (user?.role !== 'ADMIN') {
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
      if (user?.role !== 'ADMIN') {
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
      if (user?.role !== 'ADMIN') {
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
      throw new ApiError(500, 'Erro ao listar categorias');
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
    if (user?.role !== 'ADMIN') {
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
    if (user?.role !== 'ADMIN') {
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
      // Verificar se o post existe
      const post = await withRetry(
        async () => {
          return prisma.blogPost.findUnique({
            where: { id: postId },
            select: { id: true },
          });
        },
        {
          maxRetries: 2,
          initialDelay: 300,
          backoffFactor: 2,
        }
      );

      if (!post) {
        throw new ApiError(404, 'Post não encontrado');
      }

      // Buscar os comentários do post
      return await withRetry(
        async () => {
          return prisma.comment.findMany({
            where: { postId },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          });
        },
        {
          maxRetries: 3,
          initialDelay: 500,
          backoffFactor: 2,
          onRetry: (error, attempt) => {
            logger.warn(`Erro ao buscar comentários do post ${postId} (tentativa ${attempt}): ${error.message}`);
          },
        }
      );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Falha ao buscar comentários do post ${postId}: ${error.message}`);
      throw new ApiError(500, 'Erro ao buscar comentários');
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
      if (user?.role !== 'ADMIN') {
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
      throw new ApiError(500, 'Erro ao listar tags');
    }
  }
} 