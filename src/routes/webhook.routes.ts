import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import prisma from '../config/prisma';

const router = Router();

interface WebhookEvent {
  type: string;
  data: {
    id: string;
    first_name: string;
    last_name: string;
    email_addresses: Array<{
      email_address: string;
    }>;
  };
}

// Webhook do Clerk
router.post('/clerk', async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('Webhook secret não configurado');
    }

    const webhook = new Webhook(webhookSecret);
    const payload = webhook.verify(
      JSON.stringify(req.body),
      {
        'svix-id': req.headers['svix-id'] as string,
        'svix-timestamp': req.headers['svix-timestamp'] as string,
        'svix-signature': req.headers['svix-signature'] as string,
      }
    ) as WebhookEvent;

    const { type, data } = payload;

    switch (type) {
      case 'user.created':
        await prisma.user.create({
          data: {
            clerkId: data.id,
            name: `${data.first_name} ${data.last_name}`,
            email: data.email_addresses[0].email_address,
            role: 'USER',
            status: 'PENDING',
          },
        });
        break;

      case 'user.updated':
        await prisma.user.update({
          where: { clerkId: data.id },
          data: {
            name: `${data.first_name} ${data.last_name}`,
            email: data.email_addresses[0].email_address,
          },
        });
        break;

      case 'user.deleted':
        await prisma.user.delete({
          where: { clerkId: data.id },
        });
        break;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(400).json({ error: 'Webhook inválido' });
  }
});

export default router; 