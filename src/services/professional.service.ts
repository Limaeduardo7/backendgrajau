import { Professional, Application } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { unlinkSync } from 'fs';
import { join } from 'path';
import logger from '../config/logger';

interface ListProfessionalsParams {
  page: number;
  limit: number;
  search?: string;
  occupation?: string;
  specialties?: string[];
}

export class ProfessionalService {
  async list(params: ListProfessionalsParams): Promise<{ professionals: Professional[]; total: number; pages: number }> {
    const { page, limit, search, occupation, specialties } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'APPROVED',
    };
    
    if (search) {
      where.OR = [
        { occupation: { contains: search, mode: 'insensitive' as any } },
        { about: { contains: search, mode: 'insensitive' as any } },
      ];
    }
    
    if (occupation) {
      where.occupation = { contains: occupation, mode: 'insensitive' as any };
    }
    
    if (specialties && specialties.length > 0) {
      where.specialties = { hasSome: specialties };
    }

    const [professionals, total] = await Promise.all([
      prisma.professional.findMany({
        where,
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.professional.count({ where }),
    ]);

    return {
      professionals,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getById(id: string): Promise<Professional | null> {
    const professional = await prisma.professional.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!professional) {
      throw new ApiError(404, 'Profissional não encontrado');
    }

    return professional;
  }

  async create(data: Omit<Professional, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<Professional> {
    const existingProfessional = await prisma.professional.findUnique({
      where: { userId },
    });

    if (existingProfessional) {
      throw new ApiError(400, 'Usuário já possui um perfil profissional');
    }

    return prisma.professional.create({
      data: {
        ...data,
        userId,
        status: 'PENDING',
      },
    });
  }

  async update(id: string, data: Partial<Professional>, userId: string): Promise<Professional> {
    const professional = await this.getById(id);

    if (!professional) {
      throw new ApiError(404, 'Profissional não encontrado');
    }

    if (professional.userId !== userId) {
      throw new ApiError(403, 'Você não tem permissão para atualizar este perfil');
    }

    return prisma.professional.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const professional = await this.getById(id);

    if (!professional) {
      throw new ApiError(404, 'Profissional não encontrado');
    }

    if (professional.userId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') {
        throw new ApiError(403, 'Você não tem permissão para deletar este perfil');
      }
    }

    // Deletar arquivos do portfólio
    if (professional.portfolio) {
      professional.portfolio.forEach((item) => {
        try {
          unlinkSync(join(__dirname, '../../uploads', item));
        } catch (error) {
          console.error(`Erro ao deletar arquivo ${item}:`, error);
        }
      });
    }

    await prisma.professional.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: string, userId: string): Promise<Professional> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== 'ADMIN') {
      throw new ApiError(403, 'Apenas administradores podem atualizar o status de um profissional');
    }

    const professional = await this.getById(id);

    if (!professional) {
      throw new ApiError(404, 'Profissional não encontrado');
    }

    return prisma.professional.update({
      where: { id },
      data: { 
        status: status as any 
      },
    });
  }

  async addPortfolio(id: string, files: Express.Multer.File[], userId: string): Promise<Professional> {
    const professional = await this.getById(id);

    if (!professional) {
      throw new ApiError(404, 'Profissional não encontrado');
    }

    if (professional.userId !== userId) {
      throw new ApiError(403, 'Você não tem permissão para adicionar itens ao portfólio');
    }

    const items = files.map((file) => file.filename);

    return prisma.professional.update({
      where: { id },
      data: {
        portfolio: {
          push: items,
        },
      },
    });
  }

  async removePortfolioItem(id: string, itemIndex: number, userId: string): Promise<Professional> {
    const professional = await this.getById(id);

    if (!professional) {
      throw new ApiError(404, 'Profissional não encontrado');
    }

    if (professional.userId !== userId) {
      throw new ApiError(403, 'Você não tem permissão para remover itens do portfólio');
    }

    if (!professional.portfolio || itemIndex >= professional.portfolio.length) {
      throw new ApiError(400, 'Índice do item inválido');
    }

    const itemToRemove = professional.portfolio[itemIndex];
    try {
      unlinkSync(join(__dirname, '../../uploads', itemToRemove));
    } catch (error) {
      console.error(`Erro ao deletar arquivo ${itemToRemove}:`, error);
    }

    const updatedPortfolio = professional.portfolio.filter((_, index) => index !== itemIndex);

    return prisma.professional.update({
      where: { id },
      data: {
        portfolio: updatedPortfolio,
      },
    });
  }

  async listApplications(userId: string): Promise<Application[]> {
    const professional = await prisma.professional.findUnique({
      where: { userId },
    });

    if (!professional) {
      throw new ApiError(404, 'Perfil profissional não encontrado');
    }

    return prisma.application.findMany({
      where: { userId },
      include: {
        job: {
          select: {
            title: true,
            business: {
              select: {
                name: true,
                city: true,
                state: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByStatus(params: { status: string; page: number; limit: number }) {
    const { status, page, limit } = params;
    const skip = (page - 1) * limit;
    
    logger.info(`Buscando profissionais com status ${status}`);
    
    const where = { status: status as any };
    
    const professionals = await prisma.professional.findMany({
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
    
    const total = await prisma.professional.count({ where });
    
    return {
      professionals,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit
    };
  }
} 