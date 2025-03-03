import prisma from '../config/prisma';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script para criar ou atualizar um usuário administrador
 * 
 * Este script verifica se existe um usuário com o email fornecido
 * Se existir, atualiza seu papel para ADMIN
 * Se não existir, cria um novo usuário com papel ADMIN
 * 
 * Nota: Como o sistema usa Clerk para autenticação, este script apenas
 * configura o usuário no banco de dados local. O usuário ainda precisa
 * ser criado no Clerk com o mesmo email.
 */

async function createOrUpdateAdmin() {
  try {
    const adminEmail = 'anunciargrajau@gmail.com';
    // A senha '172002Ws$#@' deve ser configurada no Clerk, não aqui
    
    console.log(`Procurando usuário com email: ${adminEmail}`);
    
    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (existingUser) {
      console.log(`Usuário encontrado: ${existingUser.name}`);
      
      // Atualizar o papel do usuário para ADMIN
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          role: 'ADMIN',
          status: 'APPROVED'
        }
      });
      
      console.log(`Usuário atualizado com sucesso para ADMIN: ${updatedUser.name}`);
    } else {
      console.log(`Usuário não encontrado. É necessário criar o usuário no Clerk primeiro.`);
      console.log(`Depois de criar o usuário no Clerk, execute este script novamente.`);
      
      // Nota: Não podemos criar um usuário completo sem o clerkId
      // que é obtido ao registrar o usuário no Clerk
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
  } catch (error) {
    console.error('Erro ao criar/atualizar administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a função
createOrUpdateAdmin(); 