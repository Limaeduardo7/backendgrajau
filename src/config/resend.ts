// Importar o Resend usando require
const { Resend } = require('resend');
import { config } from 'dotenv';
import logger from './logger';

config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
let resendInstance = null;

try {
  if (RESEND_API_KEY) {
    resendInstance = new Resend(RESEND_API_KEY);
    logger.info('Serviço Resend inicializado com sucesso');
  } else {
    logger.warn('Chave de API do Resend não configurada. Serviço de email desativado.');
  }
} catch (error) {
  logger.error('Erro ao inicializar o serviço Resend:', error);
}

// Exporta o resend (pode ser null se a configuração falhar)
export const resend = resendInstance; 