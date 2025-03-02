import { Job, Application } from '@prisma/client';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { unlinkSync } from 'fs';
import { join } from 'path';

interface ListJobsParams {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  type?: string;
  location?: string;
  featured?: boolean;
}

interface ApplicationData {
  coverLetter?: string;
  resumeUrl: string;
}

export class JobService {
  async list(params: ListJobsParams): Promise<{ jobs: Job[]; total: number; pages: number }> {
    const { page, limit, search, category, type, location, featured } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'APPROVED',
    };
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' as any } },
        { description: { contains: search, mode: 'insensitive' as any } },
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    if (type) {
      where.type = type;
    }
    
    if (location) {
      where.location = { contains: location, mode: 'insensitive' as any };
    }

    if (featured) {
      where.featured = true;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          business: {
            select: {
              name: true,
              city: true,
              state: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.job.count({ where }),
    ]);

    return {
      jobs,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getById(id: string): Promise<Job | null> {
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            name: true,
            description: true,
            city: true,
            state: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!job) {
      throw new ApiError(404, 'Vaga não encontrada');
    }

    return job;
  }

  async create(data: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>, businessId: string, userId: string): Promise<Job> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new ApiError(404, 'Negócio não encontrado');
    }

    if (business.userId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') {
        throw new ApiError(403, 'Você não tem permissão para criar vagas para este negócio');
      }
    }

    return prisma.job.create({
      data: {
        ...data,
        businessId,
      },
    });
  }

  async update(id: string, data: Partial<Job>, userId: string): Promise<Job> {
    const job = await this.getById(id);

    if (!job) {
      throw new ApiError(404, 'Vaga não encontrada');
    }

    if (job.userId !== userId) {
      throw new ApiError(403, 'Você não tem permissão para atualizar esta vaga');
    }

    return prisma.job.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const job = await this.getById(id);

    if (!job) {
      throw new ApiError(404, 'Vaga não encontrada');
    }

    if (job.userId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') {
        throw new ApiError(403, 'Você não tem permissão para deletar esta vaga');
      }
    }

    // Deletar todas as candidaturas e seus arquivos
    const applications = await prisma.application.findMany({
      where: { jobId: id },
    });

    for (const application of applications) {
      try {
        unlinkSync(join(__dirname, '../../uploads', application.resumeUrl));
      } catch (error) {
        console.error(`Erro ao deletar currículo ${application.resumeUrl}:`, error);
      }
    }

    await prisma.$transaction([
      prisma.application.deleteMany({ where: { jobId: id } }),
      prisma.job.delete({ where: { id } }),
    ]);
  }

  async apply(jobId: string, userId: string, data: ApplicationData): Promise<Application> {
    const job = await this.getById(jobId);

    if (!job) {
      throw new ApiError(404, 'Vaga não encontrada');
    }

    if (job.status !== 'APPROVED') {
      throw new ApiError(400, 'Esta vaga não está disponível para candidaturas');
    }

    const existingApplication = await prisma.application.findFirst({
      where: {
        jobId,
        userId,
      },
    });

    if (existingApplication) {
      throw new ApiError(400, 'Você já se candidatou para esta vaga');
    }

    return prisma.application.create({
      data: {
        ...data,
        jobId,
        userId,
        status: 'PENDING',
      },
    });
  }

  async updateStatus(id: string, status: string, userId: string): Promise<Job> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== 'ADMIN') {
      throw new ApiError(403, 'Apenas administradores podem atualizar o status de uma vaga');
    }

    const job = await this.getById(id);

    if (!job) {
      throw new ApiError(404, 'Vaga não encontrada');
    }

    return prisma.job.update({
      where: { id },
      data: { 
        status: status as any 
      },
    });
  }

  async listApplications(jobId: string, userId: string): Promise<Application[]> {
    const job = await this.getById(jobId);

    if (!job) {
      throw new ApiError(404, 'Vaga não encontrada');
    }

    if (job.userId !== userId) {
      throw new ApiError(403, 'Você não tem permissão para ver as candidaturas desta vaga');
    }

    return prisma.application.findMany({
      where: { jobId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
} 