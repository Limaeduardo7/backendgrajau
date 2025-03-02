import { Request, Response } from 'express';
import { JobService } from '../services/job.service';
import { ApiError } from '../utils/ApiError';

export class JobController {
  private jobService: JobService;

  constructor() {
    this.jobService = new JobService();
  }

  list = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, search, category, type, location, featured } = req.query;
      const jobs = await this.jobService.list({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        category: category as string,
        type: type as string,
        location: location as string,
        featured: featured === 'true',
      });
      res.json(jobs);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Erro ao listar vagas:', error);
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

      const applications = await this.jobService.listApplications(id, userId);
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