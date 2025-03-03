import { Request, Response } from 'express';
import { ProfessionalService } from '../services/professional.service';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';

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
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      
      const user = req.user;
      if (!user || user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Não autorizado. Acesso apenas para administradores.' });
      }
      
      logger.info(`Buscando profissionais com status PENDING (${page}/${limit})`);
      
      const result = await this.professionalService.listByStatus({
        status: 'PENDING',
        page,
        limit
      });
      
      return res.json({
        professionals: result.professionals || [],
        total: result.total || 0,
        page: result.page || 1,
        pages: result.pages || 0,
        limit: result.limit || 10
      });
    } catch (error) {
      logger.error('Erro ao buscar profissionais pendentes:', error);
      
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };
} 