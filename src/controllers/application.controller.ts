import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import EmailService from '../services/EmailService';
import logger from '../config/logger';
import { Prisma, Role } from '@prisma/client';
import { captureException } from '../config/sentry';

// Definindo uma interface para estender o Request
interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: Role;
    email?: string;
  };
}

export class ApplicationController {
  async applyToJob(req: AuthRequest, res: Response) {
    try {
      const { jobId } = req.params;
      const { coverLetter } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      if (!jobId) {
        throw new ApiError(400, 'ID da vaga é obrigatório');
      }

      // Verificar se a vaga existe e incluir a relação com business
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              userId: true
            }
          }
        }
      });

      if (!job) {
        throw new ApiError(404, 'Vaga não encontrada');
      }

      // Verificar se o usuário já se candidatou a esta vaga
      const existingApplication = await prisma.application.findFirst({
        where: {
          jobId,
          userId
        }
      });

      if (existingApplication) {
        throw new ApiError(400, 'Você já se candidatou a esta vaga');
      }

      // Verificar se o usuário tem um perfil profissional
      const professional = await prisma.professional.findUnique({
        where: { userId }
      });

      if (!professional) {
        throw new ApiError(400, 'Você precisa ter um perfil profissional para se candidatar a vagas');
      }

      // Criar a candidatura
      const application = await prisma.application.create({
        data: {
          jobId,
          userId,
          coverLetter: coverLetter || null,
          status: 'PENDING',
          resumeUrl: professional.portfolio?.[0] || ''
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          },
          job: {
            include: {
              business: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      res.status(201).json(application);
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error) {
        captureException(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      } else {
        const unknownError = new Error('Erro desconhecido');
        captureException(unknownError);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async getJobApplications(req: AuthRequest, res: Response) {
    try {
      const { jobId } = req.params;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === Role.ADMIN;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      // Verificar se a vaga existe e pertence ao usuário
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              userId: true
            }
          }
        }
      });
      
      if (!job) {
        throw new ApiError(404, 'Vaga não encontrada');
      }
      
      // Verificar se o usuário é o dono da empresa ou um admin
      if (!isAdmin && job.business.userId !== userId) {
        throw new ApiError(403, 'Você não tem permissão para acessar as candidaturas desta vaga');
      }

      const [applications, total] = await Promise.all([
        prisma.application.findMany({
          where: { jobId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.application.count({ where: { jobId } })
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      logger.info(`Retornando ${applications.length} candidaturas para a vaga ${jobId}`);
      res.json({
        applications,
        total,
        page,
        totalPages
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error) {
        captureException(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      } else {
        const unknownError = new Error('Erro desconhecido');
        captureException(unknownError);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }
  
  async getMyApplications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      const applications = await prisma.application.findMany({
        where: { userId },
        include: {
          job: {
            include: {
              business: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  state: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }) || [];
      
      logger.info(`Retornando ${applications.length} candidaturas para o usuário ${userId}`);
      res.json(applications);
    } catch (error) {
      logger.error('Erro ao obter candidaturas do usuário:', error);
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error) {
        captureException(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      } else {
        const unknownError = new Error('Erro desconhecido');
        captureException(unknownError);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async updateApplicationStatus(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, message } = req.body;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === Role.ADMIN;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      // Verificar se a candidatura existe
      const application = await prisma.application.findUnique({
        where: { id },
        include: {
          job: {
            include: {
              business: {
                select: {
                  id: true,
                  name: true,
                  userId: true
                }
              }
            }
          },
          user: true
        }
      });

      if (!application) {
        throw new ApiError(404, 'Candidatura não encontrada');
      }

      // Verificar se o usuário é o dono da empresa ou um admin
      if (!isAdmin && application.job.business.userId !== userId) {
        throw new ApiError(403, 'Você não tem permissão para atualizar esta candidatura');
      }

      // Atualizar status da candidatura
      const updatedApplication = await prisma.application.update({
        where: { id },
        data: { 
          status
        },
        include: {
          job: {
            include: {
              business: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          user: true
        }
      });

      // Enviar e-mail de notificação
      if (updatedApplication.user && updatedApplication.user.email) {
        const emailSubject = `Atualização da sua candidatura para: ${updatedApplication.job.title}`;
        let emailMessage = `Sua candidatura foi `;
        
        if (status === 'APPROVED') {
          emailMessage += 'aprovada';
        } else if (status === 'REJECTED') {
          emailMessage += 'rejeitada';
        } else {
          emailMessage += 'atualizada';
        }
        
        if (message) {
          emailMessage += `. Mensagem: ${message}`;
        }
        
        await EmailService.sendJobApplicationStatusEmail(
          updatedApplication.user.email,
          updatedApplication.user.name || 'Candidato',
          emailSubject,
          emailMessage
        );
      }

      res.json(updatedApplication);
    } catch (error) {
      logger.error('Erro ao atualizar status da candidatura:', error);
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error) {
        captureException(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      } else {
        const unknownError = new Error('Erro desconhecido');
        captureException(unknownError);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }

  async cancelApplication(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const isAdmin = req.user?.role === Role.ADMIN;

      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }

      // Verificar se a candidatura existe e pertence ao usuário
      const application = await prisma.application.findUnique({
        where: { id },
        include: {
          job: {
            include: {
              business: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!application) {
        throw new ApiError(404, 'Candidatura não encontrada');
      }

      if (!isAdmin && application.userId !== userId) {
        throw new ApiError(403, 'Você não tem permissão para cancelar esta candidatura');
      }

      // Cancelar candidatura
      await prisma.application.delete({
        where: { id }
      });

      res.json({ success: true, message: 'Candidatura cancelada com sucesso' });
    } catch (error) {
      logger.error('Erro ao cancelar candidatura:', error);
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else if (error instanceof Error) {
        captureException(error);
        res.status(500).json({ error: 'Erro interno do servidor' });
      } else {
        const unknownError = new Error('Erro desconhecido');
        captureException(unknownError);
        res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }
  }
} 