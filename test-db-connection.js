// Arquivo de teste para verificar a conexão com o banco de dados Supabase
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Criar uma instância do PrismaClient com log detalhado
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Verificar a conexão com o banco de dados
async function testConnection() {
  console.log('Tentando conectar ao banco de dados...');
  console.log(`URL do banco de dados: ${process.env.DATABASE_URL}`);
  
  try {
    // Realizar uma consulta simples
    await prisma.$connect();
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
    
    // Verificar se o banco está funcionando com uma consulta básica
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log('Consulta executada com sucesso:', result);
    
    await prisma.$disconnect();
    console.log('Desconectado do banco de dados.');
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
  }
}

testConnection(); 