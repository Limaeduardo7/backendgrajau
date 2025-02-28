import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/clerk-sdk-node';
import prisma from '../config/prisma';

export class WebhookController {
  static async handleClerkWebhook(req: Request, res: Response) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new Error('CLERK_WEBHOOK_SECRET não está configurado');
    }

    // Verificar a assinatura do webhook
    const headers = {
      'svix-id': req.headers['svix-id'] as string,
      'svix-timestamp': req.headers['svix-timestamp'] as string,
      'svix-signature': req.headers['svix-signature'] as string,
    };

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(JSON.stringify(req.body), headers) as WebhookEvent;
    } catch (err) {
      console.error('Erro ao verificar webhook:', err);
      return res.status(400).json({ error: 'Webhook inválido' });
    }

    const eventType = evt.type;

    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name } = evt.data;
      const primaryEmail = email_addresses[0]?.email_address;

      if (!primaryEmail) {
        return res.status(400).json({ error: 'Email não encontrado' });
      }

      await prisma.user.create({
        data: {
          clerkId: id,
          email: primaryEmail,
          name: `${first_name || ''} ${last_name || ''}`.trim(),
          role: 'USER',
          status: 'PENDING',
        },
      });
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data;
      await prisma.user.delete({
        where: { clerkId: id },
      });
    }

    return res.status(200).json({ success: true });
  }
} 