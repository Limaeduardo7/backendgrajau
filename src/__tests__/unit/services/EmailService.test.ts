import EmailService from '../../../services/EmailService';
import { resend } from '../../../config/resend';
import logger from '../../../config/logger';

// Mock do módulo resend
jest.mock('../../../config/resend', () => ({
  resend: {
    emails: {
      send: jest.fn()
    }
  },
  emailFrom: 'test@example.com'
}));

jest.mock('../../../config/logger');

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('deve enviar um email com sucesso', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      (resend?.emails.send as jest.Mock).mockResolvedValueOnce({ id: '123' });

      const result = await EmailService.sendEmail(emailData);

      expect(result).toBe(true);
      expect(resend?.emails.send).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      });
    });

    it('deve retornar false quando ocorrer um erro', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      (resend?.emails.send as jest.Mock).mockRejectedValueOnce(new Error('Erro ao enviar email'));

      const result = await EmailService.sendEmail(emailData);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });

    it('deve retornar false quando o serviço não estiver configurado', async () => {
      const mockResend = jest.requireMock('../../../config/resend');
      mockResend.resend = null;

      const emailData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      };

      const result = await EmailService.sendEmail(emailData);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Serviço de email não configurado. Email não será enviado.');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('deve enviar um email de boas-vindas', async () => {
      const spy = jest.spyOn(EmailService, 'sendEmail').mockResolvedValueOnce(true);

      const result = await EmailService.sendWelcomeEmail('test@example.com', 'Usuário Teste');

      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.stringContaining('Bem-vindo'),
          html: expect.stringContaining('Usuário Teste'),
        })
      );
    });
  });

  describe('sendJobApplicationEmail', () => {
    it('deve enviar um email de candidatura a vaga', async () => {
      const spy = jest.spyOn(EmailService, 'sendEmail').mockResolvedValueOnce(true);

      const result = await EmailService.sendJobApplicationEmail(
        'empresa@example.com',
        'Empresa Teste',
        'Desenvolvedor Full Stack',
        'Desenvolvedor Web'
      );

      expect(result).toBe(true);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'empresa@example.com',
          subject: expect.stringContaining('Desenvolvedor Full Stack'),
          html: expect.stringContaining('Empresa Teste'),
        })
      );
    });
  });
}); 