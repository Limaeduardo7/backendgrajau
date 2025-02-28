import ApprovalService from '../../../../src/services/ApprovalService';
import { ApiError } from '../../../../src/utils/ApiError';
import prisma from '../../../../src/config/prisma';
import EmailService from '../../../../src/services/EmailService';
import AuditService from '../../../../src/services/AuditService';

// Mock das dependências
jest.mock('../../../../src/config/prisma', () => ({
  business: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  professional: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  job: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
}));

jest.mock('../../../../src/services/EmailService', () => ({
  sendEmail: jest.fn(),
  sendApprovalEmail: jest.fn(),
}));

jest.mock('../../../../src/services/AuditService', () => ({
  logAction: jest.fn(),
}));

describe('ApprovalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('approveBusiness', () => {
    it('deve aprovar uma empresa com sucesso', async () => {
      // Arrange
      const businessMock = {
        id: 'business-id',
        name: 'Empresa Teste',
        status: 'PENDING',
        user: {
          id: 'user-id',
          name: 'Usuário Teste',
          email: 'usuario@teste.com',
        },
      };

      const updatedBusinessMock = {
        ...businessMock,
        status: 'APPROVED',
      };

      (prisma.business.findUnique as jest.Mock).mockResolvedValue(businessMock);
      (prisma.business.update as jest.Mock).mockResolvedValue(updatedBusinessMock);
      (AuditService.logAction as jest.Mock).mockResolvedValue({});
      (EmailService.sendApprovalEmail as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await ApprovalService.approveBusiness('business-id', 'admin-id');

      // Assert
      expect(prisma.business.findUnique).toHaveBeenCalledWith({
        where: { id: 'business-id' },
        include: { user: true },
      });
      expect(prisma.business.update).toHaveBeenCalledWith({
        where: { id: 'business-id' },
        data: { status: 'APPROVED' },
        include: { user: true },
      });
      expect(AuditService.logAction).toHaveBeenCalled();
      expect(EmailService.sendApprovalEmail).toHaveBeenCalledWith(
        'usuario@teste.com',
        'Usuário Teste',
        'business'
      );
      expect(result).toEqual({
        success: true,
        message: 'Empresa aprovada com sucesso',
        data: updatedBusinessMock,
      });
    });

    it('deve retornar erro quando a empresa não for encontrada', async () => {
      // Arrange
      (prisma.business.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(ApprovalService.approveBusiness('business-id-inexistente', 'admin-id')).rejects.toThrow(
        ApiError
      );
    });

    it('deve retornar falso quando a empresa já estiver aprovada', async () => {
      // Arrange
      const businessMock = {
        id: 'business-id',
        name: 'Empresa Teste',
        status: 'APPROVED',
        user: {
          id: 'user-id',
          name: 'Usuário Teste',
          email: 'usuario@teste.com',
        },
      };

      (prisma.business.findUnique as jest.Mock).mockResolvedValue(businessMock);

      // Act
      const result = await ApprovalService.approveBusiness('business-id', 'admin-id');

      // Assert
      expect(prisma.business.findUnique).toHaveBeenCalledWith({
        where: { id: 'business-id' },
        include: { user: true },
      });
      expect(prisma.business.update).not.toHaveBeenCalled();
      expect(AuditService.logAction).not.toHaveBeenCalled();
      expect(EmailService.sendApprovalEmail).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Esta empresa já está aprovada',
        data: businessMock,
      });
    });
  });

  describe('rejectBusiness', () => {
    it('deve rejeitar uma empresa com sucesso', async () => {
      // Arrange
      const businessMock = {
        id: 'business-id',
        name: 'Empresa Teste',
        status: 'PENDING',
        user: {
          id: 'user-id',
          name: 'Usuário Teste',
          email: 'usuario@teste.com',
        },
      };

      const updatedBusinessMock = {
        ...businessMock,
        status: 'REJECTED',
      };

      (prisma.business.findUnique as jest.Mock).mockResolvedValue(businessMock);
      (prisma.business.update as jest.Mock).mockResolvedValue(updatedBusinessMock);
      (AuditService.logAction as jest.Mock).mockResolvedValue({});
      (EmailService.sendEmail as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await ApprovalService.rejectBusiness('business-id', 'admin-id', 'Informações incompletas');

      // Assert
      expect(prisma.business.findUnique).toHaveBeenCalledWith({
        where: { id: 'business-id' },
        include: { user: true },
      });
      expect(prisma.business.update).toHaveBeenCalledWith({
        where: { id: 'business-id' },
        data: { status: 'REJECTED' },
        include: { user: true },
      });
      expect(AuditService.logAction).toHaveBeenCalled();
      expect(EmailService.sendEmail).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Empresa rejeitada com sucesso',
        data: updatedBusinessMock,
      });
    });
  });

  describe('getPendingItems', () => {
    it('deve retornar todos os itens pendentes quando nenhum tipo for especificado', async () => {
      // Arrange
      const businessesMock = [{ id: 'business-1', name: 'Empresa 1' }];
      const professionalsMock = [{ id: 'professional-1', name: 'Profissional 1' }];
      const jobsMock = [{ id: 'job-1', title: 'Vaga 1' }];

      (prisma.business.findMany as jest.Mock).mockResolvedValue(businessesMock);
      (prisma.professional.findMany as jest.Mock).mockResolvedValue(professionalsMock);
      (prisma.job.findMany as jest.Mock).mockResolvedValue(jobsMock);

      // Act
      const result = await ApprovalService.getPendingItems();

      // Assert
      expect(prisma.business.findMany).toHaveBeenCalled();
      expect(prisma.professional.findMany).toHaveBeenCalled();
      expect(prisma.job.findMany).toHaveBeenCalled();
      expect(result).toEqual({
        businesses: businessesMock,
        professionals: professionalsMock,
        jobs: jobsMock,
        total: 3,
      });
    });

    it('deve retornar apenas empresas pendentes quando o tipo for "business"', async () => {
      // Arrange
      const businessesMock = [{ id: 'business-1', name: 'Empresa 1' }];

      (prisma.business.findMany as jest.Mock).mockResolvedValue(businessesMock);

      // Act
      const result = await ApprovalService.getPendingItems('business');

      // Assert
      expect(prisma.business.findMany).toHaveBeenCalled();
      expect(prisma.professional.findMany).not.toHaveBeenCalled();
      expect(prisma.job.findMany).not.toHaveBeenCalled();
      expect(result).toEqual({
        businesses: businessesMock,
        professionals: [],
        jobs: [],
        total: 1,
      });
    });
  });
}); 