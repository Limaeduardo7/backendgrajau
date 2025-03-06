import { Business, User } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { unlinkSync } from 'fs';
import { join } from 'path';
import { withRetry } from '../utils/retryHandler';
import logger from '../config/logger';
import { isAdmin, isOwnerOrAdmin } from '../utils/permissionUtils';

interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  state?: string;
  city?: string;
  featured?: boolean;
}

export class BusinessService {
  async list(params?: ListParams) {
    const {
      page = 1,
      limit = 10,
      search = '',
      category,
      state,
      city,
      featured,
    } = params || {};

    const skip = (page - 1) * limit;

    // Construir a condição where
    const where: any = {
      status: 'APPROVED',
    };

    // Adicionar filtro de busca por termo
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Adicionar filtro por categoria
    if (category) {
      where.categoryId = category;
    }

    // Adicionar filtro por estado
    if (state) {
      where.state = state;
    }

    // Adicionar filtro por cidade
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    // Adicionar filtro por destaque
    if (featured) {
      where.featured = { equals: true } as any;
    }

    try {
      // Usar o mecanismo de retry para buscar o total de registros e as empresas
      const [total, businesses] = await withRetry(
        async () => {
          return Promise.all([
            prisma.business.count({ where }),
            prisma.business.findMany({
              where,
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
              skip,
              take: limit,
              orderBy: {
                createdAt: 'desc',
              },
            }),
          ]);
        },
        {
          maxRetries: 3,
          initialDelay: 500,
          backoffFactor: 2,
          onRetry: (error, attempt) => {
            logger.warn(`Erro ao listar empresas (tentativa ${attempt}): ${error.message}`);
          },
        }
      );

      return {
        businesses,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error: any) {
      logger.error(`Falha ao listar empresas: ${error.message}`);
      throw new ApiError(500, 'Erro ao listar empresas');
    }
  }

  async getById(id: string): Promise<Business | null> {
    try {
      const business = await withRetry(
        async () => {
          return prisma.business.findUnique({
            where: { id },
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
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
            logger.warn(`Erro ao buscar empresa por ID ${id} (tentativa ${attempt}): ${error.message}`);
          },
        }
      );

      if (!business) {
        throw new ApiError(404, 'Empresa não encontrada');
      }

      return business;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error(`Falha ao buscar empresa por ID ${id}: ${error.message}`);
      throw new ApiError(500, 'Erro ao buscar empresa');
    }
  }

  async create(data: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Business> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'Usuário não encontrado');
    }

    const { socialMedia, ...restData } = data;
    
    return prisma.business.create({
      data: {
        ...restData,
        socialMedia: socialMedia as any,
        userId,
      },
    });
  }

  async update(id: string, data: Partial<Business>, userId: string): Promise<Business> {
    const business = await this.getById(id);

    if (!business) {
      throw new ApiError(404, 'Negócio não encontrado');
    }

    if (business.userId !== userId) {
      throw new ApiError(403, 'Você não tem permissão para atualizar este negócio');
    }

    const { socialMedia, ...restData } = data;
    
    return prisma.business.update({
      where: { id },
      data: {
        ...restData,
        ...(socialMedia && { socialMedia: socialMedia as any }),
      },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const business = await this.getById(id);

    if (!business) {
      throw new ApiError(404, 'Negócio não encontrado');
    }

    if (business.userId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      logger.info(`Usuário ${userId} tentando excluir negócio ${id} que pertence a ${business.userId}`);
      
      if (user?.role !== 'ADMIN') {
        throw new ApiError(403, 'Você não tem permissão para deletar este negócio');
      }
    }

    // Deletar fotos do negócio
    if (business.photos) {
      business.photos.forEach((photo) => {
        try {
          unlinkSync(join(__dirname, '../../uploads', photo));
        } catch (error) {
          console.error(`Erro ao deletar foto ${photo}:`, error);
        }
      });
    }

    try {
      await prisma.$transaction([
        prisma.job.deleteMany({ where: { businessId: id } }),
        prisma.business.delete({ where: { id } }),
      ]);
    } catch (error) {
      logger.error(`Erro ao excluir negócio: ${error}`);
      throw new ApiError(500, 'Erro ao excluir negócio');
    }
  }

  async addPhotos(id: string, files: Express.Multer.File[], userId: string): Promise<Business> {
    const business = await this.getById(id);

    if (!business) {
      throw new ApiError(404, 'Negócio não encontrado');
    }

    if (business.userId !== userId) {
      throw new ApiError(403, 'Você não tem permissão para adicionar fotos a este negócio');
    }

    const photos = files.map((file) => file.filename);

    return prisma.business.update({
      where: { id },
      data: {
        photos: {
          push: photos,
        },
      },
    });
  }

  async removePhoto(id: string, photoIndex: number, userId: string): Promise<Business> {
    const business = await this.getById(id);

    if (!business) {
      throw new ApiError(404, 'Negócio não encontrado');
    }

    if (business.userId !== userId) {
      throw new ApiError(403, 'Você não tem permissão para remover fotos deste negócio');
    }

    if (!business.photos || photoIndex >= business.photos.length) {
      throw new ApiError(400, 'Índice da foto inválido');
    }

    const photoToRemove = business.photos[photoIndex];
    try {
      unlinkSync(join(__dirname, '../../uploads', photoToRemove));
    } catch (error) {
      console.error(`Erro ao deletar foto ${photoToRemove}:`, error);
    }

    const updatedPhotos = business.photos.filter((_, index) => index !== photoIndex);

    return prisma.business.update({
      where: { id },
      data: {
        photos: updatedPhotos,
      },
    });
  }

  async updateStatus(id: string, status: string, userId: string): Promise<Business> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== 'ADMIN') {
      throw new ApiError(403, 'Apenas administradores podem atualizar o status de um negócio');
    }

    const business = await this.getById(id);

    if (!business) {
      throw new ApiError(404, 'Negócio não encontrado');
    }

    return prisma.business.update({
      where: { id },
      data: { 
        status: status as any 
      },
    });
  }

  async listByStatus(params: { status: string; page: number; limit: number }) {
    const { status, page, limit } = params;
    const skip = (page - 1) * limit;
    
    logger.info(`Buscando empresas com status ${status}`);
    
    const where = { status: status as any };
    
    const businesses = await prisma.business.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    const total = await prisma.business.count({ where });
    
    return {
      businesses,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit
    };
  }
} 