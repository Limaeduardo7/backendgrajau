import { PrismaClient } from '@prisma/client'

// Criar o cliente Prisma usando a variável de ambiente DATABASE_URL
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    },
  },
});

console.log('Iniciando conexão com banco de dados (database.ts):', process.env.DATABASE_URL);

export default prisma 