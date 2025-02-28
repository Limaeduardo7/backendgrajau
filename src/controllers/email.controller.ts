import { Request, Response } from 'express';
import { EmailService } from '../services/email.service';
import { ApiError } from '../utils/ApiError';

export class EmailController {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  testEmail = async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;

      if (!email || !name) {
        throw new ApiError(400, 'Email e nome são obrigatórios');
      }

      await this.emailService.sendWelcomeEmail(email, name);

      res.json({ message: 'Email de teste enviado com sucesso' });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        console.error('Erro ao enviar email de teste:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  };
} 