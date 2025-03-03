import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import EmailService from '../services/EmailService';
import uploadMiddleware from '../middlewares/uploadMiddleware';
import logger from '../config/logger';

const prisma = new PrismaClient();

export class ApplicationController {
  // Candidatar-se a uma vaga
  async applyToJob(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const { coverLetter } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }
      
      // Verificar se a vaga existe
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          business: {
            include: {
              user: true
            }
          }
        }
      });
      
      if (!job) {
        throw new ApiError(404, 'Vaga não encontrada');
      }
      
      // Verificar se a vaga está ativa
      if (job.status !== 'APPROVED') {
        throw new ApiError(400, 'Esta vaga não está disponível para candidaturas');
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
      
      // Verificar se o usuário tem um currículo (profissional)
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
          status: 'PENDING',
          resumeUrl: professional.portfolio[0] || '', // Usar o primeiro item do portfólio como currículo
          coverLetter
        }
      });
      
      // Enviar email para a empresa
      await EmailService.sendJobApplicationEmail(
        job.business.user.email,
        job.business.user.name,
        job.title,
        professional.occupation
      );
      
      return res.status(201).json(application);
    } catch (error) {
      console.error('Erro ao candidatar-se à vaga:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao candidatar-se à vaga' });
    }
  
  // Listar candidaturas a uma vaga (para empresas)
  async getJobApplications(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }
      
      const applications = await prisma.application.findMany({
        where: { jobId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              professional: true
            }
          },
          job: {
            select: {
              id: true,
              title: true,
              businessId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }) || [];
      
      logger.info(`Retornando ${applications.length} candidaturas para a vaga ${jobId}`);
      return res.json(applications);
    } catch (error) {
      logger.error('Erro ao obter candidaturas para vaga:', error);
      console.error('Erro ao listar candidaturas:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao listar candidaturas' });
    }
  
  // Listar minhas candidaturas (para profissionais)
  async getMyApplications(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
      }
      
      const applications = await prisma.application.findMany({
        where: { userId },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              business: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }) || [];
      
      logger.info(`Retornando ${applications.length} candidaturas para o usuário ${userId}`);
      return res.json(applications);
    } catch (error) {
      logger.error('Erro ao obter candidaturas do usuário:', error);
      console.error('Erro ao listar candidaturas:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao listar candidaturas' });
    }
  
  // Atualizar status de uma candidatura (para empresas)
  async updateApplicationStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new ApiError(401, 'Usuário não autenticado');
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
        }
      });
      
      if (!application) {
        throw new ApiError(404, 'Candidatura não encontrada');
      }
      
      // Verificar se o usuário é o dono da empresa ou um admin
      const isAdmin = req.user?.role === 'ADMIN';
      const isBusinessOwner = application.job.business.userId === userId;
      
      if (!isBusinessOwner && !isAdmin) {
        throw new ApiError(403, 'Você não tem permissão para atualizar esta candidatura');
      }
      
      // Atualizar status
      const updatedApplication = await prisma.application.update({
        where: { id },
        data: { status }
      });
      
      // Enviar email para o candidato
      let subject = '';
      let message = '';
      
      if (status === 'APPROVED') {
        subject = 'Sua candidatura foi aprovada!';
        message = `Olá ${application.user.name}, sua candidatura para a vaga "${application.job.title}" na empresa "${application.job.business.name}" foi aprovada! Entre em contato com a empresa para os próximos passos.`;
      } else if (status === 'REJECTED') {
        subject = 'Atualização sobre sua candidatura';
        message = `Olá ${application.user.name}, agradecemos seu interesse na vaga "${application.job.title}" na empresa "${application.job.business.name}". Infelizmente, sua candidatura não foi selecionada para esta oportunidade.`;
      }
      
      if (subject && message) {
        await EmailService.sendJobApplicationStatusEmail(
          application.user.email,
          application.user.name,
          subject,
          message
        );
      }
      
      return res.json(updatedApplication);
    } catch (error) {
      console.error('Erro ao atualizar candidatura:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao atualizar candidatura' });
    }
  }
  
  // Cancelar uma candidatura (para profissionais)
  async cancelApplication(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
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
                include: {
                  user: true
                }
              }
            }
          }
        }
      });
      
      if (!application) {
        throw new ApiError(404, 'Candidatura não encontrada');
      }
      
      // Verificar se o usuário é o dono da candidatura
      if (application.userId !== userId) {
        throw new ApiError(403, 'Você não tem permissão para cancelar esta candidatura');
      }
      
      // Excluir a candidatura
      await prisma.application.delete({
        where: { id }
      });
      
      // Enviar email para a empresa
      await EmailService.sendJobApplicationCancelEmail(
        application.job.business.user.email,
        application.job.business.user.name,
        application.job.title
      );
      
      return res.json({ success: true, message: 'Candidatura cancelada com sucesso' });
    } catch (error) {
      console.error('Erro ao cancelar candidatura:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao cancelar candidatura' });
    }
}

export default new ApplicationController(); 