import { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import PaymentService from '../services/PaymentService';
import prisma from '../config/prisma';
import mercadopago from '../config/payment';

// Definindo uma interface para estender o Request
interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: string;
    email: string;
  };
}

class PaymentController {
  // Criar uma nova assinatura
  createSubscription = async (req: AuthRequest, res: Response) => {
    try {
      const { planId, paymentMethod, businessId, professionalId, callbackUrl } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const result = await PaymentService.createPaymentPreference({
        planId,
        userId,
        callbackUrl,
        paymentMethod,
        businessId,
        professionalId
      });
      
      return res.json(result);
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao criar assinatura' });
    }
  };

  // Processar webhook do Mercado Pago
  processWebhook = async (req: Request, res: Response) => {
    try {
      const { type, data } = req.query;
      
      // Verificar se é uma notificação de pagamento
      if (type === 'payment') {
        const paymentId = typeof data === 'string' ? data : '';
        
        if (!paymentId) {
          return res.status(400).json({ error: 'ID de pagamento não fornecido' });
        }
        
        // Buscar informações do pagamento no Mercado Pago
        const mpPayment = await mercadopago.payment.get(paymentId);
        
        // Processar o pagamento
        const result = await PaymentService.processPaymentWebhook({
          id: mpPayment.body.id,
          status: mpPayment.body.status,
          external_reference: mpPayment.body.external_reference,
          payment_method_id: mpPayment.body.payment_method_id,
          payment_type_id: mpPayment.body.payment_type_id,
          transaction_details: mpPayment.body.transaction_details
        });
        
        return res.json(result);
      }
      
      // Se não for uma notificação de pagamento, apenas retornar sucesso
      return res.json({ success: true });
    } catch (error) {
      console.error('Erro ao processar webhook:', error);
      return res.status(500).json({ error: 'Erro ao processar webhook' });
    }
  };

  // Cancelar uma assinatura
  cancelSubscription = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const result = await PaymentService.cancelSubscription(id, userId, reason);
      
      return res.json(result);
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao cancelar assinatura' });
    }
  };

  // Renovar assinatura manualmente
  renewSubscription = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { paymentMethod, cardToken } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      // Verificar se o usuário tem permissão para renovar esta assinatura
      const subscription = await prisma.subscription.findUnique({
        where: { id },
      });
      
      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }
      
      if (subscription.userId !== userId) {
        return res.status(403).json({ error: 'Você não tem permissão para renovar esta assinatura' });
      }
      
      const result = await PaymentService.renewSubscription({
        subscriptionId: id,
        paymentMethod,
        cardToken
      });
      
      return res.json(result);
    } catch (error) {
      console.error('Erro ao renovar assinatura:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao renovar assinatura' });
    }
  };

  // Verificar assinaturas prestes a expirar (tarefa administrativa)
  checkExpiringSubscriptions = async (req: AuthRequest, res: Response) => {
    try {
      // Verificar se o usuário é administrador
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const result = await PaymentService.checkExpiringSubscriptions();
      
      return res.json(result);
    } catch (error) {
      console.error('Erro ao verificar assinaturas:', error);
      return res.status(500).json({ error: 'Erro ao verificar assinaturas' });
    }
  };

  // Processar renovações automáticas (tarefa administrativa)
  processAutoRenewals = async (req: AuthRequest, res: Response) => {
    try {
      // Verificar se o usuário é administrador
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const result = await PaymentService.processAutoRenewals();
      
      return res.json(result);
    } catch (error) {
      console.error('Erro ao processar renovações:', error);
      return res.status(500).json({ error: 'Erro ao processar renovações' });
    }
  };
}

export default new PaymentController(); 