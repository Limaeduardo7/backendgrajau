import express from 'express';
import dotenv from 'dotenv';
import mercadopago from './config/payment';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
app.use(express.json());

// Rota para testar o Mercado Pago
app.get('/test-mercadopago', async (req, res) => {
  try {
    // Criar uma preferência de pagamento simples
    const preference = await mercadopago.preferences.create({
      items: [
        {
          title: 'Produto de teste',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: 10.0
        }
      ],
      back_urls: {
        success: 'http://localhost:3000/success',
        failure: 'http://localhost:3000/failure',
        pending: 'http://localhost:3000/pending'
      },
      auto_return: 'approved'
    });

    res.json({
      message: 'Mercado Pago está funcionando corretamente',
      preferenceId: preference.body.id,
      initPoint: preference.body.init_point
    });
  } catch (error: any) {
    console.error('Erro ao testar o Mercado Pago:', error);
    res.status(500).json({
      message: 'Erro ao testar o Mercado Pago',
      error: error.message
    });
  }
});

// Rota para verificar se o servidor está funcionando
app.get('/', (req, res) => {
  res.json({ message: 'Servidor de teste funcionando!' });
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`🚀 Servidor de teste rodando na porta ${PORT}`);
}); 