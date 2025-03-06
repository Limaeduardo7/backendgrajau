import app from './app';
import dotenv from 'dotenv';
import checkRequiredEnvVars from './utils/checkEnv';

// Carrega variáveis de ambiente
dotenv.config();

// Verifica se todas as variáveis de ambiente obrigatórias estão configuradas
checkRequiredEnvVars();

const PORT = process.env.PORT || 3001;
 
// Inicia o servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📚 Documentação da API disponível em: http://localhost:${PORT}/api-docs`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'desenvolvimento'}`);
}); 