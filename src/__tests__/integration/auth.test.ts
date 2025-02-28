import request from 'supertest';
import app from '../../app';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/prisma';

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
  ClerkExpressRequireAuth: jest.fn().mockImplementation(() => (req: Request, res: Response, next: NextFunction) => {
    req.auth = {
      userId: 'test_user_id',
    };
    next();
  }),
}));

// Mock do Prisma
jest.mock('../../config/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
}));

describe('Autenticação API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/webhook', () => {
    it('deve processar um webhook de criação de usuário', async () => {
      // Mock do evento de webhook do Clerk
      const webhookEvent = {
        type: 'user.created',
        data: {
          id: 'test_user_id',
          email_addresses: [
            {
              email_address: 'test@example.com',
              id: 'email_id',
              verification: { status: 'verified' },
            },
          ],
          first_name: 'Teste',
          last_name: 'Usuário',
        },
      };

      // Simular a assinatura do webhook
      const mockSignature = 'mock_signature';

      const response = await request(app)
        .post('/api/auth/webhook')
        .set('svix-id', 'test_svix_id')
        .set('svix-timestamp', Date.now().toString())
        .set('svix-signature', mockSignature)
        .send(webhookEvent);

      expect(response.status).toBe(200);
    });

    it('deve rejeitar um webhook com assinatura inválida', async () => {
      const response = await request(app)
        .post('/api/auth/webhook')
        .set('svix-id', 'test_svix_id')
        .set('svix-timestamp', Date.now().toString())
        .set('svix-signature', 'invalid_signature')
        .send({ type: 'user.created', data: {} });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/login', () => {
    it('deve retornar erro quando o token não é fornecido', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Token é obrigatório');
    });

    it('deve retornar erro quando o token é inválido', async () => {
      // Mock do Clerk para retornar sessão inválida
      (clerkClient.sessions.verifySession as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ token: 'token-invalido' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Sessão inválida');
    });

    it('deve criar um novo usuário quando não existir no banco', async () => {
      // Mock do Clerk para retornar sessão válida
      (clerkClient.sessions.verifySession as jest.Mock).mockResolvedValue({
        userId: 'clerk-user-id',
      });

      // Mock do Clerk para retornar dados do usuário
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk-user-id',
        firstName: 'Teste',
        lastName: 'Usuário',
        emailAddresses: [{ emailAddress: 'teste@exemplo.com' }],
      });

      // Mock do Prisma para não encontrar o usuário
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock do Prisma para criar o usuário
      const mockUser = {
        id: 'user-id',
        clerkId: 'clerk-user-id',
        name: 'Teste Usuário',
        email: 'teste@exemplo.com',
        role: 'USER',
        status: 'PENDING',
      };
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ token: 'token-valido' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual(expect.objectContaining({
        id: 'user-id',
        name: 'Teste Usuário',
        email: 'teste@exemplo.com',
      }));
      expect(response.body).toHaveProperty('token');
    });

    it('deve retornar o usuário existente quando já estiver no banco', async () => {
      // Mock do Clerk para retornar sessão válida
      (clerkClient.sessions.verifySession as jest.Mock).mockResolvedValue({
        userId: 'clerk-user-id',
      });

      // Mock do Clerk para retornar dados do usuário
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk-user-id',
        firstName: 'Teste',
        lastName: 'Usuário',
        emailAddresses: [{ emailAddress: 'teste@exemplo.com' }],
      });

      // Mock do Prisma para encontrar o usuário
      const mockUser = {
        id: 'user-id',
        clerkId: 'clerk-user-id',
        name: 'Teste Usuário',
        email: 'teste@exemplo.com',
        role: 'USER',
        status: 'ACTIVE',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ token: 'token-valido' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual(expect.objectContaining({
        id: 'user-id',
        name: 'Teste Usuário',
        email: 'teste@exemplo.com',
      }));
      expect(response.body).toHaveProperty('token');
    });
  });

  describe('GET /api/auth/me', () => {
    it('deve retornar erro quando não autenticado', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Token não fornecido');
    });

    it('deve retornar os dados do usuário autenticado', async () => {
      // Mock do Clerk para retornar sessão válida
      (clerkClient.sessions.verifySession as jest.Mock).mockResolvedValue({
        userId: 'clerk-user-id',
      });

      // Mock do Clerk para retornar dados do usuário
      (clerkClient.users.getUser as jest.Mock).mockResolvedValue({
        id: 'clerk-user-id',
        firstName: 'Teste',
        lastName: 'Usuário',
        emailAddresses: [{ emailAddress: 'teste@exemplo.com' }],
      });

      // Mock do Prisma para encontrar o usuário
      const mockUser = {
        id: 'user-id',
        clerkId: 'clerk-user-id',
        name: 'Teste Usuário',
        email: 'teste@exemplo.com',
        role: 'USER',
        status: 'ACTIVE',
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token-valido');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'user-id');
      expect(response.body).toHaveProperty('name', 'Teste Usuário');
      expect(response.body).toHaveProperty('email', 'teste@exemplo.com');
    });
  });

  describe('PATCH /api/auth/profile', () => {
    it('deve atualizar o perfil do usuário', async () => {
      // Mock dos dados do usuário
      const mockUser = {
        id: 'test_user_id',
        firstName: 'Teste',
        lastName: 'Usuário',
        update: jest.fn().mockResolvedValue({
          id: 'test_user_id',
          firstName: 'Novo',
          lastName: 'Nome',
        }),
      };

      // Configurar o mock para retornar o usuário
      (clerkClient.users.getUser as jest.Mock).mockResolvedValueOnce(mockUser);

      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', 'Bearer test_token')
        .send({
          firstName: 'Novo',
          lastName: 'Nome',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('firstName', 'Novo');
      expect(response.body).toHaveProperty('lastName', 'Nome');
    });
  });
}); 