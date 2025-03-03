import { Request, Response } from 'express';
import { JobService } from '../services/job.service';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';

export class JobController {
  private jobService: JobService;

  constructor() {
    this.jobService = new JobService();
  }

  list = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, search, category, type, location, featured } = req.query;
      const result = await this.jobService.list({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        category: category as string,
        type: type as string,
        location: location as string,
        featured: featured === 'true',
      });
      
      // Garantir que o resultado tenha a estrutura correta
      // O frontend espera um objeto com a propriedade 'list'
      if (!result || !result.jobs) {
        logger.warn('A consulta de vagas retornou um resultado vazio ou inválido');
        return res.json({
          list: [],
          total: 0,
          pages: 1,
          currentPage: 1
        });
      }
      
      logger.info(`Listando ${result.jobs.length} vagas`);
      
      // Estrutura esperada pelo frontend
      res.json({
        list: result.jobs,
        total: result.total,
        pages: result.pages,
        currentPage: result.currentPage
      });
    } catch (error) {
      logger.error('Erro ao listar vagas:', error);
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
      const job = await this.jobService.getById(id);
      res.json(job);
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
      const businessId = req.params.businessId;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const job = await this.jobService.create(data, businessId, userId);
      res.status(201).json(job);
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

      const job = await this.jobService.update(id, data, userId);
      res.json(job);
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

      await this.jobService.delete(id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  apply = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { coverLetter } = req.body;
      const resume = req.file;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      if (!resume) {
        throw new ApiError(400, 'Currículo é obrigatório');
      }

      const application = await this.jobService.apply(id, userId, {
        coverLetter,
        resumeUrl: resume.filename,
      });

      res.status(201).json(application);
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

      const job = await this.jobService.updateStatus(id, status, userId);
      res.json(job);
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
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const applications = await this.jobService.listApplications(id, userId) || [];
      logger.info(`Retornando ${applications.length} candidaturas para a vaga ${id}`);
      res.json(applications);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };
} 