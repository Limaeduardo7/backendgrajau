import { Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../../../middlewares/auth.middleware';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { ApiError } from '../../../utils/ApiError';
import prisma from '../../../config/prisma';

// Mock do Clerk
jest.mock('@clerk/clerk-sdk-node', () => ({
  clerkClient: {
    users: {
      getUser: jest.fn(),
    },
    sessions: {
      verifySession: jest.fn(),
    },
  },
}));

// Mock do Prisma
jest.mock('../../../config/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('Middlewares de Autenticação', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {
        authorization: 'Bearer test_token',
      },
      user: {
        id: 'db_user_id',
        clerkId: 'test_user_id',
        role: 'USER',
      },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('deve autenticar o usuário com sucesso', async () => {
      // Mock das respostas
      (clerkClient.sessions.verifySession as jest.Mock).mockResolvedValueOnce({
        userId: 'test_user_id',
      });
      
      (clerkClient.users.getUser as jest.Mock).mockResolvedValueOnce({
        id: 'test_user_id',
        firstName: 'Teste',
        lastName: 'Usuário',
        emailAddresses: [{ emailAddress: 'teste@exemplo.com' }],
      });
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'db_user_id',
        clerkId: 'test_user_id',
        name: 'Teste Usuário',
        email: 'teste@exemplo.com',
        role: 'USER',
        status: 'ACTIVE',
      });
      
      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(clerkClient.sessions.verifySession).toHaveBeenCalledWith('test_token', 'test_token');
      expect(clerkClient.users.getUser).toHaveBeenCalledWith('test_user_id');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId: 'test_user_id' },
      });
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toEqual({
        id: 'db_user_id',
        clerkId: 'test_user_id',
        role: 'USER',
      });
    });

    it('deve criar um novo usuário quando não existir no banco', async () => {
      // Mock das respostas
      (clerkClient.sessions.verifySession as jest.Mock).mockResolvedValueOnce({
        userId: 'test_user_id',
      });
      
      (clerkClient.users.getUser as jest.Mock).mockResolvedValueOnce({
        id: 'test_user_id',
        firstName: 'Teste',
        lastName: 'Usuário',
        emailAddresses: [{ emailAddress: 'teste@exemplo.com' }],
      });
      
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      (prisma.user.create as jest.Mock).mockResolvedValueOnce({
        id: 'new_db_user_id',
        clerkId: 'test_user_id',
        name: 'Teste Usuário',
        email: 'teste@exemplo.com',
        role: 'USER',
        status: 'PENDING',
      });
      
      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clerkId: 'test_user_id',
          name: 'Teste Usuário',
          email: 'teste@exemplo.com',
          role: 'USER',
        }),
      });
      
      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toEqual({
        id: 'new_db_user_id',
        clerkId: 'test_user_id',
        role: 'USER',
      });
    });

    it('deve retornar erro 401 quando o token não for fornecido', async () => {
      mockRequest.headers = {};
      
      await requireAuth(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token não fornecido' });
    });
  });

  describe('requireRole', () => {
    it('deve permitir acesso quando o usuário tem o papel necessário', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'db_user_id',
        clerkId: 'test_user_id',
        role: 'ADMIN',
      });
      
      const adminMiddleware = requireRole(['ADMIN']);
      await adminMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'db_user_id' },
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('deve negar acesso quando o usuário não tem o papel necessário', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'db_user_id',
        clerkId: 'test_user_id',
        role: 'USER',
      });
      
      const adminMiddleware = requireRole(['ADMIN']);
      await adminMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'db_user_id' },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        error: 'Você não tem permissão para acessar este recurso' 
      });
    });
  });
}); 