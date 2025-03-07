import { Request, Response } from 'express';
import { ProfessionalService } from '../services/professional.service';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProfessionalController {
  private professionalService: ProfessionalService;

  constructor() {
    this.professionalService = new ProfessionalService();
  }

  list = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, search, occupation, specialties } = req.query;
      const professionals = await this.professionalService.list({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        occupation: occupation as string,
        specialties: specialties ? (specialties as string).split(',') : undefined,
      });
      res.json(professionals);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const professional = await this.professionalService.getById(id);
      res.json(professional);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const professional = await this.professionalService.create(data, userId);
      res.status(201).json(professional);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const professional = await this.professionalService.update(id, data, userId);
      res.json(professional);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      await this.professionalService.delete(id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const professional = await this.professionalService.updateStatus(id, status, userId);
      res.json(professional);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  addPortfolio = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const professional = await this.professionalService.addPortfolio(id, files, userId);
      res.json(professional);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  removePortfolioItem = async (req: Request, res: Response) => {
    try {
      const { id, itemIndex } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const professional = await this.professionalService.removePortfolioItem(id, parseInt(itemIndex), userId);
      res.json(professional);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  listApplications = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }
      
      const applications = await this.professionalService.listApplications(userId) || [];
      logger.info(`Retornando ${applications.length} candidaturas para o profissional ${userId}`);
      res.json(applications);
    } catch (error) {
      logger.error('Erro ao listar candidaturas:', error);
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  getPendingProfessionals = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      // Buscar profissionais pendentes
      const professionals = await prisma.professional.findMany({
        where: {
          status: 'PENDING'
        },
        select: {
          id: true,
          occupation: true,
          specialties: true,
          experience: true,
          education: true,
          certifications: true,
          portfolio: true,
          availability: true,
          hourlyRate: true,
          about: true,
          status: true,
          featured: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      // Transformar os dados para o formato esperado
      const items = professionals.map(p => ({
        id: p.id,
        name: p.user?.name || '',
        email: p.user?.email || '',
        phone: p.user?.phone || '',
        occupation: p.occupation,
        specialties: p.specialties,
        experience: p.experience,
        education: p.education,
        certifications: p.certifications,
        portfolio: p.portfolio,
        status: p.status.toLowerCase(),
        featured: p.featured,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
      
      // Contar total
      const total = await prisma.professional.count({
        where: {
          status: 'PENDING'
        }
      });
      
      const totalPages = Math.ceil(total / limit);
      
      return res.json({
        items,
        total,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      console.error("Erro ao obter profissionais pendentes:", error);
      return res.status(500).json({ error: "Erro ao obter profissionais pendentes" });
    }
  };
} 