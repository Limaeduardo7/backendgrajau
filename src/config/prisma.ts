import { PrismaClient } from '@prisma/client';

// Conexão direta com o Supabase
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    },
  },
});

console.log('Iniciando conexão com banco de dados:', process.env.DATABASE_URL);

export default prisma; 