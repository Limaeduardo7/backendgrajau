import prisma from '../config/prisma';
import logger from '../config/logger';

/**
 * Script para configurar o modelo Notification no banco de dados
 * Este script deve ser executado após a migração do Prisma
 */
async function setupNotifications() {
  try {
    logger.info('Iniciando configuração do modelo Notification');

    // Verificar se a tabela Notification já existe
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Notification" LIMIT 1`;
      logger.info('Tabela Notification já existe');
      return;
    } catch (error) {
      logger.info('Tabela Notification não encontrada, criando...');
    }

    // Criar a tabela Notification
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "entityId" TEXT,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `;

    // Criar índices
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId")
    `;

    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read")
    `;

    logger.info('Tabela Notification criada com sucesso');
  } catch (error) {
    logger.error('Erro ao configurar modelo Notification:', error);
    throw error;
  }
}

// Executar a função se este arquivo for executado diretamente
if (require.main === module) {
  setupNotifications()
    .then(() => {
      logger.info('Script concluído com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Falha no script:', error);
      process.exit(1);
    });
}

export default setupNotifications; 