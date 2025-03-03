import { Request, Response } from 'express';
import { ReviewController } from '../../../controllers/review.controller.fixed';
import prisma from '../../../config/prisma';
import { ApiError } from '../../../utils/ApiError';

// Mock do Prisma
jest.mock('../../../config/prisma', () => ({
  business: {
    findUnique: jest.fn(),
  },
  professional: {
    findUnique: jest.fn(),
  },
  review: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('ReviewController', () => {
  let reviewController: ReviewController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    reviewController = new ReviewController();
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    req = {
      params: {},
      body: {},
      user: {
        id: 'user-id',
        clerkId: 'clerk-id',
        role: 'USER',
        email: 'user@example.com',
      },
    };
    
    res = {
      json: mockJson,
      status: mockStatus,
    };
    
    jest.clearAllMocks();
  });

  describe('createBusinessReview', () => {
    it('deve criar uma avaliação para empresa com sucesso', async () => {
      // Configurar mocks
      req.params = { businessId: 'business-id' };
      req.body = { rating: 5, comment: 'Ótima empresa!' };
      
      const mockBusiness = { id: 'business-id', name: 'Empresa Teste' };
      const mockReview = { 
        id: 'review-id', 
        rating: 5, 
        comment: 'Ótima empresa!',
        userId: 'user-id',
        businessId: 'business-id',
        createdAt: new Date(),
      };
      
      (prisma.business.findUnique as jest.Mock).mockResolvedValue(mockBusiness);
      (prisma.review.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.review.create as jest.Mock).mockResolvedValue(mockReview);
      
      // Executar
      await reviewController.createBusinessReview(req as any, res as any);
      
      // Verificar
      expect(prisma.business.findUnique).toHaveBeenCalledWith({
        where: { id: 'business-id' }
      });
      expect(prisma.review.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-id', businessId: 'business-id' }
      });
      expect(prisma.review.create).toHaveBeenCalledWith({
        data: {
          rating: 5,
          comment: 'Ótima empresa!',
          userId: 'user-id',
          businessId: 'business-id'
        }
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockReview);
    });
    
    it('deve retornar erro quando a empresa não existe', async () => {
      // Configurar mocks
      req.params = { businessId: 'business-id' };
      req.body = { rating: 5, comment: 'Ótima empresa!' };
      
      (prisma.business.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Executar
      await reviewController.createBusinessReview(req as any, res as any);
      
      // Verificar
      expect(prisma.business.findUnique).toHaveBeenCalledWith({
        where: { id: 'business-id' }
      });
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Empresa não encontrada' });
    });
    
    it('deve retornar erro quando o usuário já avaliou a empresa', async () => {
      // Configurar mocks
      req.params = { businessId: 'business-id' };
      req.body = { rating: 5, comment: 'Ótima empresa!' };
      
      const mockBusiness = { id: 'business-id', name: 'Empresa Teste' };
      const existingReview = { id: 'review-id', userId: 'user-id', businessId: 'business-id' };
      
      (prisma.business.findUnique as jest.Mock).mockResolvedValue(mockBusiness);
      (prisma.review.findFirst as jest.Mock).mockResolvedValue(existingReview);
      
      // Executar
      await reviewController.createBusinessReview(req as any, res as any);
      
      // Verificar
      expect(prisma.business.findUnique).toHaveBeenCalledWith({
        where: { id: 'business-id' }
      });
      expect(prisma.review.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-id', businessId: 'business-id' }
      });
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Você já avaliou esta empresa' });
    });
  });

  describe('deleteReview', () => {
    it('deve excluir uma avaliação com sucesso quando o usuário é o autor', async () => {
      // Configurar mocks
      req.params = { id: 'review-id' };
      
      const mockReview = { 
        id: 'review-id', 
        userId: 'user-id',
        businessId: 'business-id',
      };
      
      (prisma.review.findUnique as jest.Mock).mockResolvedValue(mockReview);
      (prisma.review.delete as jest.Mock).mockResolvedValue(mockReview);
      
      // Executar
      await reviewController.deleteReview(req as any, res as any);
      
      // Verificar
      expect(prisma.review.findUnique).toHaveBeenCalledWith({
        where: { id: 'review-id' }
      });
      expect(prisma.review.delete).toHaveBeenCalledWith({
        where: { id: 'review-id' }
      });
      expect(mockJson).toHaveBeenCalledWith({ 
        success: true, 
        message: 'Avaliação excluída com sucesso' 
      });
    });
    
    it('deve excluir uma avaliação com sucesso quando o usuário é admin', async () => {
      // Configurar mocks
      req.params = { id: 'review-id' };
      req.user = {
        id: 'admin-id',
        clerkId: 'clerk-id',
        role: 'ADMIN',
        email: 'admin@example.com',
      };
      
      const mockReview = { 
        id: 'review-id', 
        userId: 'user-id', // Outro usuário
        businessId: 'business-id',
      };
      
      (prisma.review.findUnique as jest.Mock).mockResolvedValue(mockReview);
      (prisma.review.delete as jest.Mock).mockResolvedValue(mockReview);
      
      // Executar
      await reviewController.deleteReview(req as any, res as any);
      
      // Verificar
      expect(prisma.review.findUnique).toHaveBeenCalledWith({
        where: { id: 'review-id' }
      });
      expect(prisma.review.delete).toHaveBeenCalledWith({
        where: { id: 'review-id' }
      });
      expect(mockJson).toHaveBeenCalledWith({ 
        success: true, 
        message: 'Avaliação excluída com sucesso' 
      });
    });
    
    it('deve retornar erro quando a avaliação não existe', async () => {
      // Configurar mocks
      req.params = { id: 'review-id' };
      
      (prisma.review.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Executar
      await reviewController.deleteReview(req as any, res as any);
      
      // Verificar
      expect(prisma.review.findUnique).toHaveBeenCalledWith({
        where: { id: 'review-id' }
      });
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Avaliação não encontrada' });
    });
    
    it('deve retornar erro quando o usuário não é o autor nem admin', async () => {
      // Configurar mocks
      req.params = { id: 'review-id' };
      req.user = {
        id: 'other-user-id',
        clerkId: 'clerk-id',
        role: 'USER',
        email: 'other-user@example.com',
      };
      
      const mockReview = { 
        id: 'review-id', 
        userId: 'user-id', // Outro usuário
        businessId: 'business-id',
      };
      
      (prisma.review.findUnique as jest.Mock).mockResolvedValue(mockReview);
      
      // Executar
      await reviewController.deleteReview(req as any, res as any);
      
      // Verificar
      expect(prisma.review.findUnique).toHaveBeenCalledWith({
        where: { id: 'review-id' }
      });
      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({ 
        error: 'Você não tem permissão para excluir esta avaliação' 
      });
    });
  });
}); 