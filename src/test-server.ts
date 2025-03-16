import express from 'express';
import cors from 'cors';

const app = express();

// Configurações básicas
app.use(express.json());
app.use(cors());

// Rota de teste
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor de teste está funcionando!' });
});

// Rota para criar post
app.post('/public/blog/posts', (req, res) => {
  console.log('Recebida requisição POST:', req.body);
  res.json({ 
    message: 'Rota POST funcionando!',
    receivedData: req.body 
  });
});

// Inicia o servidor
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor de teste rodando em http://localhost:${PORT}`);
}); 