import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import EmailService from '../services/EmailService';
import logger from '../config/logger';
import { Prisma, PrismaClient } from '@prisma/client';

class ApplicationController {
  applyToJob = async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const { coverLetter } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se a vaga existe
      const job = await prisma.job.findUnique({
        where: { id: jobId }
      });

      if (!job) {
        return res.status(404).json({ error: 'Vaga não encontrada' });
      }

      // Verificar se o usuário já se candidatou a esta vaga
      const existingApplication = await prisma.application.findFirst({
        where: {
          jobId,
          userId
        }
      });

      if (existingApplication) {
        return res.status(400).json({ error: 'Você já se candidatou a esta vaga' });
      }

      // Verificar se o usuário tem um perfil profissional
      const professional = await prisma.professional.findUnique({
        where: { userId }
      });

      if (!professional) {
        return res.status(400).json({ error: 'Você precisa ter um perfil profissional para se candidatar a vagas' });
      }

      // Criar a candidatura
      const application = await prisma.application.create({
        data: {
          jobId,
          userId,
          coverLetter: coverLetter || null,
          status: 'PENDING',
          resumeUrl: professional.portfolio?.[0] || ''
        }
      });

      return res.status(201).json(application);
    } catch (error) {
      logger.error('Erro ao candidatar-se à vaga:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao candidatar-se à vaga' });
    }
  }

  getJobApplications = async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se a vaga existe e pertence ao usuário
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          business: true
        }
      });
      
      if (!job) {
        return res.status(404).json({ error: 'Vaga não encontrada' });
      }
      
      // Verificar se o usuário é o dono da empresa ou um admin
      const isAdmin = req.user?.role === 'ADMIN';
      const isBusinessOwner = job.business.userId === userId;
      
      if (!isBusinessOwner && !isAdmin) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar as candidaturas desta vaga' });
      }

      const applications = await prisma.application.findMany({
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
        } as Prisma.ApplicationInclude,
        orderBy: { createdAt: 'desc' }
      }) || [];
      
      logger.info(`Retornando ${applications.length} candidaturas para a vaga ${jobId}`);
      return res.json(applications);
    } catch (error) {
      logger.error('Erro ao obter candidaturas para vaga:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao listar candidaturas' });
    }
  }
  
  getMyApplications = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
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
        } as Prisma.ApplicationInclude,
        orderBy: { createdAt: 'desc' }
      }) || [];
      
      logger.info(`Retornando ${applications.length} candidaturas para o usuário ${userId}`);
      return res.json(applications);
    } catch (error) {
      logger.error('Erro ao obter candidaturas do usuário:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao listar candidaturas' });
    }
  }

  updateApplicationStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, message } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se a candidatura existe
      const application = await prisma.application.findUnique({
        where: { id },
        include: {
          job: {
            include: {
              business: true
            }
          },
          user: true
        } as Prisma.ApplicationInclude
      });

      if (!application) {
        return res.status(404).json({ error: 'Candidatura não encontrada' });
      }

      // Verificar se o usuário é o dono da empresa ou um admin
      const isAdmin = req.user?.role === 'ADMIN';
      // Usando uma asserção de tipo para resolver o problema de tipagem
      const jobWithBusiness = application.job as any;
      const isBusinessOwner = jobWithBusiness.business?.userId === userId;

      if (!isBusinessOwner && !isAdmin) {
        return res.status(403).json({ error: 'Você não tem permissão para atualizar esta candidatura' });
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
              business: true
            }
          },
          user: true
        } as Prisma.ApplicationInclude
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

      return res.json(updatedApplication);
    } catch (error) {
      logger.error('Erro ao atualizar status da candidatura:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao atualizar status da candidatura' });
    }
  }

  cancelApplication = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar se a candidatura existe e pertence ao usuário
      const application = await prisma.application.findUnique({
        where: { id },
        include: {
          job: true
        } as Prisma.ApplicationInclude
      });

      if (!application) {
        return res.status(404).json({ error: 'Candidatura não encontrada' });
      }

      if (application.userId !== userId) {
        return res.status(403).json({ error: 'Você não tem permissão para cancelar esta candidatura' });
      }

      // Cancelar candidatura
      await prisma.application.delete({
        where: { id }
      });

      return res.json({ success: true, message: 'Candidatura cancelada com sucesso' });
    } catch (error) {
      logger.error('Erro ao cancelar candidatura:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao cancelar candidatura' });
    }
  }
}

export default new ApplicationController(); 