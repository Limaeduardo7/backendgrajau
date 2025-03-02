import { Request, Response } from 'express';
import { BusinessService } from '../services/business.service';
import { ApiError } from '../utils/ApiError';

export class BusinessController {
  private businessService: BusinessService;

  constructor() {
    this.businessService = new BusinessService();
  }

  list = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, search, category, state, city, featured } = req.query;
      
      const businesses = await this.businessService.list({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        category: category as string,
        state: state as string,
        city: city as string,
        featured: featured === 'true',
      });
      
      res.json(businesses);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Erro ao listar empresas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const business = await this.businessService.getById(id);
      res.json(business);
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

      const business = await this.businessService.create(data, userId);
      res.status(201).json(business);
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

      const business = await this.businessService.update(id, data, userId);
      res.json(business);
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

      await this.businessService.delete(id, userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  addPhotos = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const business = await this.businessService.addPhotos(id, files, userId);
      res.json(business);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };

  removePhoto = async (req: Request, res: Response) => {
    try {
      const { id, photoIndex } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const business = await this.businessService.removePhoto(id, parseInt(photoIndex), userId);
      res.json(business);
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

      const business = await this.businessService.updateStatus(id, status, userId);
      res.json(business);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };
} 