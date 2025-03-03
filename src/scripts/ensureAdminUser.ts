import prisma from '../config/prisma';
import logger from '../config/logger';

/**
 * Função para garantir que o usuário administrador exista e esteja corretamente configurado
 * Esta função é executada na inicialização do servidor
 * 
 * @returns Promise com o usuário administrador
 */
export async function ensureAdminUser() {
    try {
        logger.info('Verificando se o usuário administrador existe...');
        
        // Definir informações do admin
        const adminEmail = 'anunciargrajau@gmail.com';
        const adminName = 'Administrador Grajau';
        
        // Verificar se o admin já existe
        const existingAdmin = await prisma.user.findFirst({
            where: { email: adminEmail }
        });
        
        if (existingAdmin) {
            logger.info(`Usuário administrador encontrado: ${existingAdmin.email}`);
            
            // Verificar se o admin tem as configurações corretas
            if (existingAdmin.role !== 'ADMIN' || existingAdmin.status !== 'APPROVED') {
                logger.info('Atualizando configurações do usuário administrador...');
                
                // Atualizar o usuário para ter papel de ADMIN e status APPROVED
                const updatedAdmin = await prisma.user.update({
                    where: { id: existingAdmin.id },
                    data: {
                        role: 'ADMIN',
                        status: 'APPROVED'
                    }
                });
                
                logger.info(`Usuário administrador atualizado: ${updatedAdmin.email}`);
                return updatedAdmin;
            }
            
            return existingAdmin;
        } else {
            logger.info(`Usuário administrador não encontrado. Criando novo usuário: ${adminEmail}`);
            
            // Criar um novo usuário administrador
            const newAdmin = await prisma.user.create({
                data: {
                    email: adminEmail,
                    name: adminName,
                    role: 'ADMIN',
                    status: 'APPROVED',
                    clerkId: 'admin_direct_access' // Identificador para acesso direto do admin
                }
            });
            
            logger.info(`Novo usuário administrador criado: ${newAdmin.email}`);
            return newAdmin;
        }
    } catch (error) {
        logger.error('Erro ao verificar/criar usuário administrador:', error);
        throw error;
    }
}

// Executar diretamente se este arquivo for executado com node/ts-node
if (require.main === module) {
    ensureAdminUser()
        .then(admin => {
            logger.info(`Usuário administrador garantido: ${admin.email}`);
            process.exit(0);
        })
        .catch(error => {
            logger.error('Erro ao garantir usuário administrador:', error);
            process.exit(1);
        });
} 