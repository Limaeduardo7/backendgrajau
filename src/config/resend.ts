// Importar o Resend usando require
const { Resend } = require('resend');
import { config } from 'dotenv';

config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  throw new Error('Missing RESEND_API_KEY');
}

export const resend = new Resend(RESEND_API_KEY); 