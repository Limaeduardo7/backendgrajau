import { Resend } from 'resend';
import dotenv from 'dotenv';
import logger from '../config/logger';

dotenv.config();

// Verificar se a chave de API está definida
const apiKey = process.env.RESEND_API_KEY;
let resend: Resend | null = null;

try {
  if (apiKey && apiKey !== 're_123456789') {
    resend = new Resend(apiKey);
    logger.info('Serviço de email Resend inicializado com sucesso');
  } else {
    logger.warn('Chave de API do Resend não configurada corretamente. Serviço de email desativado.');
  }
} catch (error) {
  logger.error('Erro ao inicializar o serviço de email Resend:', error);
}

export class EmailService {
  async sendWelcomeEmail(email: string, name: string) {
    try {
      if (!resend) {
        logger.warn(`Tentativa de enviar email de boas-vindas para ${email}, mas o serviço de email está desativado`);
        return { success: false, message: 'Serviço de email desativado' };
      }
      
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Anunciar Grajaú <noreply@anunciargrajau.com.br>',
        to: email,
        subject: 'Bem-vindo ao Anunciar Grajaú!',
        html: `
          <h1>Olá ${name}!</h1>
          <p>Seja bem-vindo ao Anunciar Grajaú!</p>
          <p>Estamos muito felizes em ter você conosco. Aqui você poderá encontrar e divulgar negócios, serviços e oportunidades na região do Grajaú.</p>
          <p>Se precisar de ajuda, não hesite em nos contatar.</p>
          <br>
          <p>Atenciosamente,</p>
          <p>Equipe Anunciar Grajaú</p>
        `
      });
      logger.info(`Email de boas-vindas enviado para ${email}`);
      return { success: true };
    } catch (error) {
      logger.error(`Erro ao enviar email de boas-vindas para ${email}:`, error);
      return { success: false, error };
    }
  }

  // Outros métodos de envio de email...
} 