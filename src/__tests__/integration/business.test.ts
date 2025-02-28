import request from 'supertest';
import app from '../../app';
import prisma from '../../config/prisma';
import { Request, Response, NextFunction } from 'express';

// Mock do Prisma
jest.mock('../../config/prisma', () => ({
  __esModule: true,
  default: {
    business: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

// Mock da autenticação
jest.mock('@clerk/clerk-sdk-node', () => ({
  clerkClient: {
    users: {
      getUser: jest.fn(),
    },
  },
  ClerkExpressRequireAuth: jest.fn().mockImplementation(() => (req: Request, res: Response, next: NextFunction) => {
    req.auth = {
      userId: 'test_user_id',
    };
    next();
  }),
}));

describe('API de Empresas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/business', () => {
    it('deve listar empresas com paginação', async () => {
      const mockBusinesses = [
        {
          id: '1',
          name: 'Empresa Teste 1',
          description: 'Descrição da empresa 1',
          ownerId: 'owner1',
        },
        {
          id: '2',
          name: 'Empresa Teste 2',
          description: 'Descrição da empresa 2',
          ownerId: 'owner2',
        },
      ];

      (prisma.business.findMany as jest.Mock).mockResolvedValueOnce(mockBusinesses);
      (prisma.business.count as jest.Mock).mockResolvedValueOnce(2);

      const response = await request(app).get('/api/business?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('businesses');
      expect(response.body.businesses).toHaveLength(2);
      expect(response.body).toHaveProperty('total', 2);
      expect(response.body).toHaveProperty('pages', 1);
      expect(response.body).toHaveProperty('currentPage', 1);
    });

    it('deve filtrar empresas por termo de busca', async () => {
      const mockBusinesses = [
        {
          id: '1',
          name: 'Empresa Teste',
          description: 'Descrição da empresa',
          ownerId: 'owner1',
        },
      ];

      (prisma.business.findMany as jest.Mock).mockResolvedValueOnce(mockBusinesses);
      (prisma.business.count as jest.Mock).mockResolvedValueOnce(1);

      const response = await request(app).get('/api/business?search=teste');

      expect(response.status).toBe(200);
      expect(response.body.businesses).toHaveLength(1);
      expect(response.body.businesses[0].name).toBe('Empresa Teste');
    });
  });

  describe('GET /api/business/:id', () => {
    it('deve retornar uma empresa pelo ID', async () => {
      const mockBusiness = {
        id: '1',
        name: 'Empresa Teste',
        description: 'Descrição da empresa',
        ownerId: 'owner1',
        category: { id: '1', name: 'Categoria Teste' },
        reviews: [],
      };

      (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce(mockBusiness);
      (prisma.review.aggregate as jest.Mock).mockResolvedValueOnce({
        _avg: { rating: 4.5 },
        _count: { rating: 10 },
      });

      const response = await request(app).get('/api/business/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', '1');
      expect(response.body).toHaveProperty('name', 'Empresa Teste');
      expect(response.body).toHaveProperty('averageRating', 4.5);
      expect(response.body).toHaveProperty('reviewCount', 10);
    });

    it('deve retornar 404 quando a empresa não for encontrada', async () => {
      (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app).get('/api/business/999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/business', () => {
    it('deve criar uma nova empresa', async () => {
      const newBusiness = {
        name: 'Nova Empresa',
        description: 'Descrição da nova empresa',
        categoryId: '1',
        address: 'Rua Teste, 123',
        city: 'São Paulo',
        state: 'SP',
        phone: '11999999999',
        email: 'empresa@teste.com',
        website: 'https://empresa.teste.com',
      };

      const mockCreatedBusiness = {
        id: '3',
        ...newBusiness,
        ownerId: 'test_user_id',
        createdAt: new Date(),
        updatedAt: new Date(),
        approved: false,
      };

      (prisma.business.create as jest.Mock).mockResolvedValueOnce(mockCreatedBusiness);

      const response = await request(app)
        .post('/api/business')
        .set('Authorization', 'Bearer test_token')
        .send(newBusiness);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', '3');
      expect(response.body).toHaveProperty('name', 'Nova Empresa');
      expect(response.body).toHaveProperty('ownerId', 'test_user_id');
    });
  });

  describe('PATCH /api/business/:id', () => {
    it('deve atualizar uma empresa existente', async () => {
      const mockBusiness = {
        id: '1',
        name: 'Empresa Teste',
        description: 'Descrição da empresa',
        ownerId: 'test_user_id',
      };

      const updateData = {
        name: 'Empresa Atualizada',
        description: 'Nova descrição',
      };

      (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce(mockBusiness);
      (prisma.business.update as jest.Mock).mockResolvedValueOnce({
        ...mockBusiness,
        ...updateData,
      });

      const response = await request(app)
        .patch('/api/business/1')
        .set('Authorization', 'Bearer test_token')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Empresa Atualizada');
      expect(response.body).toHaveProperty('description', 'Nova descrição');
    });

    it('deve retornar 403 quando o usuário não é o proprietário', async () => {
      const mockBusiness = {
        id: '1',
        name: 'Empresa Teste',
        description: 'Descrição da empresa',
        ownerId: 'different_owner_id',
      };

      (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce(mockBusiness);

      const response = await request(app)
        .patch('/api/business/1')
        .set('Authorization', 'Bearer test_token')
        .send({ name: 'Empresa Atualizada' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/business/:id', () => {
    it('deve excluir uma empresa', async () => {
      const mockBusiness = {
        id: '1',
        name: 'Empresa Teste',
        description: 'Descrição da empresa',
        ownerId: 'test_user_id',
      };

      (prisma.business.findUnique as jest.Mock).mockResolvedValueOnce(mockBusiness);
      (prisma.business.delete as jest.Mock).mockResolvedValueOnce(mockBusiness);

      const response = await request(app)
        .delete('/api/business/1')
        .set('Authorization', 'Bearer test_token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Empresa excluída com sucesso');
    });
  });
}); 