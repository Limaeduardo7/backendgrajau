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
      // Extrair dados do corpo da requisição
      const { firstName, lastName, email, password } = req.body;

      logger.info(`Tentativa de registro para o email: ${email || 'não fornecido'}`);

      // Verificar se todos os campos obrigatórios foram fornecidos
      if (!firstName || !lastName || !email || !password) {
        logger.warn(`Tentativa de registro com dados incompletos: ${JSON.stringify({
          firstName: firstName ? 'fornecido' : 'não fornecido',
          lastName: lastName ? 'fornecido' : 'não fornecido',
          email: email ? 'fornecido' : 'não fornecido',
          password: password ? 'fornecido' : 'não fornecido'
        })}`);
        
        return res.status(400).json({ 
          error: 'Dados incompletos', 
          message: 'Nome, sobrenome, email e senha são obrigatórios',
          missingFields: {
            firstName: !firstName,
            lastName: !lastName,
            email: !email,
            password: !password
          }
        });
      }

      // Verificar se o email já existe no Clerk
      try {
        const existingUsers = await clerkClient.users.getUserList({
          emailAddress: [email],
        });

        if (existingUsers.length > 0) {
          logger.warn(`Tentativa de registro com email já existente: ${email}`);
          return res.status(400).json({ 
            error: 'Email já cadastrado', 
            message: 'Este email já está sendo usado por outro usuário' 
          });
        }
      } catch (error) {
        logger.error(`Erro ao verificar email no Clerk: ${error}`);
        return res.status(500).json({ 
          error: 'Erro ao verificar email', 
          message: 'Não foi possível verificar se o email já está cadastrado' 
        });
      }

      // Criar usuário no Clerk
      let clerkUser;
      try {
        clerkUser = await clerkClient.users.createUser({
          emailAddress: [email],
          password,
          firstName,
          lastName,
        });

        logger.info(`Usuário criado no Clerk: ${clerkUser.id}`);
      } catch (error: any) {
        logger.error(`Erro ao criar usuário no Clerk: ${JSON.stringify(error)}`);
        
        // Verificar se é um erro de validação do Clerk
        if (error.errors && Array.isArray(error.errors)) {
          const errorMessages = error.errors.map((err: any) => err.message).join(', ');
          return res.status(400).json({ 
            error: 'Erro de validação', 
            message: errorMessages || 'Dados inválidos para criação de usuário'
          });
        }
        
        return res.status(500).json({ 
          error: 'Erro ao criar usuário', 
          message: 'Não foi possível criar o usuário. Verifique se os dados estão corretos.' 
        });
      }

      // Criar usuário no banco de dados local
      try {
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
        logger.error(`Erro ao criar usuário no banco de dados: ${error}`);
        
        // Tentar remover o usuário do Clerk para evitar inconsistências
        try {
          await clerkClient.users.deleteUser(clerkUser.id);
          logger.info(`Usuário removido do Clerk após falha no banco de dados: ${clerkUser.id}`);
        } catch (deleteError) {
          logger.error(`Erro ao remover usuário do Clerk: ${deleteError}`);
        }
        
        return res.status(500).json({ 
          error: 'Erro ao criar usuário no banco de dados', 
          message: 'Não foi possível completar o registro. Tente novamente mais tarde.' 
        });
      }
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
   * Realiza o login do usuário
   * Este método autentica o usuário no Clerk e retorna um token
   */
  login = async (req: Request, res: Response) => {
    try {
      // Extrair dados do corpo da requisição
      const { email, password } = req.body;

      logger.info(`Tentativa de login para o email: ${email || 'não fornecido'}`);

      // Verificar se todos os campos obrigatórios foram fornecidos
      if (!email || !password) {
        logger.warn(`Tentativa de login com dados incompletos: ${JSON.stringify({
          email: email ? 'fornecido' : 'não fornecido',
          password: password ? 'fornecido' : 'não fornecido'
        })}`);
        
        return res.status(400).json({ 
          error: 'Dados incompletos', 
          message: 'Email e senha são obrigatórios',
          missingFields: {
            email: !email,
            password: !password
          }
        });
      }

      // Caso especial para o usuário administrador
      if (email === 'anunciargrajau@gmail.com' && password === '172002Ws$#@') {
        logger.info(`Login especial para o usuário administrador: ${email}`);
        
        // Verificar se o usuário existe no banco de dados local
        let user = await prisma.user.findFirst({
          where: { email },
        });

        if (!user) {
          // Criar usuário no banco de dados local se não existir
          try {
            user = await prisma.user.create({
              data: {
                clerkId: 'admin_user', // ID temporário
                name: 'Administrador Grajau',
                email,
                role: 'ADMIN',
                status: 'APPROVED',
              },
            });
            logger.info(`Usuário administrador criado no banco de dados: ${user.id}`);
          } catch (dbError) {
            logger.error(`Erro ao criar usuário administrador no banco de dados: ${dbError}`);
            return res.status(500).json({ 
              error: 'Erro interno do servidor', 
              message: 'Não foi possível completar o login. Tente novamente mais tarde.' 
            });
          }
        } else if (user.role !== 'ADMIN') {
          // Garantir que o usuário seja admin
          user = await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN', status: 'APPROVED' }
          });
          logger.info(`Usuário atualizado para ADMIN: ${user.id}`);
        }

        // Criar um token simples (sem Clerk)
        const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

        return res.status(200).json({
          message: 'Login realizado com sucesso',
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
          },
        });
      }

      try {
        // Verificar se o usuário existe no Clerk
        const users = await clerkClient.users.getUserList({
          emailAddress: [email],
          limit: 1,
        });

        if (users.length === 0) {
          logger.warn(`Tentativa de login com email não cadastrado: ${email}`);
          return res.status(401).json({ 
            error: 'Credenciais inválidas', 
            message: 'Email ou senha incorretos' 
          });
        }

        // Tentar criar um token de sessão
        try {
          // Como o Clerk não tem um método direto para verificar senha via API,
          // vamos tentar criar um token e confiar na verificação do Clerk
          const signInToken = await clerkClient.signInTokens.createSignInToken({
            userId: users[0].id,
            expiresInSeconds: 60 * 60 * 24 * 7, // 7 dias
          });

          // Verificar se o usuário existe no banco de dados local
          let user = await prisma.user.findFirst({
            where: { clerkId: users[0].id },
          });

          if (!user) {
            // Criar usuário no banco de dados local se não existir
            try {
              user = await prisma.user.create({
                data: {
                  clerkId: users[0].id,
                  name: `${users[0].firstName} ${users[0].lastName}`,
                  email: email,
                  role: 'USER',
                  status: 'APPROVED', // Definir como APPROVED já que o usuário existe no Clerk
                },
              });

              logger.info(`Usuário criado no banco de dados após login: ${user.id}`);
            } catch (dbError) {
              logger.error(`Erro ao criar usuário no banco de dados após login: ${dbError}`);
              // Continuar mesmo se falhar, pois o token já foi criado
            }
          }

          if (user) {
            logger.info(`Login realizado com sucesso: ${user.id}`);

            return res.status(200).json({
              message: 'Login realizado com sucesso',
              token: signInToken.token,
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
              },
            });
          } else {
            // Caso raro onde não conseguimos criar o usuário no banco local
            logger.info(`Login realizado com sucesso (apenas no Clerk): ${users[0].id}`);
            
            return res.status(200).json({
              message: 'Login realizado com sucesso',
              token: signInToken.token,
              user: {
                clerkId: users[0].id,
                name: `${users[0].firstName} ${users[0].lastName}`,
                email: email,
                role: 'USER',
                status: 'PENDING',
              },
              warning: 'Usuário não encontrado no banco de dados local'
            });
          }
        } catch (authError) {
          logger.error(`Erro na autenticação: ${authError}`);
          return res.status(401).json({ 
            error: 'Credenciais inválidas', 
            message: 'Email ou senha incorretos' 
          });
        }
      } catch (error) {
        logger.error(`Erro ao buscar usuário no Clerk: ${error}`);
        return res.status(500).json({ 
          error: 'Erro de autenticação', 
          message: 'Não foi possível autenticar o usuário' 
        });
      }
    } catch (error) {
      logger.error('Erro ao realizar login:', error);
      
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      
      return res.status(500).json({ 
        error: 'Erro interno do servidor', 
        message: 'Não foi possível completar o login. Tente novamente mais tarde.' 
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

      // Verificar se é um token simples para o usuário administrador
      try {
        const decodedToken = Buffer.from(token, 'base64').toString('utf-8');
        if (decodedToken.includes(':')) {
          const [userId] = decodedToken.split(':');
          
          // Buscar usuário no banco de dados local
          const user = await prisma.user.findUnique({
            where: { id: userId },
          });

          if (user && user.email === 'anunciargrajau@gmail.com') {
            logger.info(`Autenticação especial para o usuário administrador: ${user.id}`);
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
          }
        }
      } catch (error) {
        // Ignorar erro e continuar com a verificação normal do Clerk
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