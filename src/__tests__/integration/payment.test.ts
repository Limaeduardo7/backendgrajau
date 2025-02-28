import request from 'supertest';
import app from '../../app';
import prisma from '../../config/prisma';
import { Request, Response, NextFunction } from 'express';
import PaymentService from '../../services/PaymentService';

// Mock do Prisma
jest.mock('../../config/prisma', () => ({
  __esModule: true,
  default: {
    subscription: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    plan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock do PaymentService
jest.mock('../../services/PaymentService', () => ({
  default: {
    createPaymentPreference: jest.fn(),
    cancelSubscription: jest.fn(),
    getPaymentInfo: jest.fn(),
    processPaymentWebhook: jest.fn(),
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

describe('API de Pagamentos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/payments/plans', () => {
    it('deve listar todos os planos disponíveis', async () => {
      const mockPlans = [
        {
          id: '1',
          name: 'Plano Básico',
          description: 'Plano básico para empresas',
          price: 29.90,
          features: ['Listagem básica', 'Suporte por email'],
          active: true,
        },
        {
          id: '2',
          name: 'Plano Premium',
          description: 'Plano premium para empresas',
          price: 99.90,
          features: ['Listagem destacada', 'Suporte prioritário', 'Estatísticas'],
          active: true,
        },
      ];

      (prisma.plan.findMany as jest.Mock).mockResolvedValueOnce(mockPlans);

      const response = await request(app).get('/api/payments/plans');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('name', 'Plano Básico');
      expect(response.body[1]).toHaveProperty('name', 'Plano Premium');
    });
  });

  describe('GET /api/payments/plans/:id', () => {
    it('deve retornar um plano específico pelo ID', async () => {
      const mockPlan = {
        id: '1',
        name: 'Plano Básico',
        description: 'Plano básico para empresas',
        price: 29.90,
        features: ['Listagem básica', 'Suporte por email'],
        active: true,
      };

      (prisma.plan.findUnique as jest.Mock).mockResolvedValueOnce(mockPlan);

      const response = await request(app).get('/api/payments/plans/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', '1');
      expect(response.body).toHaveProperty('name', 'Plano Básico');
    });

    it('deve retornar 404 quando o plano não for encontrado', async () => {
      (prisma.plan.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app).get('/api/payments/plans/999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/payments/subscribe', () => {
    it('deve criar uma nova assinatura', async () => {
      const subscriptionData = {
        planId: '1',
        paymentMethod: 'credit_card',
        cardToken: 'tok_visa',
      };

      const mockPlan = {
        id: '1',
        name: 'Plano Básico',
        price: 29.90,
      };

      const mockSubscription = {
        id: 'sub_123',
        userId: 'test_user_id',
        planId: '1',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      (prisma.plan.findUnique as jest.Mock).mockResolvedValueOnce(mockPlan);
      (PaymentService.createPaymentPreference as jest.Mock).mockResolvedValueOnce({
        id: 'pref_123',
        init_point: 'https://mercadopago.com/checkout/123',
      });
      (prisma.subscription.create as jest.Mock).mockResolvedValueOnce(mockSubscription);

      const response = await request(app)
        .post('/api/payments/subscribe')
        .set('Authorization', 'Bearer test_token')
        .send(subscriptionData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 'sub_123');
      expect(response.body).toHaveProperty('status', 'active');
    });
  });

  describe('DELETE /api/payments/subscriptions/:id', () => {
    it('deve cancelar uma assinatura existente', async () => {
      const mockSubscription = {
        id: 'sub_123',
        userId: 'test_user_id',
        planId: '1',
        status: 'active',
        externalId: 'ext_sub_123',
      };

      (prisma.subscription.findUnique as jest.Mock).mockResolvedValueOnce(mockSubscription);
      (PaymentService.cancelSubscription as jest.Mock).mockResolvedValueOnce({ canceled: true });
      (prisma.subscription.update as jest.Mock).mockResolvedValueOnce({
        ...mockSubscription,
        status: 'canceled',
      });

      const response = await request(app)
        .delete('/api/payments/subscriptions/sub_123')
        .set('Authorization', 'Bearer test_token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Assinatura cancelada com sucesso');
    });

    it('deve retornar 404 quando a assinatura não for encontrada', async () => {
      (prisma.subscription.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/payments/subscriptions/sub_999')
        .set('Authorization', 'Bearer test_token');

      expect(response.status).toBe(404);
    });

    it('deve retornar 403 quando o usuário não é o proprietário da assinatura', async () => {
      const mockSubscription = {
        id: 'sub_123',
        userId: 'different_user_id',
        planId: '1',
        status: 'active',
      };

      (prisma.subscription.findUnique as jest.Mock).mockResolvedValueOnce(mockSubscription);

      const response = await request(app)
        .delete('/api/payments/subscriptions/sub_123')
        .set('Authorization', 'Bearer test_token');

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/payments/invoices', () => {
    it('deve listar as faturas do usuário', async () => {
      const mockInvoices = [
        {
          id: 'inv_1',
          subscriptionId: 'sub_123',
          amount: 29.90,
          status: 'paid',
          createdAt: new Date(),
        },
        {
          id: 'inv_2',
          subscriptionId: 'sub_123',
          amount: 29.90,
          status: 'pending',
          createdAt: new Date(),
        },
      ];

      (prisma.payment.findMany as jest.Mock).mockResolvedValueOnce(mockInvoices);

      const response = await request(app)
        .get('/api/payments/invoices')
        .set('Authorization', 'Bearer test_token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id', 'inv_1');
      expect(response.body[1]).toHaveProperty('id', 'inv_2');
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('deve processar um webhook de pagamento bem-sucedido', async () => {
      const webhookEvent = {
        type: 'payment.succeeded',
        data: {
          id: 'evt_123',
          object: {
            id: 'pay_123',
            subscription: 'sub_123',
            status: 'paid',
            amount: 2990,
          },
        },
      };

      (PaymentService.processPaymentWebhook as jest.Mock).mockResolvedValueOnce({ success: true });

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('X-Signature', 'valid_signature')
        .send(webhookEvent);

      expect(response.status).toBe(200);
    });
  });
}); 