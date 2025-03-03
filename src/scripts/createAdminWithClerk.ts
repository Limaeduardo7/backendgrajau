import prisma from '../config/prisma';
import { clerkClient } from '@clerk/clerk-sdk-node';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script para criar um usuário administrador completo
 * 
 * Este script:
 * 1. Cria um usuário no Clerk (ou atualiza se já existir)
 * 2. Cria/atualiza o usuário correspondente no banco de dados local
 * 3. Define o papel do usuário como ADMIN
 * 4. Remove privilégios de administrador de outros usuários
 */

async function createAdminWithClerk() {
  try {
    const adminEmail = 'anunciargrajau@gmail.com';
    const adminPassword = '172002Ws$#@';
    const adminName = 'Administrador Grajau';
    
    console.log('Iniciando criação/atualização de administrador...');
    
    // Verificar se o usuário já existe no Clerk
    let clerkUser;
    try {
      const users = await clerkClient.users.getUserList({
        emailAddress: [adminEmail],
      });
      
      clerkUser = users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Erro ao buscar usuário no Clerk:', error);
      return;
    }
    
    // Se o usuário não existir no Clerk, criar
    if (!clerkUser) {
      try {
        console.log(`Criando usuário no Clerk: ${adminEmail}`);
        
        clerkUser = await clerkClient.users.createUser({
          emailAddress: [adminEmail],
          password: adminPassword,
          firstName: adminName.split(' ')[0],
          lastName: adminName.split(' ').slice(1).join(' '),
        });
        
        console.log(`Usuário criado no Clerk com ID: ${clerkUser.id}`);
      } catch (error) {
        console.error('Erro ao criar usuário no Clerk:', error);
        return;
      }
    } else {
      console.log(`Usuário já existe no Clerk: ${clerkUser.id}`);
      
      // Atualizar senha (opcional)
      try {
        // Nota: A atualização de senha via API do Clerk pode requerer configurações adicionais
        console.log('Atualizando informações do usuário no Clerk...');
      } catch (error) {
        console.error('Erro ao atualizar usuário no Clerk:', error);
      }
    }
    
    // Verificar se o usuário já existe no banco de dados local
    let dbUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: adminEmail },
          { clerkId: clerkUser.id }
        ]
      }
    });
    
    // Se o usuário existir, atualizar
    if (dbUser) {
      console.log(`Usuário encontrado no banco de dados: ${dbUser.name}`);
      
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          clerkId: clerkUser.id,
          name: adminName,
          email: adminEmail,
          role: 'ADMIN',
          status: 'APPROVED'
        }
      });
      
      console.log(`Usuário atualizado com sucesso para ADMIN: ${dbUser.name}`);
    } 
    // Se o usuário não existir, criar
    else {
      console.log(`Criando usuário no banco de dados local...`);
      
      dbUser = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          name: adminName,
          email: adminEmail,
          role: 'ADMIN',
          status: 'APPROVED'
        }
      });
      
      console.log(`Usuário criado com sucesso como ADMIN: ${dbUser.name}`);
    }
    
    // Verificar e remover outros administradores
    const otherAdmins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        email: { not: adminEmail }
      }
    });
    
    if (otherAdmins.length > 0) {
      console.log(`Encontrados ${otherAdmins.length} outros administradores. Removendo privilégios...`);
      
      for (const admin of otherAdmins) {
        await prisma.user.update({
          where: { id: admin.id },
          data: { role: 'USER' }
        });
        console.log(`Privilégios de administrador removidos de: ${admin.name} (${admin.email})`);
      }
    }
    
    console.log('Operação concluída com sucesso!');
    console.log(`O usuário ${adminEmail} agora é o único administrador do sistema.`);
    console.log(`Você pode fazer login usando o email ${adminEmail} e a senha configurada.`);
    
  } catch (error) {
    console.error('Erro ao criar/atualizar administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função
createAdminWithClerk(); 