import mercadopago from '../config/payment';
import { ApiError } from '../utils/ApiError';
import prisma from '../config/prisma';
import EmailService from './EmailService';
import { SubStatus, PayStatus } from '@prisma/client';

interface CheckoutItem {
  id: string;
  title: string;
  description: string;
  picture_url?: string;
  category_id?: string;
  quantity: number;
  currency_id: string;
  unit_price: number;
}

interface CreatePaymentProps {
  planId: string;
  userId: string;
  callbackUrl: string;
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  businessId?: string;
  professionalId?: string;
  cardToken?: string;
  couponCode?: string;
}

interface ProcessPaymentWebhookProps {
  id: string;
  status: string;
  external_reference: string;
  payment_method_id?: string;
  payment_type_id?: string;
  transaction_details?: any;
}

interface RenewSubscriptionProps {
  subscriptionId: string;
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  cardToken?: string;
}

class PaymentService {
  // Criar preferência de pagamento no Mercado Pago
  async createPaymentPreference({
    planId,
    userId,
    callbackUrl,
    paymentMethod,
    businessId,
    professionalId,
    cardToken,
    couponCode,
  }: CreatePaymentProps) {
    try {
      // Buscar plano e usuário
      const plan = await prisma.plan.findUnique({
        where: { id: planId },
        include: { subscriptions: true }
      });

      if (!plan) {
        throw new ApiError(404, 'Plano não encontrado');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new ApiError(404, 'Usuário não encontrado');
      }

      // Verificar se o plano está ativo
      if (!plan.active) {
        throw new ApiError(400, 'Este plano não está disponível no momento');
      }

      // Verificar tipo de plano e entidade relacionada
      if (plan.type === 'BUSINESS' && !businessId) {
        throw new ApiError(400, 'ID da empresa é obrigatório para planos de empresa');
      }

      if (plan.type === 'PROFESSIONAL' && !professionalId) {
        throw new ApiError(400, 'ID do profissional é obrigatório para planos de profissional');
      }

      // Aplicar desconto de cupom, se fornecido
      let finalPrice = Number(plan.price);
      let discountApplied = false;
      
      if (couponCode) {
        // Buscar cupom no banco de dados
        // Implementar lógica de cupom quando o modelo estiver disponível
        // Por enquanto, não aplicamos desconto
      }

      // Criar item para checkout
      const checkoutItem: CheckoutItem = {
        id: plan.id,
        title: `Plano ${plan.name}`,
        description: plan.description,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: finalPrice,
      };

      // Calcular data de término da assinatura
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration);

      // Criar assinatura pendente
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          planId,
          status: 'ACTIVE' as SubStatus, // Começa como ativa
          startDate,
          endDate,
          autoRenew: true,
          businessId,
          professionalId,
        },
      });

      // Referência externa (usada para identificar o pagamento no webhook)
      const externalReference = `sub_${subscription.id}`;

      // Configurar preferência de pagamento de acordo com o método escolhido
      const preferenceOptions: any = {
        items: [checkoutItem],
        external_reference: externalReference,
        back_urls: {
          success: `${callbackUrl}/success`,
          failure: `${callbackUrl}/failure`,
          pending: `${callbackUrl}/pending`,
        },
        auto_return: 'approved',
        payment_methods: {
          excluded_payment_types: [],
          installments: 1
        },
        notification_url: `${process.env.API_URL}/payments/webhook`,
      };

      // Configurar métodos de pagamento específicos
      if (paymentMethod === 'credit_card') {
        preferenceOptions.payment_methods.excluded_payment_types = [
          { id: 'ticket' },
          { id: 'atm' },
          { id: 'bank_transfer' }
        ];
      } else if (paymentMethod === 'pix') {
        preferenceOptions.payment_methods.excluded_payment_types = [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'ticket' },
          { id: 'atm' }
        ];
      } else if (paymentMethod === 'boleto') {
        preferenceOptions.payment_methods.excluded_payment_types = [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'bank_transfer' }
        ];
      }

      // Criar preferência de pagamento no Mercado Pago
      const preference = await mercadopago.preferences.create(preferenceOptions);

      // Criar registro de pagamento
      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          amount: finalPrice,
          status: 'PENDING' as PayStatus,
          paymentMethod: paymentMethod.toUpperCase(),
          paymentIntentId: preference.body.id,
        },
      });

      return {
        preferenceId: preference.body.id,
        initPoint: preference.body.init_point,
        subscriptionId: subscription.id,
      };
    } catch (error) {
      console.error('Erro ao criar preferência de pagamento:', error);
      throw error;
    }
  }

  // Processar webhook de pagamento do Mercado Pago
  async processPaymentWebhook({
    id,
    status,
    external_reference,
    payment_method_id,
    payment_type_id,
    transaction_details,
  }: ProcessPaymentWebhookProps) {
    try {
      console.log(`Processando webhook de pagamento: ID ${id}, Status ${status}`);
      
      // Verificar se é uma referência de assinatura
      if (!external_reference || !external_reference.startsWith('sub_')) {
        throw new ApiError(400, 'Referência externa inválida');
      }

      const subscriptionId = external_reference.replace('sub_', '');

      // Buscar assinatura
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          user: true,
          plan: true,
          business: true,
          professional: true,
        },
      });

      if (!subscription) {
        throw new ApiError(404, 'Assinatura não encontrada');
      }

      // Buscar pagamento
      const payment = await prisma.payment.findFirst({
        where: { subscriptionId },
        orderBy: { createdAt: 'desc' }
      });

      if (!payment) {
        throw new ApiError(404, 'Pagamento não encontrado');
      }

      // Atualizar status do pagamento
      let paymentStatus: PayStatus;
      let subscriptionStatus: SubStatus;

      switch (status) {
        case 'approved':
          paymentStatus = 'PAID' as PayStatus;
          subscriptionStatus = 'ACTIVE' as SubStatus;
          break;
        case 'rejected':
        case 'cancelled':
          paymentStatus = 'FAILED' as PayStatus;
          subscriptionStatus = 'CANCELED' as SubStatus;
          break;
        case 'refunded':
          paymentStatus = 'REFUNDED' as PayStatus;
          subscriptionStatus = 'CANCELED' as SubStatus;
          break;
        case 'pending':
        case 'in_process':
          paymentStatus = 'PENDING' as PayStatus;
          subscriptionStatus = 'ACTIVE' as SubStatus;
          break;
        default:
          paymentStatus = 'PENDING' as PayStatus;
          subscriptionStatus = 'ACTIVE' as SubStatus;
          break;
      }

      // Atualizar pagamento com detalhes adicionais
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: paymentStatus,
          paidAt: paymentStatus === 'PAID' ? new Date() : null,
        },
      });

      // Criar fatura se o pagamento foi aprovado
      if (paymentStatus === 'PAID') {
        const invoiceNumber = `INV-${Date.now()}`;
        
        await prisma.invoice.create({
          data: {
            paymentId: payment.id,
            number: invoiceNumber,
          },
        });

        // Atualizar status da entidade relacionada (empresa ou profissional)
        if (subscription.businessId) {
          await prisma.business.update({
            where: { id: subscription.businessId },
            data: { 
              status: 'APPROVED',
              featured: true 
            }
          });
        }

        if (subscription.professionalId) {
          await prisma.professional.update({
            where: { id: subscription.professionalId },
            data: { 
              status: 'APPROVED',
              featured: true 
            }
          });
        }

        // Enviar email de confirmação de pagamento
        if (subscription.user && subscription.plan) {
          await EmailService.sendPaymentConfirmationEmail(
            subscription.user.email,
            subscription.user.name,
            subscription.plan.name,
            payment.amount.toString(),
            subscription.endDate.toLocaleDateString('pt-BR')
          );
        }
      }

      // Atualizar status da assinatura
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: subscriptionStatus },
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao processar webhook de pagamento:', error);
      throw error;
    }
  }

  // Renovar assinatura
  async renewSubscription({
    subscriptionId,
    paymentMethod,
    cardToken,
  }: RenewSubscriptionProps) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          user: true,
          plan: true,
        },
      });

      if (!subscription) {
        throw new ApiError(404, 'Assinatura não encontrada');
      }

      if (subscription.status !== 'ACTIVE') {
        throw new ApiError(400, 'Apenas assinaturas ativas podem ser renovadas');
      }

      // Calcular nova data de término
      const newEndDate = new Date(subscription.endDate);
      newEndDate.setDate(newEndDate.getDate() + subscription.plan.duration);

      // Criar item para checkout
      const checkoutItem: CheckoutItem = {
        id: subscription.plan.id,
        title: `Renovação: ${subscription.plan.name}`,
        description: subscription.plan.description,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(subscription.plan.price),
      };

      // Referência externa (usada para identificar o pagamento no webhook)
      const externalReference = `renew_${subscription.id}_${Date.now()}`;

      // Configurar preferência de pagamento
      const preferenceOptions: any = {
        items: [checkoutItem],
        external_reference: externalReference,
        auto_return: 'approved',
        payment_methods: {
          excluded_payment_types: [],
          installments: 1
        },
        notification_url: `${process.env.API_URL}/payments/webhook`,
      };

      // Configurar métodos de pagamento específicos
      if (paymentMethod === 'credit_card') {
        preferenceOptions.payment_methods.excluded_payment_types = [
          { id: 'ticket' },
          { id: 'atm' },
          { id: 'bank_transfer' }
        ];
      } else if (paymentMethod === 'pix') {
        preferenceOptions.payment_methods.excluded_payment_types = [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'ticket' },
          { id: 'atm' }
        ];
      } else if (paymentMethod === 'boleto') {
        preferenceOptions.payment_methods.excluded_payment_types = [
          { id: 'credit_card' },
          { id: 'debit_card' },
          { id: 'bank_transfer' }
        ];
      }

      // Criar preferência de pagamento
      const preference = await mercadopago.preferences.create(preferenceOptions);

      // Criar registro de pagamento
      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          amount: Number(subscription.plan.price),
          status: 'PENDING' as PayStatus,
          paymentMethod: paymentMethod.toUpperCase(),
          paymentIntentId: preference.body.id,
        },
      });

      return {
        preferenceId: preference.body.id,
        initPoint: preference.body.init_point,
        subscriptionId: subscription.id,
      };
    } catch (error) {
      console.error('Erro ao renovar assinatura:', error);
      throw error;
    }
  }

  // Cancelar assinatura
  async cancelSubscription(subscriptionId: string, userId: string, reason?: string) {
    try {
      // Buscar assinatura
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: {
          user: true,
          plan: true,
        },
      });

      if (!subscription) {
        throw new ApiError(404, 'Assinatura não encontrada');
      }

      // Verificar se o usuário tem permissão para cancelar a assinatura
      if (subscription.userId !== userId) {
        throw new ApiError(403, 'Você não tem permissão para cancelar esta assinatura');
      }

      // Verificar se a assinatura já está cancelada
      if (subscription.status === 'CANCELED') {
        throw new ApiError(400, 'Esta assinatura já está cancelada');
      }

      // Atualizar status da assinatura
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: { 
          status: 'CANCELED' as SubStatus,
          autoRenew: false,
          updatedAt: new Date(),
        },
      });

      // Registrar motivo do cancelamento, se fornecido
      if (reason) {
        await prisma.cancellationReason.create({
          data: {
            subscriptionId,
            userId,
            reason,
          }
        });
      }

      // Enviar email de confirmação de cancelamento
      if (subscription.user && subscription.plan) {
        await EmailService.sendSubscriptionCancelationEmail(
          subscription.user.email,
          subscription.user.name,
          subscription.plan.name
        );
      }

      return { 
        success: true,
        message: 'Assinatura cancelada com sucesso'
      };
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  }

  // Verificar assinaturas prestes a expirar
  async checkExpiringSubscriptions() {
    try {
      // Buscar assinaturas que expiram nos próximos 7 dias
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const expiringSubscriptions = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            gte: today,
            lte: nextWeek
          }
        },
        include: {
          user: true,
          plan: true
        }
      });

      // Enviar emails de notificação
      for (const subscription of expiringSubscriptions) {
        if (subscription.user && subscription.plan) {
          await EmailService.sendSubscriptionExpiringEmail(
            subscription.user.email,
            subscription.user.name,
            subscription.plan.name,
            subscription.endDate.toLocaleDateString('pt-BR')
          );
        }
      }

      return { 
        processed: expiringSubscriptions.length,
        subscriptions: expiringSubscriptions.map(s => ({
          id: s.id,
          userId: s.userId,
          planId: s.planId,
          endDate: s.endDate
        }))
      };
    } catch (error: any) {
      console.error('Erro ao verificar assinaturas prestes a expirar:', error);
      throw error;
    }
  }

  // Processar renovações automáticas
  async processAutoRenewals() {
    try {
      // Buscar assinaturas que expiram hoje e têm renovação automática ativada
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const subscriptionsToRenew = await prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          autoRenew: true,
          endDate: {
            gte: today,
            lt: tomorrow
          }
        },
        include: {
          user: true,
          plan: true,
          payments: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        }
      });

      const results = [];

      // Processar cada renovação
      for (const subscription of subscriptionsToRenew) {
        try {
          // Verificar se há um método de pagamento recente
          const lastPayment = subscription.payments[0];
          
          if (!lastPayment) {
            continue;
          }

          // Renovar usando o mesmo método de pagamento
          const paymentMethod = lastPayment.paymentMethod.toLowerCase() as 'credit_card' | 'pix' | 'boleto';
          
          const renewalResult = await this.renewSubscription({
            subscriptionId: subscription.id,
            paymentMethod
          });

          results.push({
            subscriptionId: subscription.id,
            userId: subscription.userId,
            planId: subscription.planId,
            status: 'renewed',
            preferenceId: renewalResult.preferenceId
          });
        } catch (error) {
          console.error(`Erro ao renovar assinatura ${subscription.id}:`, error);
          results.push({
            subscriptionId: subscription.id,
            userId: subscription.userId,
            planId: subscription.planId,
            status: 'error',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      return { 
        processed: subscriptionsToRenew.length,
        results
      };
    } catch (error: any) {
      console.error('Erro ao processar renovações automáticas:', error);
      throw error;
    }
  }

  // Obter informações de pagamento
  async getPaymentInfo(paymentId: string, source: string = 'api') {
    try {
      // Buscar pagamento no banco de dados
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          subscription: {
            include: {
              user: true,
              plan: true,
              business: true,
              professional: true
            }
          }
        }
      });

      if (!payment) {
        throw new ApiError(404, 'Pagamento não encontrado');
      }

      // Se o pagamento tiver um ID de intenção do Mercado Pago, buscar informações adicionais
      let mpPaymentInfo = null;
      if (payment.paymentIntentId) {
        try {
          // Buscar informações do pagamento no Mercado Pago
          const mpResponse = await mercadopago.preferences.get(payment.paymentIntentId);
          mpPaymentInfo = mpResponse.body;
        } catch (mpError) {
          console.error('Erro ao buscar informações do Mercado Pago:', mpError);
          // Não falhar se não conseguir obter informações do Mercado Pago
        }
      }

      return {
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          createdAt: payment.createdAt,
          paidAt: payment.paidAt
        },
        subscription: payment.subscription ? {
          id: payment.subscription.id,
          status: payment.subscription.status,
          startDate: payment.subscription.startDate,
          endDate: payment.subscription.endDate,
          plan: payment.subscription.plan ? {
            id: payment.subscription.plan.id,
            name: payment.subscription.plan.name,
            price: payment.subscription.plan.price
          } : null,
          user: payment.subscription.user ? {
            id: payment.subscription.user.id,
            name: payment.subscription.user.name,
            email: payment.subscription.user.email
          } : null
        } : null,
        mercadoPago: mpPaymentInfo,
        source
      };
    } catch (error: any) {
      console.error('Erro ao obter informações de pagamento:', error);
      throw error;
    }
  }
}

export default new PaymentService();