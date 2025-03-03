import { Request, Response } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import logger from '../config/logger';

export class AuthController {
  /**
   * Registra um novo usuário
   * Este método cria um usuário no Clerk e depois no banco de dados local
   */
  register = async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, password } = req.body;

      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ 
          error: 'Dados incompletos', 
          message: 'Nome, sobrenome, email e senha são obrigatórios' 
        });
      }

      // Verificar se o email já existe no Clerk
      const existingUsers = await clerkClient.users.getUserList({
        emailAddress: [email],
      });

      if (existingUsers.length > 0) {
        return res.status(400).json({ 
          error: 'Email já cadastrado', 
          message: 'Este email já está sendo usado por outro usuário' 
        });
      }

      // Criar usuário no Clerk
      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [email],
        password,
        firstName,
        lastName,
      });

      logger.info(`Usuário criado no Clerk: ${clerkUser.id}`);

      // Criar usuário no banco de dados local
      const user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          name: `${firstName} ${lastName}`,
          email,
          role: 'USER',
          status: 'PENDING',
        },
      });

      logger.info(`Usuário criado no banco de dados: ${user.id}`);

      return res.status(201).json({
        message: 'Usuário registrado com sucesso',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      });
    } catch (error) {
      logger.error('Erro ao registrar usuário:', error);
      
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      
      return res.status(500).json({ 
        error: 'Erro interno do servidor', 
        message: 'Não foi possível completar o registro. Tente novamente mais tarde.' 
      });
    }
  };

  /**
   * Verifica o status de autenticação do usuário
   */
  status = async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(200).json({ authenticated: false });
      }

      try {
        const session = await clerkClient.sessions.verifySession(token, token);
        
        if (!session) {
          return res.status(200).json({ authenticated: false });
        }

        const clerkUser = await clerkClient.users.getUser(session.userId);
        
        if (!clerkUser) {
          return res.status(200).json({ authenticated: false });
        }

        // Buscar usuário no banco de dados local
        const user = await prisma.user.findUnique({
          where: { clerkId: clerkUser.id },
        });

        if (!user) {
          return res.status(200).json({ authenticated: false });
        }

        return res.status(200).json({ 
          authenticated: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
          }
        });
      } catch (error) {
        return res.status(200).json({ authenticated: false });
      }
    } catch (error) {
      logger.error('Erro ao verificar status de autenticação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
} 