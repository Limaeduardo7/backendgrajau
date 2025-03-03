import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../config/prisma';
import logger from '../config/logger';

async function createAdminUser() {
  const email = 'anunciargrajau@gmail.com';
  const password = 'Grajau@2024';
  const firstName = 'Admin';
  const lastName = 'Grajau';

  try {
    logger.info(`Iniciando criação de usuário administrador: ${email}`);

    // Verificar se o usuário já existe no Clerk
    const existingUsers = await clerkClient.users.getUserList({
      emailAddress: [email],
    });

    let clerkUser;

    if (existingUsers.length > 0) {
      logger.info(`Usuário já existe no Clerk: ${existingUsers[0].id}`);
      clerkUser = existingUsers[0];
    } else {
      // Criar usuário no Clerk
      clerkUser = await clerkClient.users.createUser({
        emailAddress: [email],
        password,
        firstName,
        lastName,
      });
      logger.info(`Usuário criado no Clerk: ${clerkUser.id}`);
    }

    // Verificar se o usuário já existe no banco de dados local
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      logger.info(`Usuário já existe no banco de dados: ${existingUser.id}`);
      
      // Atualizar o papel para ADMIN se ainda não for
      if (existingUser.role !== 'ADMIN') {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'ADMIN', status: 'APPROVED' },
        });
        logger.info(`Usuário atualizado para ADMIN: ${existingUser.id}`);
      }
      
      return existingUser;
    }

    // Criar usuário no banco de dados local
    const user = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        name: `${firstName} ${lastName}`,
        email,
        role: 'ADMIN',
        status: 'APPROVED',
      },
    });

    logger.info(`Usuário administrador criado com sucesso: ${user.id}`);
    return user;
  } catch (error) {
    logger.error('Erro ao criar usuário administrador:', error);
    throw error;
  }
}

// Executar a função se este arquivo for executado diretamente
if (require.main === module) {
  createAdminUser()
    .then((user) => {
      logger.info(`Script concluído. Usuário: ${user?.id}`);
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Falha no script:', error);
      process.exit(1);
    });
}

export default createAdminUser; 