import { Resend } from 'resend';
import logger from './logger';

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;

let resend: Resend | null = null;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
} else {
  logger.warn('Chave de API do Resend não configurada. Serviço de email desativado.');
}

export { resend, emailFrom }; 