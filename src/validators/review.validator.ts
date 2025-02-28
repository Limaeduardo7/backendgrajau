import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Esquema para validação de avaliação
const reviewSchema = z.object({
  rating: z.number({
    required_error: 'Avaliação é obrigatória',
    invalid_type_error: 'Avaliação deve ser um número',
  }).int('Avaliação deve ser um número inteiro')
    .min(1, 'Avaliação deve ser no mínimo 1')
    .max(5, 'Avaliação deve ser no máximo 5'),
  comment: z.string({
    required_error: 'Comentário é obrigatório',
    invalid_type_error: 'Comentário deve ser uma string',
  }).min(3, 'Comentário deve ter pelo menos 3 caracteres')
    .max(500, 'Comentário deve ter no máximo 500 caracteres'),
});

// Middleware para validação de avaliação
export const validateReview = (req: Request, res: Response, next: NextFunction) => {
  try {
    reviewSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.errors[0].message,
        errors: error.errors,
      });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Esquema para validação de resposta a comentário
const reviewResponseSchema = z.object({
  response: z.string({
    required_error: 'Resposta é obrigatória',
    invalid_type_error: 'Resposta deve ser uma string',
  }).min(3, 'Resposta deve ter pelo menos 3 caracteres')
    .max(500, 'Resposta deve ter no máximo 500 caracteres'),
});

// Middleware para validação de resposta a comentário
export const validateReviewResponse = (req: Request, res: Response, next: NextFunction) => {
  try {
    reviewResponseSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: error.errors[0].message,
        errors: error.errors,
      });
    }
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}; 