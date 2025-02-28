import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
  async sendWelcomeEmail(email: string, name: string) {
    try {
      await resend.emails.send({
        from: 'Anunciar Grajaú <noreply@anunciargrajau.com.br>',
        to: email,
        subject: 'Bem-vindo ao Anunciar Grajaú!',
        html: `
          <h1>Olá ${name}!</h1>
          <p>Seja bem-vindo ao Anunciar Grajaú!</p>
          <p>Estamos muito felizes em ter você conosco. Aqui você poderá encontrar e divulgar negócios, serviços e oportunidades na região do Grajaú.</p>
          <p>Se precisar de ajuda, não hesite em nos contatar.</p>
          <br>
          <p>Atenciosamente,</p>
          <p>Equipe Anunciar Grajaú</p>
        `
      });
    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error);
      throw error;
    }
  }

  async sendBusinessApprovalEmail(email: string, name: string, businessName: string) {
    try {
      await resend.emails.send({
        from: 'Anunciar Grajaú <noreply@anunciargrajau.com.br>',
        to: email,
        subject: 'Seu negócio foi aprovado!',
        html: `
          <h1>Parabéns ${name}!</h1>
          <p>Seu negócio "${businessName}" foi aprovado e já está disponível em nossa plataforma.</p>
          <p>Agora você pode começar a gerenciar seu perfil, adicionar fotos e informações adicionais.</p>
          <p>Se precisar de ajuda, não hesite em nos contatar.</p>
          <br>
          <p>Atenciosamente,</p>
          <p>Equipe Anunciar Grajaú</p>
        `
      });
    } catch (error) {
      console.error('Erro ao enviar email de aprovação de negócio:', error);
      throw error;
    }
  }

  async sendJobApplicationEmail(email: string, name: string, jobTitle: string, businessName: string) {
    try {
      await resend.emails.send({
        from: 'Anunciar Grajaú <noreply@anunciargrajau.com.br>',
        to: email,
        subject: 'Nova candidatura recebida!',
        html: `
          <h1>Olá ${name}!</h1>
          <p>Você recebeu uma nova candidatura para a vaga "${jobTitle}" em ${businessName}.</p>
          <p>Acesse sua conta para visualizar os detalhes da candidatura e entrar em contato com o candidato.</p>
          <br>
          <p>Atenciosamente,</p>
          <p>Equipe Anunciar Grajaú</p>
        `
      });
    } catch (error) {
      console.error('Erro ao enviar email de candidatura:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, name: string, resetLink: string) {
    try {
      await resend.emails.send({
        from: 'Anunciar Grajaú <noreply@anunciargrajau.com.br>',
        to: email,
        subject: 'Redefinição de senha',
        html: `
          <h1>Olá ${name}!</h1>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <p>Clique no link abaixo para criar uma nova senha:</p>
          <p><a href="${resetLink}">Redefinir senha</a></p>
          <p>Se você não solicitou a redefinição de senha, ignore este email.</p>
          <br>
          <p>Atenciosamente,</p>
          <p>Equipe Anunciar Grajaú</p>
        `
      });
    } catch (error) {
      console.error('Erro ao enviar email de redefinição de senha:', error);
      throw error;
    }
  }
} 