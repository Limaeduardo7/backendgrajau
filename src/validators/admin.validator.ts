import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

// Schema para aprovação de item
export const approveItemSchema = z.object({
  itemId: z.string().uuid('ID do item inválido'),
  itemType: z.enum(['business', 'professional', 'job'], {
    errorMap: () => ({ message: 'Tipo de item deve ser "business", "professional" ou "job"' }),
  }),
});

// Schema para rejeição de item
export const rejectItemSchema = z.object({
  itemId: z.string().uuid('ID do item inválido'),
  itemType: z.enum(['business', 'professional', 'job'], {
    errorMap: () => ({ message: 'Tipo de item deve ser "business", "professional" ou "job"' }),
  }),
  reason: z.string().min(5, 'O motivo deve ter pelo menos 5 caracteres').max(500, 'O motivo deve ter no máximo 500 caracteres'),
});

// Schema para atualização de configurações
export const settingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  allowRegistrations: z.boolean().optional(),
  featuredLimit: z.number().int().positive().optional(),
  emailNotifications: z.boolean().optional(),
  autoApproveUsers: z.boolean().optional(),
});

// Schema para configuração de aprovação automática
export const autoApprovalSchema = z.object({
  enabled: z.boolean({
    errorMap: () => ({ message: 'O valor deve ser um booleano (true/false)' }),
  }),
});

// Middleware de validação para aprovação de item
export const validateApproveItem = (req: Request, res: Response, next: NextFunction) => {
  try {
    approveItemSchema.parse(req.body);
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

// Middleware de validação para rejeição de item
export const validateRejectItem = (req: Request, res: Response, next: NextFunction) => {
  try {
    rejectItemSchema.parse(req.body);
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

// Middleware de validação para atualização de configurações
export const validateSettings = (req: Request, res: Response, next: NextFunction) => {
  try {
    settingsSchema.parse(req.body);
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

// Middleware de validação para configuração de aprovação automática
export const validateAutoApproval = (req: Request, res: Response, next: NextFunction) => {
  try {
    autoApprovalSchema.parse(req.body);
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