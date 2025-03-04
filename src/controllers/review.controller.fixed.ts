import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import { captureException } from '../config/sentry';
import logger from '../config/logger';

// Definindo uma interface para estender o Request
interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: string;
    email?: string;
  };
}

export class ReviewController {
  // Criar uma avaliação para empresa
  createBusinessReview = async (req: AuthRequest, res: Response) => {
    try {
      const { businessId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }
      
      // Verificar se a empresa existe
      const business = await prisma.business.findUnique({
        where: { id: businessId }
      });
      
      if (!business) {
        throw new ApiError(404, 'Empresa não encontrada');
      }
      
      // Verificar se o usuário já avaliou esta empresa
      const existingReview = await prisma.review.findFirst({
        where: {
          userId,
          businessId
        }
      });
      
      if (existingReview) {
        throw new ApiError(400, 'Você já avaliou esta empresa');
      }
      
      // Criar a avaliação
      const review = await prisma.review.create({
        data: {
          rating,
          comment,
          userId,
          businessId
        }
      });
      
      logger.info(`Avaliação criada para empresa ${businessId} pelo usuário ${userId}`);
      return res.status(201).json(review);
    } catch (error) {
      logger.error('Erro ao criar avaliação:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      captureException(error as Error, { 
        businessId: req.params.businessId,
        userId: req.user?.id 
      });
      return res.status(500).json({ error: 'Erro ao criar avaliação' });
    }
  };
  
  // Criar uma avaliação para profissional
  createProfessionalReview = async (req: AuthRequest, res: Response) => {
    try {
      const { professionalId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }
      
      // Verificar se o profissional existe
      const professional = await prisma.professional.findUnique({
        where: { id: professionalId }
      });
      
      if (!professional) {
        throw new ApiError(404, 'Profissional não encontrado');
      }
      
      // Verificar se o usuário já avaliou este profissional
      const existingReview = await prisma.review.findFirst({
        where: {
          userId,
          professionalId
        }
      });
      
      if (existingReview) {
        throw new ApiError(400, 'Você já avaliou este profissional');
      }
      
      // Criar a avaliação
      const review = await prisma.review.create({
        data: {
          rating,
          comment,
          userId,
          professionalId
        }
      });
      
      return res.status(201).json(review);
    } catch (error) {
      console.error('Erro ao criar avaliação:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao criar avaliação' });
    }
  };
  
  // Listar avaliações de uma empresa
  getBusinessReviews = async (req: Request, res: Response) => {
    try {
      const { businessId } = req.params;
      
      // Verificar se a empresa existe
      const business = await prisma.business.findUnique({
        where: { id: businessId }
      });
      
      if (!business) {
        throw new ApiError(404, 'Empresa não encontrada');
      }
      
      // Buscar avaliações
      const reviews = await prisma.review.findMany({
        where: { businessId },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Calcular média de avaliações
      const averageRating = reviews.length > 0
        ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
        : 0;
      
      return res.json({
        reviews,
        averageRating,
        totalReviews: reviews.length
      });
    } catch (error) {
      console.error('Erro ao listar avaliações:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao listar avaliações' });
    }
  };
  
  // Listar avaliações de um profissional
  getProfessionalReviews = async (req: Request, res: Response) => {
    try {
      const { professionalId } = req.params;
      
      // Verificar se o profissional existe
      const professional = await prisma.professional.findUnique({
        where: { id: professionalId }
      });
      
      if (!professional) {
        throw new ApiError(404, 'Profissional não encontrado');
      }
      
      // Buscar avaliações
      const reviews = await prisma.review.findMany({
        where: { professionalId },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // Calcular média de avaliações
      const averageRating = reviews.length > 0
        ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
        : 0;
      
      return res.json({
        reviews,
        averageRating,
        totalReviews: reviews.length
      });
    } catch (error) {
      console.error('Erro ao listar avaliações:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao listar avaliações' });
    }
  };

  // Excluir uma avaliação
  deleteReview = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'ADMIN';
      
      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }
      
      // Buscar a avaliação
      const review = await prisma.review.findUnique({
        where: { id }
      });
      
      if (!review) {
        throw new ApiError(404, 'Avaliação não encontrada');
      }
      
      // Verificar se o usuário é o autor da avaliação ou um admin
      if (review.userId !== userId && !isAdmin) {
        throw new ApiError(403, 'Você não tem permissão para excluir esta avaliação');
      }
      
      // Excluir a avaliação
      await prisma.review.delete({
        where: { id }
      });
      
      logger.info(`Avaliação ${id} excluída pelo usuário ${userId}`);
      return res.json({ success: true, message: 'Avaliação excluída com sucesso' });
    } catch (error) {
      logger.error('Erro ao excluir avaliação:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      captureException(error as Error, { 
        reviewId: req.params.id,
        userId: req.user?.id 
      });
      return res.status(500).json({ error: 'Erro ao excluir avaliação' });
    }
  };
}

export default new ReviewController(); 