// Importar o Mercado Pago usando require
const mercadopago = require('mercadopago');
import { config } from 'dotenv';

config();

// Configurar o Mercado Pago com o token de acesso
mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
});

export default mercadopago; 