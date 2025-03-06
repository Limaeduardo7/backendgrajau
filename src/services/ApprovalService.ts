import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';
import EmailService from './EmailService';
import AuditService from './AuditService';
import { Prisma, PrismaClient } from '@prisma/client';

interface ApprovalResult {
  success: boolean;
  message: string;
  data: any;
}

class ApprovalService {
  /**
   * Aprova uma empresa
   * @param businessId ID da empresa
   * @param adminId ID do administrador que está aprovando
   */
  async approveBusiness(businessId: string, adminId: string): Promise<ApprovalResult> {
    try {
      // Verificar se a empresa existe
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { user: true } as Prisma.BusinessInclude
      });

      if (!business) {
        throw new ApiError(404, 'Empresa não encontrada');
      }

      // Verificar se a empresa já está aprovada
      if (business.status === 'APPROVED') {
        return {
          success: false,
          message: 'Esta empresa já está aprovada',
          data: business
        };
      }

      // Atualizar status da empresa
      const updatedBusiness = await prisma.business.update({
        where: { id: businessId },
        data: { status: 'APPROVED' },
        include: { user: true }
      });

      // Registrar ação de auditoria
      await AuditService.logAction({
        userId: adminId,
        action: 'APPROVE_BUSINESS',
        entityType: 'BUSINESS',
        entityId: businessId,
        details: `Empresa "${business.name}" aprovada`
      });

      // Enviar email de notificação
      await EmailService.sendApprovalEmail(
        business.user.email,
        business.user.name,
        'business'
      );

      return {
        success: true,
        message: 'Empresa aprovada com sucesso',
        data: updatedBusiness
      };
    } catch (error) {
      console.error('Erro ao aprovar empresa:', error);
      throw error;
    }
  }

  /**
   * Rejeita uma empresa
   * @param businessId ID da empresa
   * @param adminId ID do administrador que está rejeitando
   * @param reason Motivo da rejeição
   */
  async rejectBusiness(businessId: string, adminId: string, reason: string): Promise<ApprovalResult> {
    try {
      // Verificar se a empresa existe
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { user: true }
      });

      if (!business) {
        throw new ApiError(404, 'Empresa não encontrada');
      }

      // Verificar se a empresa já está rejeitada
      if (business.status === 'REJECTED') {
        return {
          success: false,
          message: 'Esta empresa já está rejeitada',
          data: business
        };
      }

      // Atualizar status da empresa
      const updatedBusiness = await prisma.business.update({
        where: { id: businessId },
        data: { status: 'REJECTED' },
        include: { user: true }
      });

      // Registrar ação de auditoria
      await AuditService.logAction({
        userId: adminId,
        action: 'REJECT_BUSINESS',
        entityType: 'BUSINESS',
        entityId: businessId,
        details: `Empresa "${business.name}" rejeitada. Motivo: ${reason}`
      });

      // Enviar email de notificação
      await EmailService.sendEmail({
        to: business.user.email,
        subject: 'Sua empresa não foi aprovada',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4a6da7;">Cadastro Não Aprovado</h1>
            <p>Olá, ${business.user.name}!</p>
            <p>Infelizmente, sua empresa <strong>${business.name}</strong> não foi aprovada no Anunciar Grajaú.</p>
            <p><strong>Motivo:</strong> ${reason}</p>
            <p>Você pode editar as informações da sua empresa e solicitar uma nova revisão.</p>
            <p>Se tiver dúvidas, entre em contato conosco respondendo a este email.</p>
            <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
          </div>
        `,
      });

      return {
        success: true,
        message: 'Empresa rejeitada com sucesso',
        data: updatedBusiness
      };
    } catch (error) {
      console.error('Erro ao rejeitar empresa:', error);
      throw error;
    }
  }

  /**
   * Aprova um profissional
   * @param professionalId ID do profissional
   * @param adminId ID do administrador que está aprovando
   */
  async approveProfessional(professionalId: string, adminId: string): Promise<ApprovalResult> {
    try {
      // Verificar se o profissional existe
      const professional = await prisma.professional.findUnique({
        where: { id: professionalId },
        include: { user: true } as Prisma.ProfessionalInclude
      });

      if (!professional) {
        throw new ApiError(404, 'Profissional não encontrado');
      }

      // Verificar se o profissional já está aprovado
      if (professional.status === 'APPROVED') {
        return {
          success: false,
          message: 'Este profissional já está aprovado',
          data: professional
        };
      }

      // Atualizar status do profissional
      const updatedProfessional = await prisma.professional.update({
        where: { id: professionalId },
        data: { status: 'APPROVED' },
        include: { user: true } as Prisma.ProfessionalInclude
      });

      // Registrar ação de auditoria
      await AuditService.logAction({
        userId: adminId,
        action: 'APPROVE_PROFESSIONAL',
        entityType: 'PROFESSIONAL',
        entityId: professionalId,
        details: `Profissional "${professional.user.name}" (${professional.occupation}) aprovado`
      });

      // Enviar email de notificação
      await EmailService.sendApprovalEmail(
        professional.user.email,
        professional.user.name,
        'professional'
      );

      return {
        success: true,
        message: 'Profissional aprovado com sucesso',
        data: updatedProfessional
      };
    } catch (error) {
      console.error('Erro ao aprovar profissional:', error);
      throw error;
    }
  }

  /**
   * Rejeita um profissional
   * @param professionalId ID do profissional
   * @param adminId ID do administrador que está rejeitando
   * @param reason Motivo da rejeição
   */
  async rejectProfessional(professionalId: string, adminId: string, reason: string): Promise<ApprovalResult> {
    try {
      // Verificar se o profissional existe
      const professional = await prisma.professional.findUnique({
        where: { id: professionalId },
        include: { user: true } as Prisma.ProfessionalInclude
      });

      if (!professional) {
        throw new ApiError(404, 'Profissional não encontrado');
      }

      // Verificar se o profissional já está rejeitado
      if (professional.status === 'REJECTED') {
        return {
          success: false,
          message: 'Este profissional já está rejeitado',
          data: professional
        };
      }

      // Atualizar status do profissional
      const updatedProfessional = await prisma.professional.update({
        where: { id: professionalId },
        data: { status: 'REJECTED' },
        include: { user: true } as Prisma.ProfessionalInclude
      });

      // Registrar ação de auditoria
      await AuditService.logAction({
        userId: adminId,
        action: 'REJECT_PROFESSIONAL',
        entityType: 'PROFESSIONAL',
        entityId: professionalId,
        details: `Profissional "${professional.user.name}" (${professional.occupation}) rejeitado. Motivo: ${reason}`
      });

      // Enviar email de notificação
      await EmailService.sendEmail({
        to: professional.user.email,
        subject: 'Seu perfil profissional não foi aprovado',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4a6da7;">Cadastro Não Aprovado</h1>
            <p>Olá, ${professional.user.name}!</p>
            <p>Infelizmente, seu perfil profissional como <strong>${professional.occupation}</strong> não foi aprovado no Anunciar Grajaú.</p>
            <p><strong>Motivo:</strong> ${reason}</p>
            <p>Você pode editar as informações do seu perfil e solicitar uma nova revisão.</p>
            <p>Se tiver dúvidas, entre em contato conosco respondendo a este email.</p>
            <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
          </div>
        `,
      });

      return {
        success: true,
        message: 'Profissional rejeitado com sucesso',
        data: updatedProfessional
      };
    } catch (error) {
      console.error('Erro ao rejeitar profissional:', error);
      throw error;
    }
  }

  /**
   * Aprova uma vaga de emprego
   * @param jobId ID da vaga
   * @param adminId ID do administrador que está aprovando
   */
  async approveJob(jobId: string, adminId: string): Promise<ApprovalResult> {
    try {
      // Verificar se a vaga existe
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          business: true,
          user: true
        } as Prisma.JobInclude
      });

      if (!job) {
        throw new ApiError(404, 'Vaga não encontrada');
      }

      // Verificar se a vaga já está aprovada
      if (job.status === 'APPROVED') {
        return {
          success: false,
          message: 'Esta vaga já está aprovada',
          data: job
        };
      }

      // Atualizar status da vaga
      const updatedJob = await prisma.job.update({
        where: { id: jobId },
        data: { status: 'APPROVED' },
        include: {
          business: true,
          user: true
        } as Prisma.JobInclude
      });

      // Registrar ação de auditoria
      await AuditService.logAction({
        userId: adminId,
        action: 'APPROVE_JOB',
        entityType: 'JOB',
        entityId: jobId,
        details: `Vaga "${job.title}" da empresa "${job.business.name}" aprovada`
      });

      // Enviar email de notificação
      const jobWithRelations = job as any;
      
      await EmailService.sendEmail({
        to: jobWithRelations.business.user.email,
        subject: 'Sua vaga foi aprovada!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4a6da7;">Vaga Aprovada!</h1>
            <p>Olá, ${jobWithRelations.business.user.name}!</p>
            <p>Temos o prazer de informar que sua vaga <strong>${job.title}</strong> foi aprovada no Anunciar Grajaú.</p>
            <p>A partir de agora, sua vaga está visível para todos os profissionais da plataforma.</p>
            <p>Você receberá notificações quando houver candidaturas.</p>
            <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
          </div>
        `,
      });

      return {
        success: true,
        message: 'Vaga aprovada com sucesso',
        data: updatedJob
      };
    } catch (error) {
      console.error('Erro ao aprovar vaga:', error);
      throw error;
    }
  }

  /**
   * Rejeita uma vaga de emprego
   * @param jobId ID da vaga
   * @param adminId ID do administrador que está rejeitando
   * @param reason Motivo da rejeição
   */
  async rejectJob(jobId: string, adminId: string, reason: string): Promise<ApprovalResult> {
    try {
      // Verificar se a vaga existe
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
          business: true,
          user: true
        } as Prisma.JobInclude
      });

      if (!job) {
        throw new ApiError(404, 'Vaga não encontrada');
      }

      // Verificar se a vaga já está rejeitada
      if (job.status === 'REJECTED') {
        return {
          success: false,
          message: 'Esta vaga já está rejeitada',
          data: job
        };
      }

      // Atualizar status da vaga
      const updatedJob = await prisma.job.update({
        where: { id: jobId },
        data: { status: 'REJECTED' },
        include: {
          business: true,
          user: true
        } as Prisma.JobInclude
      });

      // Registrar ação de auditoria
      await AuditService.logAction({
        userId: adminId,
        action: 'REJECT_JOB',
        entityType: 'JOB',
        entityId: jobId,
        details: `Vaga "${job.title}" da empresa "${job.business.name}" rejeitada. Motivo: ${reason}`
      });

      // Enviar email de notificação
      const jobWithRelations = job as any;
      
      await EmailService.sendEmail({
        to: jobWithRelations.business.user.email,
        subject: 'Sua vaga não foi aprovada',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4a6da7;">Vaga Não Aprovada</h1>
            <p>Olá, ${jobWithRelations.business.user.name}!</p>
            <p>Infelizmente, sua vaga <strong>${job.title}</strong> não foi aprovada no Anunciar Grajaú.</p>
            <p><strong>Motivo:</strong> ${reason}</p>
            <p>Você pode editar as informações da vaga e solicitar uma nova revisão.</p>
            <p>Se tiver dúvidas, entre em contato conosco respondendo a este email.</p>
            <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
          </div>
        `,
      });

      return {
        success: true,
        message: 'Vaga rejeitada com sucesso',
        data: updatedJob
      };
    } catch (error) {
      console.error('Erro ao rejeitar vaga:', error);
      throw error;
    }
  }

  /**
   * Obtém itens pendentes de aprovação
   * @param type Tipo de item (business, professional, job)
   */
  async getPendingItems(type?: 'business' | 'professional' | 'job') {
    try {
      let businesses: any[] = [];
      let professionals: any[] = [];
      let jobs: any[] = [];
      
      if (!type || type === 'business') {
        businesses = await prisma.business.findMany({
          where: { status: 'PENDING' },
          include: { user: true } as Prisma.BusinessInclude,
          orderBy: { createdAt: 'desc' }
        });
      }
      
      if (!type || type === 'professional') {
        professionals = await prisma.professional.findMany({
          where: { status: 'PENDING' },
          include: { user: true } as Prisma.ProfessionalInclude,
          orderBy: { createdAt: 'desc' }
        });
      }
      
      if (!type || type === 'job') {
        jobs = await prisma.job.findMany({
          where: { status: 'PENDING' },
          include: {
            business: true,
            user: true
          } as Prisma.JobInclude,
          orderBy: { createdAt: 'desc' }
        });
      }
      
      return {
        businesses,
        professionals,
        jobs,
        total: businesses.length + professionals.length + jobs.length
      };
    } catch (error) {
      console.error('Erro ao listar itens pendentes:', error);
      throw error;
    }
  }

  /**
   * Configura aprovação automática
   * @param enabled Habilitar ou desabilitar
   * @param adminId ID do administrador que está alterando a configuração
   */
  async setAutoApproval(enabled: boolean, adminId: string) {
    try {
      // Atualizar configuração no banco de dados
      // Aqui você pode implementar a lógica para salvar a configuração
      // Por exemplo, em um modelo Settings no banco de dados
      
      // Registrar ação de auditoria
      await AuditService.logAction({
        userId: adminId,
        action: 'UPDATE_AUTO_APPROVAL_SETTING',
        entityType: 'SETTINGS',
        details: `Aprovação automática ${enabled ? 'ativada' : 'desativada'}`
      });
      
      return {
        success: true,
        message: `Aprovação automática ${enabled ? 'ativada' : 'desativada'} com sucesso`,
        enabled
      };
    } catch (error) {
      console.error('Erro ao configurar aprovação automática:', error);
      throw error;
    }
  }
}

export default new ApprovalService(); 