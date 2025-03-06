import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import PaymentService from '../services/PaymentService';
import EmailService from '../services/EmailService';
import { Prisma, PrismaClient } from '@prisma/client';

class PaymentController {
  // ===== PLANOS =====
  
  // Criar um novo plano
  async createPlan(req: Request, res: Response) {
    try {
      const { name, description, price, duration, type, features, active } = req.body;
      
      const plan = await prisma.plan.create({
        data: {
          name,
          description,
          price,
          duration,
          type,
          features,
          active: active ?? true
        }
      });
      
      return res.status(201).json(plan);
    } catch (error) {
      console.error('Erro ao criar plano:', error);
      return res.status(500).json({ error: 'Erro ao criar plano' });
    }
  }
  
  // Listar todos os planos
  async getPlans(req: Request, res: Response) {
    try {
      const { type, active } = req.query;
      
      const where: any = {};
      
      if (type) {
        where.type = type;
      }
      
      if (active !== undefined) {
        where.active = active === 'true';
      }
      
      const plans = await prisma.plan.findMany({
        where,
        orderBy: { price: 'asc' }
      });
      
      return res.json(plans);
    } catch (error) {
      console.error('Erro ao listar planos:', error);
      return res.status(500).json({ error: 'Erro ao listar planos' });
    }
  }
  
  // Obter um plano específico
  async getPlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const plan = await prisma.plan.findUnique({
        where: { id }
      });
      
      if (!plan) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }
      
      return res.json(plan);
    } catch (error) {
      console.error('Erro ao buscar plano:', error);
      return res.status(500).json({ error: 'Erro ao buscar plano' });
    }
  }
  
  // Atualizar um plano
  async updatePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, price, duration, type, features, active } = req.body;
      
      const plan = await prisma.plan.update({
        where: { id },
        data: {
          name,
          description,
          price,
          duration,
          type,
          features,
          active
        }
      });
      
      return res.json(plan);
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      return res.status(500).json({ error: 'Erro ao atualizar plano' });
    }
  }
  
  // Excluir um plano
  async deletePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Verificar se existem assinaturas ativas para este plano
      const activeSubscriptions = await prisma.subscription.count({
        where: {
          planId: id,
          status: 'ACTIVE'
        }
      });
      
      if (activeSubscriptions > 0) {
        return res.status(400).json({ 
          error: 'Não é possível excluir um plano com assinaturas ativas',
          activeSubscriptions
        });
      }
      
      await prisma.plan.delete({
        where: { id }
      });
      
      return res.json({ success: true, message: 'Plano excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      return res.status(500).json({ error: 'Erro ao excluir plano' });
    }
  }
  
  // ===== ASSINATURAS =====
  
  // Criar uma nova assinatura
  async createSubscription(req: Request, res: Response) {
    try {
      const { planId, paymentMethod, businessId, professionalId, cardToken, couponCode } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      // Verificar se o usuário já possui uma assinatura ativa para o mesmo tipo
      const plan = await prisma.plan.findUnique({
        where: { id: planId }
      });
      
      if (!plan) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }
      
      // Verificar se já existe uma assinatura ativa para o mesmo recurso
      if (businessId) {
        const existingSubscription = await prisma.subscription.findFirst({
          where: {
            businessId,
            status: 'ACTIVE'
          }
        });
        
        if (existingSubscription) {
          return res.status(400).json({ 
            error: 'Esta empresa já possui uma assinatura ativa',
            subscriptionId: existingSubscription.id
          });
        }
      }
      
      if (professionalId) {
        const existingSubscription = await prisma.subscription.findFirst({
          where: {
            professionalId,
            status: 'ACTIVE'
          }
        });
        
        if (existingSubscription) {
          return res.status(400).json({ 
            error: 'Este profissional já possui uma assinatura ativa',
            subscriptionId: existingSubscription.id
          });
        }
      }
      
      // Obter URL de callback do frontend
      const callbackUrl = process.env.FRONTEND_URL || 'http://localhost:3000/payment';
      
      // Criar preferência de pagamento
      const paymentPreference = await PaymentService.createPaymentPreference({
        planId,
        userId,
        callbackUrl,
        paymentMethod,
        businessId,
        professionalId,
        cardToken,
        couponCode
      });
      
      return res.json(paymentPreference);
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao criar assinatura' });
    }
  }
  
  // Listar assinaturas do usuário
  async getUserSubscriptions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const subscriptions = await prisma.subscription.findMany({
        where: { userId },
        include: {
          plan: true,
          business: {
            select: {
              id: true,
              name: true
            }
          },
          professional: {
            select: {
              id: true,
              occupation: true
            }
          }
        } as Prisma.SubscriptionInclude
      });
      
      return res.json(subscriptions);
    } catch (error) {
      console.error('Erro ao listar assinaturas:', error);
      return res.status(500).json({ error: 'Erro ao listar assinaturas' });
    }
  }
  
  // Obter detalhes de uma assinatura
  async getSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: {
          plan: true,
          user: true
        } as Prisma.SubscriptionInclude
      });
      
      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }
      
      // Verificar se a assinatura pertence ao usuário
      if (subscription.userId !== userId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Você não tem permissão para acessar esta assinatura' });
      }
      
      return res.json(subscription);
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      return res.status(500).json({ error: 'Erro ao buscar assinatura' });
    }
  }
  
  // Cancelar uma assinatura
  async cancelSubscription(req: Request, res: Response) {
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
  }
  
  // Renovar assinatura manualmente
  async renewSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { paymentMethod, cardToken } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
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
  }

  // Alternar renovação automática
  async toggleAutoRenew(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { autoRenew } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      // Verificar se a assinatura existe e pertence ao usuário
      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: { user: true }
      });
      
      if (!subscription) {
        return res.status(404).json({ error: 'Assinatura não encontrada' });
      }
      
      if (subscription.userId !== userId) {
        return res.status(403).json({ error: 'Você não tem permissão para modificar esta assinatura' });
      }
      
      // Atualizar configuração de renovação automática
      const updatedSubscription = await prisma.subscription.update({
        where: { id },
        data: { autoRenew }
      });
      
      // Enviar email de confirmação
      const actionText = autoRenew ? 'ativada' : 'desativada';
      await EmailService.sendEmail({
        to: subscription.user.email,
        subject: `Renovação automática ${actionText}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4a6da7;">Renovação Automática ${autoRenew ? 'Ativada' : 'Desativada'}</h1>
            <p>Olá, ${subscription.user.name}!</p>
            <p>A renovação automática da sua assinatura foi ${actionText} com sucesso.</p>
            ${autoRenew 
              ? '<p>Quando sua assinatura atual expirar, renovaremos automaticamente por mais um período.</p>' 
              : '<p>Quando sua assinatura atual expirar, você precisará renová-la manualmente para continuar utilizando os recursos.</p>'
            }
            <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
          </div>
        `,
      });
      
      return res.json({
        success: true,
        message: `Renovação automática ${actionText} com sucesso`,
        subscription: updatedSubscription
      });
    } catch (error) {
      console.error('Erro ao alternar renovação automática:', error);
      return res.status(500).json({ error: 'Erro ao alternar renovação automática' });
    }
  }
  
  // ===== PAGAMENTOS =====
  
  // Listar pagamentos do usuário
  async getUserPayments(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const { status } = req.query;
      
      const where: any = {
        subscription: {
          userId
        }
      };
      
      if (status) {
        where.status = status;
      }
      
      const payments = await prisma.payment.findMany({
        where,
        include: {
          subscription: {
            include: {
              plan: true,
              business: {
                select: {
                  id: true,
                  name: true
                }
              },
              professional: {
                select: {
                  id: true,
                  occupation: true
                }
              }
            }
          },
          invoice: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return res.json(payments);
    } catch (error) {
      console.error('Erro ao listar pagamentos:', error);
      return res.status(500).json({ error: 'Erro ao listar pagamentos' });
    }
  }
  
  // Obter detalhes de um pagamento
  async getPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          subscription: {
            include: {
              user: true,
              plan: true
            }
          },
          invoice: true
        } as Prisma.PaymentInclude
      });
      
      if (!payment) {
        return res.status(404).json({ error: 'Pagamento não encontrado' });
      }
      
      // Verificar se o pagamento pertence ao usuário
      if (payment.subscription.userId !== userId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Você não tem permissão para acessar este pagamento' });
      }
      
      return res.json(payment);
    } catch (error) {
      console.error('Erro ao buscar pagamento:', error);
      return res.status(500).json({ error: 'Erro ao buscar pagamento' });
    }
  }
  
  // Processar webhook de pagamento
  async handlePaymentWebhook(req: Request, res: Response) {
    try {
      const { id, topic } = req.query;
      
      if (topic === 'payment') {
        const paymentInfo = await PaymentService.getPaymentInfo(id as string, 'webhook');
        
        // Processar o pagamento
        const result = await PaymentService.processPaymentWebhook({
          id: paymentInfo.payment.id,
          status: paymentInfo.payment.status,
          external_reference: paymentInfo.mercadoPago?.external_reference,
          payment_method_id: paymentInfo.mercadoPago?.payment_method_id,
          payment_type_id: paymentInfo.mercadoPago?.payment_type_id,
          transaction_details: paymentInfo.mercadoPago?.transaction_details
        });
      }
      
      return res.status(200).send('OK');
    } catch (error) {
      console.error('Erro ao processar webhook de pagamento:', error);
      return res.status(500).json({ error: 'Erro ao processar webhook de pagamento' });
    }
  }
  
  // Verificar assinaturas prestes a expirar (rota administrativa)
  async checkExpiringSubscriptions(req: Request, res: Response) {
    try {
      // Verificar se o usuário é administrador
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const result = await PaymentService.checkExpiringSubscriptions();
      
      return res.json({
        success: true,
        message: `${result.processed} assinaturas verificadas e notificadas`,
        ...result
      });
    } catch (error) {
      console.error('Erro ao verificar assinaturas expirando:', error);
      return res.status(500).json({ error: 'Erro ao verificar assinaturas expirando' });
    }
  }

  // Processar renovações automáticas (rota administrativa)
  async processAutoRenewals(req: Request, res: Response) {
    try {
      // Verificar se o usuário é administrador
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      
      const result = await PaymentService.processAutoRenewals();
      
      return res.json({
        success: true,
        message: `${result.processed} assinaturas renovadas automaticamente`,
        ...result
      });
    } catch (error) {
      console.error('Erro ao processar renovações automáticas:', error);
      return res.status(500).json({ error: 'Erro ao processar renovações automáticas' });
    }
  }
  
  // ===== FATURAS =====
  
  // Listar faturas do usuário
  async getUserInvoices(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const invoices = await prisma.invoice.findMany({
        where: {
          payment: {
            subscription: {
              userId
            }
          }
        },
        include: {
          payment: {
            include: {
              subscription: {
                include: {
                  plan: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return res.json(invoices);
    } catch (error) {
      console.error('Erro ao listar faturas:', error);
      return res.status(500).json({ error: 'Erro ao listar faturas' });
    }
  }
  
  // Obter detalhes de uma fatura
  async getInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          payment: {
            include: {
              subscription: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      document: true
                    }
                  },
                  plan: true,
                  business: {
                    select: {
                      id: true,
                      name: true
                    }
                  },
                  professional: {
                    select: {
                      id: true,
                      occupation: true
                    }
                  }
                }
              }
            }
          }
        }
      });
      
      if (!invoice) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }
      
      // Verificar se a fatura pertence ao usuário
      if (invoice.payment.subscription.userId !== userId && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Você não tem permissão para acessar esta fatura' });
      }
      
      return res.json(invoice);
    } catch (error) {
      console.error('Erro ao buscar fatura:', error);
      return res.status(500).json({ error: 'Erro ao buscar fatura' });
    }
  }
  
  // Gerar PDF da fatura
  async getInvoicePdf(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }
      
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          payment: {
            include: {
              subscription: {
                include: {
                  user: true,
                  plan: true
                }
              }
            }
          }
        }
      });
      
      if (!invoice) {
        return res.status(404).json({ error: 'Fatura não encontrada' });
      }
      
      // Verificar se a fatura pertence ao usuário
      if (invoice.payment.subscription.userId !== userId) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar esta fatura' });
      }
      
      // Aqui você implementaria a geração real do PDF
      // Por enquanto, apenas retornamos uma mensagem de sucesso
      return res.json({ 
        success: true, 
        message: 'PDF gerado com sucesso',
        downloadUrl: `/api/invoices/${id}/download`
      });
    } catch (error) {
      console.error('Erro ao gerar PDF da fatura:', error);
      return res.status(500).json({ error: 'Erro ao gerar PDF da fatura' });
    }
  }
}

export default new PaymentController(); 