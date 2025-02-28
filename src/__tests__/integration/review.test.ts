import request from 'supertest';
import app from '../../app';
import prisma from '../../config/prisma';
import { clerkClient } from '@clerk/clerk-sdk-node';

// Mock do Prisma
jest.mock('../../config/prisma', () => ({
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
  $transaction: jest.fn(),
}));

// Mock do Clerk
jest.mock('@clerk/clerk-sdk-node', () => ({
  clerkClient: {
    sessions: {
      verifySession: jest.fn(),
    },
    users: {
      getUser: jest.fn(),
    },
  },
}));

describe('Rotas de Avaliações', () => {
  const mockToken = 'test-token';
  const mockUserId = 'user-id';
  const mockBusinessId = 'business-id';
  const mockReviewId = 'review-id';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock da autenticação
    (clerkClient.sessions.verifySession as jest.Mock).mockResolvedValue({
      userId: 'clerk-user-id',
    });
    
    (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
      id: 'clerk-user-id',
      firstName: 'Test',
      lastName: 'User',
    });
    
    // Mock do usuário no banco
    (prisma as any).user = {
      findUnique: jest.fn().mockResolvedValue({
        id: mockUserId,
        clerkId: 'clerk-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'USER',
      }),
    };
  });

  describe('POST /api/businesses/:businessId/reviews', () => {
    it('deve criar uma avaliação para empresa com sucesso', async () => {
      // Mock dos dados
      const mockBusiness = { id: mockBusinessId, name: 'Empresa Teste' };
      const mockReview = { 
        id: mockReviewId, 
        rating: 5, 
        comment: 'Ótima empresa!',
        userId: mockUserId,
        businessId: mockBusinessId,
        createdAt: new Date(),
      };
      
      (prisma.business.findUnique as jest.Mock).mockResolvedValue(mockBusiness);
      (prisma.review.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.review.create as jest.Mock).mockResolvedValue(mockReview);
      
      // Executar requisição
      const response = await request(app)
        .post(`/api/businesses/${mockBusinessId}/reviews`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          rating: 5,
          comment: 'Ótima empresa!'
        });
      
      // Verificar resposta
      expect(response.status).toBe(201);
      expect(response.body).toEqual(expect.objectContaining({
        id: mockReviewId,
        rating: 5,
        comment: 'Ótima empresa!',
      }));
    });
    
    it('deve retornar erro 401 quando não autenticado', async () => {
      // Executar requisição sem token
      const response = await request(app)
        .post(`/api/businesses/${mockBusinessId}/reviews`)
        .send({
          rating: 5,
          comment: 'Ótima empresa!'
        });
      
      // Verificar resposta
      expect(response.status).toBe(401);
    });
    
    it('deve retornar erro 404 quando a empresa não existe', async () => {
      // Mock dos dados
      (prisma.business.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Executar requisição
      const response = await request(app)
        .post(`/api/businesses/${mockBusinessId}/reviews`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send({
          rating: 5,
          comment: 'Ótima empresa!'
        });
      
      // Verificar resposta
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Empresa não encontrada');
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('deve excluir uma avaliação com sucesso', async () => {
      // Mock dos dados
      const mockReview = { 
        id: mockReviewId, 
        userId: mockUserId,
        businessId: mockBusinessId,
      };
      
      (prisma.review.findUnique as jest.Mock).mockResolvedValue(mockReview);
      (prisma.review.delete as jest.Mock).mockResolvedValue(mockReview);
      
      // Executar requisição
      const response = await request(app)
        .delete(`/api/reviews/${mockReviewId}`)
        .set('Authorization', `Bearer ${mockToken}`);
      
      // Verificar resposta
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Avaliação excluída com sucesso'
      });
    });
    
    it('deve retornar erro 404 quando a avaliação não existe', async () => {
      // Mock dos dados
      (prisma.review.findUnique as jest.Mock).mockResolvedValue(null);
      
      // Executar requisição
      const response = await request(app)
        .delete(`/api/reviews/${mockReviewId}`)
        .set('Authorization', `Bearer ${mockToken}`);
      
      // Verificar resposta
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Avaliação não encontrada');
    });
    
    it('deve retornar erro 403 quando o usuário não tem permissão', async () => {
      // Mock dos dados
      const mockReview = { 
        id: mockReviewId, 
        userId: 'other-user-id', // Outro usuário
        businessId: mockBusinessId,
      };
      
      (prisma.review.findUnique as jest.Mock).mockResolvedValue(mockReview);
      
      // Executar requisição
      const response = await request(app)
        .delete(`/api/reviews/${mockReviewId}`)
        .set('Authorization', `Bearer ${mockToken}`);
      
      // Verificar resposta
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Você não tem permissão para excluir esta avaliação');
    });
  });
}); 