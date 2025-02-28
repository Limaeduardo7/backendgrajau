import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

// Schema para criação de empresa
export const createBusinessSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres').max(100, 'O nome deve ter no máximo 100 caracteres'),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres').max(1000, 'A descrição deve ter no máximo 1000 caracteres'),
  categoryId: z.string().uuid('ID de categoria inválido'),
  address: z.string().min(5, 'O endereço deve ter pelo menos 5 caracteres').max(200, 'O endereço deve ter no máximo 200 caracteres').optional(),
  city: z.string().min(2, 'A cidade deve ter pelo menos 2 caracteres').max(100, 'A cidade deve ter no máximo 100 caracteres').optional(),
  state: z.string().min(2, 'O estado deve ter pelo menos 2 caracteres').max(50, 'O estado deve ter no máximo 50 caracteres').optional(),
  phone: z.string().min(10, 'O telefone deve ter pelo menos 10 caracteres').max(20, 'O telefone deve ter no máximo 20 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  website: z.string().url('URL inválida').optional(),
});

// Schema para atualização de empresa
export const updateBusinessSchema = createBusinessSchema.partial();

// Schema para atualização de status
export const updateStatusSchema = z.object({
  status: z.enum(['active', 'inactive'], {
    errorMap: () => ({ message: 'Status deve ser "active" ou "inactive"' }),
  }),
});

// Middleware de validação para criação de empresa
export const validateCreateBusiness = (req: Request, res: Response, next: NextFunction) => {
  try {
    createBusinessSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      next(new ApiError(400, 'Dados inválidos', errors));
    } else {
      next(error);
    }
  }
};

// Middleware de validação para atualização de empresa
export const validateUpdateBusiness = (req: Request, res: Response, next: NextFunction) => {
  try {
    updateBusinessSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      next(new ApiError(400, 'Dados inválidos', errors));
    } else {
      next(error);
    }
  }
};

// Middleware de validação para atualização de status
export const validateUpdateStatus = (req: Request, res: Response, next: NextFunction) => {
  try {
    updateStatusSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      next(new ApiError(400, 'Status inválido', errors));
    } else {
      next(error);
    }
  }
}; 