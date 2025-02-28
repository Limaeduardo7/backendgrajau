import PaymentService from '../../../../src/services/PaymentService';
import { ApiError } from '../../../../src/utils/ApiError';
import prisma from '../../../../src/config/prisma';
import mercadopago from '../../../../src/config/payment';
import EmailService from '../../../../src/services/EmailService';

// Mock das dependências
jest.mock('../../../../src/config/prisma', () => ({
  plan: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  subscription: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  invoice: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  business: {
    update: jest.fn(),
  },
  professional: {
    update: jest.fn(),
  },
  notification: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  cancellationReason: {
    create: jest.fn(),
  },
}));

jest.mock('../../../../src/config/payment', () => ({
  preferences: {
    create: jest.fn(),
  },
}));

jest.mock('../../../../src/services/EmailService', () => ({
  sendEmail: jest.fn(),
  sendPaymentConfirmationEmail: jest.fn(),
}));

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentPreference', () => {
    it('deve criar uma preferência de pagamento com sucesso', async () => {
      // Arrange
      const planMock = {
        id: 'plan-id',
        name: 'Plano Premium',
        description: 'Descrição do plano',
        price: 100,
        duration: 30,
        type: 'BUSINESS',
        active: true,
        subscriptions: [],
      };

      const userMock = {
        id: 'user-id',
        name: 'Usuário Teste',
        email: 'usuario@teste.com',
      };

      const subscriptionMock = {
        id: 'subscription-id',
        userId: 'user-id',
        planId: 'plan-id',
        status: 'PENDING',
        startDate: new Date(),
        endDate: new Date(),
        autoRenew: true,
      };

      const preferenceMock = {
        body: {
          id: 'preference-id',
          init_point: 'https://mercadopago.com/init',
        },
      };

      (prisma.plan.findUnique as jest.Mock).mockResolvedValue(planMock);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(userMock);
      (prisma.subscription.create as jest.Mock).mockResolvedValue(subscriptionMock);
      (mercadopago.preferences.create as jest.Mock).mockResolvedValue(preferenceMock);
      (prisma.payment.create as jest.Mock).mockResolvedValue({});

      // Act
      const result = await PaymentService.createPaymentPreference({
        planId: 'plan-id',
        userId: 'user-id',
        callbackUrl: 'https://example.com/callback',
        paymentMethod: 'credit_card',
        businessId: 'business-id',
      });

      // Assert
      expect(prisma.plan.findUnique).toHaveBeenCalledWith({
        where: { id: 'plan-id' },
        include: { subscriptions: true },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(prisma.subscription.create).toHaveBeenCalled();
      expect(mercadopago.preferences.create).toHaveBeenCalled();
      expect(prisma.payment.create).toHaveBeenCalled();
      expect(result).toEqual({
        preferenceId: 'preference-id',
        initPoint: 'https://mercadopago.com/init',
        subscriptionId: 'subscription-id',
      });
    });

    it('deve lançar erro quando o plano não for encontrado', async () => {
      // Arrange
      (prisma.plan.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        PaymentService.createPaymentPreference({
          planId: 'plan-id-inexistente',
          userId: 'user-id',
          callbackUrl: 'https://example.com/callback',
          paymentMethod: 'credit_card',
        })
      ).rejects.toThrow(ApiError);
    });
  });

  describe('processPaymentWebhook', () => {
    it('deve processar um webhook de pagamento aprovado com sucesso', async () => {
      // Arrange
      const subscriptionMock = {
        id: 'subscription-id',
        userId: 'user-id',
        planId: 'plan-id',
        status: 'PENDING',
        startDate: new Date(),
        endDate: new Date(),
        autoRenew: true,
        user: {
          id: 'user-id',
          name: 'Usuário Teste',
          email: 'usuario@teste.com',
        },
        plan: {
          id: 'plan-id',
          name: 'Plano Premium',
          price: 100,
        },
        businessId: 'business-id',
        business: {
          id: 'business-id',
          name: 'Empresa Teste',
        },
        professionalId: null,
        professional: null,
      };

      const paymentMock = {
        id: 'payment-id',
        subscriptionId: 'subscription-id',
        amount: 100,
        status: 'PENDING',
        paymentMethod: 'CREDIT_CARD',
        paymentIntentId: 'intent-id',
      };

      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(subscriptionMock);
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(paymentMock);
      (prisma.payment.update as jest.Mock).mockResolvedValue({});
      (prisma.invoice.create as jest.Mock).mockResolvedValue({});
      (prisma.business.update as jest.Mock).mockResolvedValue({});
      (prisma.subscription.update as jest.Mock).mockResolvedValue({});
      (EmailService.sendPaymentConfirmationEmail as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await PaymentService.processPaymentWebhook({
        id: 'payment-id',
        status: 'approved',
        external_reference: 'sub_subscription-id',
      });

      // Assert
      expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { id: 'subscription-id' },
        include: {
          user: true,
          plan: true,
          business: true,
          professional: true,
        },
      });
      expect(prisma.payment.findFirst).toHaveBeenCalled();
      expect(prisma.payment.update).toHaveBeenCalled();
      expect(prisma.invoice.create).toHaveBeenCalled();
      expect(prisma.business.update).toHaveBeenCalled();
      expect(prisma.subscription.update).toHaveBeenCalled();
      expect(EmailService.sendPaymentConfirmationEmail).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('cancelSubscription', () => {
    it('deve cancelar uma assinatura com sucesso', async () => {
      // Arrange
      const subscriptionMock = {
        id: 'subscription-id',
        userId: 'user-id',
        planId: 'plan-id',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(),
        autoRenew: true,
        user: {
          id: 'user-id',
          name: 'Usuário Teste',
          email: 'usuario@teste.com',
        },
        plan: {
          id: 'plan-id',
          name: 'Plano Premium',
          price: 100,
        },
      };

      (prisma.subscription.findUnique as jest.Mock).mockResolvedValue(subscriptionMock);
      (prisma.subscription.update as jest.Mock).mockResolvedValue({});
      (prisma.cancellationReason.create as jest.Mock).mockResolvedValue({});
      (EmailService.sendEmail as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await PaymentService.cancelSubscription(
        'subscription-id',
        'user-id',
        'Não preciso mais do serviço'
      );

      // Assert
      expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { id: 'subscription-id' },
        include: {
          user: true,
          plan: true,
        },
      });
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'subscription-id' },
        data: {
          status: 'CANCELED',
          autoRenew: false,
        },
      });
      expect(prisma.cancellationReason.create).toHaveBeenCalled();
      expect(EmailService.sendEmail).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Assinatura cancelada com sucesso',
      });
    });
  });
}); 