import { BlogPost, Category, Comment, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { unlinkSync } from 'fs';
import { join } from 'path';
import slugify from 'slugify';

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
      where.featured = true;
    }

    const [posts, total] = await Promise.all([
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

    return {
      posts,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  async getById(id: string) {
    const post = await prisma.blogPost.findUnique({
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

    if (!post) {
      throw new ApiError(404, 'Post não encontrado');
    }

    return post;
  }

  async getBySlug(slug: string) {
    const post = await prisma.blogPost.findUnique({
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

    if (!post) {
      throw new ApiError(404, 'Post não encontrado');
    }

    return post;
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
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getCategoryById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        posts: {
          select: {
            id: true,
            title: true,
            slug: true,
            publishedAt: true,
          },
        },
      },
    });

    if (!category) {
      throw new ApiError(404, 'Categoria não encontrada');
    }

    return category;
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
    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new ApiError(404, 'Post não encontrado');
    }

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
} 