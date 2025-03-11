import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { captureException } from '../config/sentry';
import logger from '../config/logger';
import { Role } from '@prisma/client';

// Definindo uma interface para estender o Request
interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: Role;
    email?: string;
  };
}

export class ReviewController {
  async create(req: AuthRequest, res: Response) {
    try {
      const { rating, comment, businessId, professionalId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      if (!rating) {
        throw new ApiError(400, 'A avaliação é obrigatória');
      }

      if (!businessId && !professionalId) {
        throw new ApiError(400, 'É necessário especificar um negócio ou profissional');
      }

      if (businessId && professionalId) {
        throw new ApiError(400, 'Especifique apenas um negócio ou profissional');
      }

      // Verificar se o usuário já avaliou este negócio/profissional
      const existingReview = await prisma.review.findFirst({
        where: {
          userId,
          OR: [
            { businessId },
            { professionalId }
          ]
        }
      });

      if (existingReview) {
        throw new ApiError(400, 'Você já avaliou este negócio/profissional');
      }

      const review = await prisma.review.create({
        data: {
          rating,
          comment,
          userId,
          businessId,
          professionalId
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      res.status(201).json(review);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error) {
        captureException(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      } else {
        const unknownError = new Error('Erro desconhecido');
        captureException(unknownError);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async list(req: Request, res: Response) {
    try {
      const { businessId, professionalId } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      if (!businessId && !professionalId) {
        throw new ApiError(400, 'É necessário especificar um negócio ou profissional');
      }

      const where: any = {};
      if (businessId) where.businessId = businessId;
      if (professionalId) where.professionalId = professionalId;

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.review.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      res.json({
        reviews,
        total,
        page,
        totalPages
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error) {
        captureException(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      } else {
        const unknownError = new Error('Erro desconhecido');
        captureException(unknownError);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const review = await prisma.review.findUnique({
        where: { id },
        include: {
          user: true
        }
      });

      if (!review) {
        throw new ApiError(404, 'Avaliação não encontrada');
      }

      // Verificar se o usuário é o autor da avaliação ou um admin
      const isAdmin = req.user?.role === Role.ADMIN;
      if (review.userId !== userId && !isAdmin) {
        throw new ApiError(403, 'Você não tem permissão para excluir esta avaliação');
      }

      await prisma.review.delete({
        where: { id }
      });

      res.json({ message: 'Avaliação excluída com sucesso' });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error) {
        captureException(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      } else {
        const unknownError = new Error('Erro desconhecido');
        captureException(unknownError);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const review = await prisma.review.findUnique({
        where: { id },
        include: {
          user: true
        }
      });

      if (!review) {
        throw new ApiError(404, 'Avaliação não encontrada');
      }

      // Verificar se o usuário é o autor da avaliação ou um admin
      const isAdmin = req.user?.role === Role.ADMIN;
      if (review.userId !== userId && !isAdmin) {
        throw new ApiError(403, 'Você não tem permissão para atualizar esta avaliação');
      }

      const updatedReview = await prisma.review.update({
        where: { id },
        data: {
          rating,
          comment
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      res.json(updatedReview);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error) {
        captureException(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      } else {
        const unknownError = new Error('Erro desconhecido');
        captureException(unknownError);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }
}

export default new ReviewController(); 