import { resend } from '../config/resend';

// Tipo para dados de email
interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
}

class EmailService {
  private defaultFrom: string;

  constructor() {
    this.defaultFrom = 'no-reply@anunciargrajau.com.br';
  }

  // Enviar email genérico
  async sendEmail(data: EmailData): Promise<boolean> {
    try {
      const { to, subject, html, from = this.defaultFrom, text, cc, bcc, replyTo } = data;

      await resend.emails.send({
        from,
        to,
        subject,
        html,
        text,
        cc,
        bcc,
        reply_to: replyTo,
      });

      return true;
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      return false;
    }
  }

  // Email de boas-vindas
  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const subject = 'Bem-vindo ao Anunciar Grajaú';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a6da7;">Bem-vindo ao Anunciar Grajaú!</h1>
        <p>Olá, ${name}!</p>
        <p>Estamos muito felizes em tê-lo conosco. O Anunciar Grajaú é a plataforma ideal para conectar empresas, profissionais e clientes na região do Grajaú.</p>
        <p>Com sua conta, você pode:</p>
        <ul>
          <li>Explorar ofertas de trabalho</li>
          <li>Conectar-se com profissionais qualificados</li>
          <li>Divulgar sua empresa ou serviços</li>
          <li>Acompanhar as novidades da região</li>
        </ul>
        <p>Se tiver qualquer dúvida, basta responder a este email.</p>
        <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  // Email de aprovação do cadastro
  async sendApprovalEmail(to: string, name: string, type: 'business' | 'professional'): Promise<boolean> {
    const subject = 'Seu cadastro foi aprovado!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a6da7;">Cadastro Aprovado!</h1>
        <p>Olá, ${name}!</p>
        <p>Temos o prazer de informar que seu cadastro como ${
          type === 'business' ? 'empresa' : 'profissional'
        } foi <strong>aprovado</strong> no Anunciar Grajaú.</p>
        <p>A partir de agora, você pode desfrutar de todos os recursos da plataforma:</p>
        <ul>
          ${
            type === 'business'
              ? `
                <li>Publicar vagas de emprego</li>
                <li>Receber candidaturas</li>
                <li>Destacar sua empresa no diretório</li>
              `
              : `
                <li>Destacar seu perfil profissional</li>
                <li>Receber propostas de trabalho</li>
                <li>Candidatar-se a vagas disponíveis</li>
              `
          }
        </ul>
        <p>Acesse agora mesmo e comece a explorar todas as funcionalidades!</p>
        <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  // Email de confirmação de pagamento
  async sendPaymentConfirmationEmail(to: string, name: string, planName: string, amount: string, endDate: string): Promise<boolean> {
    const subject = 'Confirmação de Pagamento';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a6da7;">Pagamento Confirmado!</h1>
        <p>Olá, ${name}!</p>
        <p>Seu pagamento do plano <strong>${planName}</strong> foi processado com sucesso.</p>
        <p><strong>Valor:</strong> R$ ${amount}</p>
        <p><strong>Válido até:</strong> ${endDate}</p>
        <p>Você já pode desfrutar de todos os benefícios do seu plano. Obrigado pela confiança!</p>
        <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  // Email de notificação de nova candidatura
  async sendNewApplicationEmail(to: string, jobTitle: string, applicantName: string): Promise<boolean> {
    const subject = `Nova candidatura para: ${jobTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a6da7;">Nova Candidatura Recebida!</h1>
        <p>Você recebeu uma nova candidatura para a vaga <strong>${jobTitle}</strong>.</p>
        <p><strong>Candidato:</strong> ${applicantName}</p>
        <p>Acesse a plataforma para ver mais detalhes e o currículo do candidato.</p>
        <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  // Email de candidatura a vaga
  async sendJobApplicationEmail(to: string, name: string, jobTitle: string, professionalOccupation: string): Promise<boolean> {
    const subject = `Nova candidatura para a vaga: ${jobTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a6da7;">Nova Candidatura Recebida!</h1>
        <p>Olá, ${name}!</p>
        <p>Você recebeu uma nova candidatura para a vaga <strong>${jobTitle}</strong>.</p>
        <p><strong>Profissional:</strong> ${professionalOccupation}</p>
        <p>Acesse a plataforma para ver mais detalhes sobre o candidato e seu currículo.</p>
        <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  // Email de atualização de status de candidatura
  async sendJobApplicationStatusEmail(to: string, name: string, subject: string, message: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a6da7;">${subject}</h1>
        <p>Olá, ${name}!</p>
        <p>${message}</p>
        <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  // Email de cancelamento de candidatura
  async sendJobApplicationCancelEmail(to: string, name: string, jobTitle: string): Promise<boolean> {
    const subject = `Candidatura cancelada para a vaga: ${jobTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a6da7;">Candidatura Cancelada</h1>
        <p>Olá, ${name}!</p>
        <p>Um candidato cancelou sua candidatura para a vaga <strong>${jobTitle}</strong>.</p>
        <p>Acesse a plataforma para ver mais detalhes.</p>
        <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  // Email de cancelamento de assinatura
  async sendSubscriptionCancelationEmail(to: string, name: string, planName: string): Promise<boolean> {
    const subject = 'Confirmação de Cancelamento de Assinatura';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a6da7;">Assinatura Cancelada</h1>
        <p>Olá, ${name}!</p>
        <p>Confirmamos o cancelamento da sua assinatura do plano <strong>${planName}</strong>.</p>
        <p>Você ainda poderá utilizar os recursos do plano até o final do período já pago.</p>
        <p>Sentiremos sua falta! Se desejar reativar sua assinatura no futuro, estaremos aqui para ajudar.</p>
        <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  // Email de notificação de assinatura prestes a expirar
  async sendSubscriptionExpiringEmail(to: string, name: string, planName: string, expirationDate: string): Promise<boolean> {
    const subject = 'Sua assinatura está prestes a expirar';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a6da7;">Assinatura Prestes a Expirar</h1>
        <p>Olá, ${name}!</p>
        <p>Gostaríamos de informar que sua assinatura do plano <strong>${planName}</strong> expirará em <strong>${expirationDate}</strong>.</p>
        <p>Para continuar desfrutando de todos os benefícios, recomendamos que renove sua assinatura antes desta data.</p>
        <p>Se você ativou a renovação automática, não precisa se preocupar - sua assinatura será renovada automaticamente.</p>
        <p>Atenciosamente,<br>Equipe Anunciar Grajaú</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }
}

export default new EmailService(); 