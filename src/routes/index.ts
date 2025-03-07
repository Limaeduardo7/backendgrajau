import { Router, Request, Response } from 'express';
import businessRoutes from './business.routes';
import jobRoutes from './job.routes';
import professionalRoutes from './professional.routes';
import webhookRoutes from './webhook.routes';
import blogRoutes from './blog.routes';
import emailRoutes from './email.routes';
import adminRoutes from './admin.routes';
import paymentRoutes from './payment.routes';
import reviewRoutes from './review.routes';
import applicationRoutes from './application.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import { requireAuth, validateUser } from '../middlewares/auth.middleware';
import auditRoutes from './audit.routes';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

// Rota de teste/saúde
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'API funcionando corretamente' });
});

// Rota protegida de teste
router.get('/me', requireAuth, validateUser, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// Registrando as rotas de autenticação
router.use('/auth', authRoutes);

// Registrando as rotas de usuário
router.use('/users', userRoutes);

// Alias para a rota de registro (para compatibilidade)
router.post('/register', authController.register);

// Alias para a rota de login (para compatibilidade)
router.post('/login', authController.login);

// Rotas temporárias para itens pendentes (acesso direto, sem middleware)
// Rota para empresas pendentes
router.get('/businesses/pending', (req: Request, res: Response) => {
  console.log('Acessando rota de empresas pendentes no arquivo index.ts');
  res.json({
    items: [
      { 
        id: "1", 
        name: "Restaurante Sabor & Arte", 
        email: "contato@restaurante.com",
        phone: "21987654321",
        address: "Av. Brasil, 123",
        description: "Restaurante especializado em comida brasileira",
        category: "Alimentação",
        status: "pending",
        featured: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      { 
        id: "2", 
        name: "Oficina do Pedro", 
        email: "pedro@oficina.com",
        phone: "21998765432",
        address: "Rua das Ferramentas, 456",
        description: "Serviços mecânicos em geral",
        category: "Serviços",
        status: "pending",
        featured: false,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString()
      },
      { 
        id: "3", 
        name: "Mercado Bom Preço", 
        email: "contato@bompreco.com",
        phone: "21987654123",
        address: "Rua do Comércio, 789",
        description: "Mercadinho de bairro com preços imbatíveis",
        category: "Varejo",
        status: "pending",
        featured: false,
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 259200000).toISOString()
      }
    ],
    total: 3,
    page: 1,
    limit: 10,
    totalPages: 1
  });
});

// Rota para profissionais pendentes
router.get('/professionals/pending', (req: Request, res: Response) => {
  console.log('Acessando rota de profissionais pendentes no arquivo index.ts');
  res.json({
    items: [
      {
        id: "1",
        name: "João Silva",
        email: "joao@example.com",
        phone: "21998765432",
        occupation: "Desenvolvedor Full Stack",
        specialties: ["JavaScript", "React", "Node.js"],
        experience: "5 anos de experiência em desenvolvimento web",
        education: ["Bacharelado em Ciência da Computação"],
        certifications: ["AWS Certified Developer"],
        portfolio: ["https://portfolio.example.com/joao"],
        status: "pending",
        featured: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: "2",
        name: "Maria Santos",
        email: "maria@example.com",
        phone: "21987654321",
        occupation: "Designer Gráfico",
        specialties: ["Photoshop", "Illustrator", "UI/UX"],
        experience: "3 anos como freelancer",
        education: ["Bacharelado em Design Gráfico"],
        certifications: ["Adobe Certified Expert"],
        portfolio: ["https://portfolio.example.com/maria"],
        status: "pending",
        featured: false,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: "3",
        name: "Pedro Oliveira",
        email: "pedro@example.com",
        phone: "21976543210",
        occupation: "Eletricista",
        specialties: ["Instalações Residenciais", "Manutenção Predial"],
        experience: "10 anos no mercado",
        education: ["Curso Técnico em Elétrica"],
        certifications: ["NR-10"],
        portfolio: ["https://portfolio.example.com/pedro"],
        status: "pending",
        featured: false,
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 259200000).toISOString()
      }
    ],
    total: 3,
    page: 1,
    limit: 10,
    totalPages: 1
  });
});

// Registrando as rotas de negócios
router.use('/businesses', businessRoutes);

// Registrando as rotas de vagas
router.use('/jobs', jobRoutes);

// Registrando as rotas de profissionais
router.use('/professionals', professionalRoutes);

// Registrando as rotas de webhook
router.use('/webhooks', webhookRoutes);

// Registrando as rotas do blog
router.use('/blog', blogRoutes);

// Registrando as rotas de email
router.use('/email', emailRoutes);

// Registrando as rotas de administração
router.use('/admin', adminRoutes);

// Registrando as rotas de pagamento
router.use('/payments', paymentRoutes);
router.use('/plans', paymentRoutes);
router.use('/subscriptions', paymentRoutes);
router.use('/invoices', paymentRoutes);

// Registrando as rotas de avaliações
router.use('/reviews', reviewRoutes);

// Registrando as rotas de candidaturas
router.use('/applications', applicationRoutes);

// Rotas de auditoria
router.use('/audit', auditRoutes);

// Aqui serão adicionadas as demais rotas
// router.use('/admin', adminRoutes);

export default router; 