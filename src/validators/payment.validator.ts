import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

// Schema para criação de assinatura
export const subscriptionSchema = z.object({
  planId: z.string().uuid('ID do plano inválido'),
  paymentMethod: z.enum(['credit_card', 'pix', 'boleto'], {
    errorMap: () => ({ message: 'Método de pagamento deve ser "credit_card", "pix" ou "boleto"' }),
  }),
  cardToken: z.string().optional(),
  businessId: z.string().uuid('ID da empresa inválido').optional(),
  professionalId: z.string().uuid('ID do profissional inválido').optional(),
  couponCode: z.string().optional(),
});

// Schema para cancelamento de assinatura
export const cancelSubscriptionSchema = z.object({
  reason: z.string().min(5, 'O motivo deve ter pelo menos 5 caracteres').max(500, 'O motivo deve ter no máximo 500 caracteres').optional(),
});

// Schema para criação de plano
export const planSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres').max(100, 'O nome deve ter no máximo 100 caracteres'),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres').max(1000, 'A descrição deve ter no máximo 1000 caracteres'),
  price: z.number().positive('O preço deve ser um valor positivo'),
  duration: z.number().int().positive('A duração deve ser um número inteiro positivo'),
  type: z.enum(['BUSINESS', 'PROFESSIONAL', 'JOB'], {
    errorMap: () => ({ message: 'Tipo de plano deve ser "BUSINESS", "PROFESSIONAL" ou "JOB"' }),
  }),
  features: z.array(z.string()).min(1, 'Deve haver pelo menos uma característica'),
  active: z.boolean().optional(),
});

// Schema para atualização de plano
export const updatePlanSchema = planSchema.partial();

// Middleware de validação para criação de assinatura
export const validateSubscription = (req: Request, res: Response, next: NextFunction) => {
  try {
    subscriptionSchema.parse(req.body);
    
    // Validação adicional: deve fornecer businessId OU professionalId, não ambos
    if (req.body.businessId && req.body.professionalId) {
      throw new ApiError(400, 'Forneça apenas businessId OU professionalId, não ambos');
    }
    
    // Validação adicional: se método de pagamento for cartão de crédito, cardToken é obrigatório
    if (req.body.paymentMethod === 'credit_card' && !req.body.cardToken) {
      throw new ApiError(400, 'Token do cartão é obrigatório para pagamento com cartão de crédito');
    }
    
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

// Middleware de validação para cancelamento de assinatura
export const validateCancelSubscription = (req: Request, res: Response, next: NextFunction) => {
  try {
    cancelSubscriptionSchema.parse(req.body);
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

// Middleware de validação para criação de plano
export const validatePlan = (req: Request, res: Response, next: NextFunction) => {
  try {
    planSchema.parse(req.body);
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

// Middleware de validação para atualização de plano
export const validateUpdatePlan = (req: Request, res: Response, next: NextFunction) => {
  try {
    updatePlanSchema.parse(req.body);
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