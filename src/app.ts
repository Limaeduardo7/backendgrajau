import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { specs } from './config/swagger';
import rateLimit from 'express-rate-limit';
import { sanitizeData } from './middlewares/sanitizer.middleware';
import logger, { logRequest } from './config/logger';
import sentry, { sentryRequestHandler, sentryErrorHandler } from './config/sentry';
import { sessionRecoveryMiddleware } from './middlewares/auth.middleware';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';

const app = express();

// Configurações básicas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração CORS simplificada
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Configurações de segurança básicas
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting básico
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
}));

// Middleware de sanitização global
app.use(sanitizeData);

// Middleware de log
app.use(logRequest);

// ======= INÍCIO DAS ROTAS PÚBLICAS (ALTA PRIORIDADE) ========

// Chave secreta para gerar tokens JWT (em produção, use variável de ambiente)
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'your-supabase-jwt-secret';

// Middleware para verificar token JWT do Supabase
const verifySupabaseToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    logger.warn('[BYPASS] Token não fornecido');
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  try {
    // Verificar o token JWT
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Verificar se o token tem as claims necessárias do Supabase
    if (!decoded.role || !decoded.sub) {
      logger.warn('[BYPASS] Token inválido - claims ausentes');
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    // Adicionar informações do token à requisição
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      email: decoded.email
    };
    
    logger.info('[BYPASS] Token Supabase validado com sucesso');
    next();
  } catch (error) {
    logger.error('[BYPASS] Erro ao verificar token:', error);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Rota bypass para posts do blog (com autenticação Supabase)
app.post('/api/blog/posts', verifySupabaseToken, async (req: Request, res: Response) => {
  try {
    logger.info('[BYPASS] Recebida requisição POST /api/blog/posts');
    logger.debug('[BYPASS] Headers:', req.headers);
    logger.debug('[BYPASS] Body:', req.body);

    // Acessar o prisma diretamente
    const prisma = (await import('./config/prisma')).default;
    
    const data = req.body;
    
    // Verificar dados obrigatórios
    if (!data.title || !data.content || !data.categoryId) {
      return res.status(400).json({ error: 'Título, conteúdo e categoria são obrigatórios' });
    }
    
    // Slugify - implementação simples
    const slug = data.title
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
    
    // Verificar se slug já existe
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug }
    });
    
    if (existingPost) {
      return res.status(400).json({ error: 'Já existe um post com este título' });
    }
    
    // Criar post diretamente
    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        content: data.content,
        tags: data.tags || [],
        image: data.image || null,
        authorId: req.user?.id || 'admin_bypass',
        categoryId: data.categoryId,
        published: data.published || false,
        featured: data.featured || false,
        publishedAt: data.published ? new Date() : null
      },
      include: {
        author: {
          select: {
            name: true,
            email: true,
          },
        },
        category: true,
      },
    });
    
    logger.info(`Post criado com sucesso: ${post.id}`);
    return res.status(201).json(post);
  } catch (error) {
    logger.error('[BYPASS] Erro ao criar post:', error);
    return res.status(500).json({ error: 'Erro interno ao criar post' });
  }
});

// Rota bypass para estatísticas de admin
app.get('/api/admin/stats', async (req: Request, res: Response) => {
  try {
    logger.info('[BYPASS] Obtendo estatísticas de admin');
    const prisma = (await import('./config/prisma')).default;
    
    const [userCount, businessCount, professionalCount, jobCount, applicationCount, blogPostCount, reviewCount] = 
      await Promise.all([
        prisma.user.count(),
        prisma.business.count(),
        prisma.professional.count(),
        prisma.job.count(),
        prisma.application.count(),
        prisma.blogPost.count(),
        prisma.review.count(),
      ]);
    
    return res.json({
      users: userCount,
      businesses: businessCount,
      professionals: professionalCount,
      jobs: jobCount,
      applications: applicationCount,
      blogPosts: blogPostCount,
      reviews: reviewCount,
    });
  } catch (error) {
    logger.error('[BYPASS] Erro ao obter estatísticas:', error);
    return res.status(500).json({ error: 'Erro interno ao obter estatísticas' });
  }
});

// ======= FIM DAS ROTAS PÚBLICAS ========

// Configurações de segurança e outros middlewares
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  sentry.initSentry();
  app.use(sentryRequestHandler);
}

// Middleware de autenticação (exceto para rotas bypass)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Não aplicar autenticação para a rota bypass
  if (req.path === '/api/blog/posts' && req.method === 'POST') {
    return next();
  }
  
  // Aplicar middleware de autenticação para todas as outras rotas
  return sessionRecoveryMiddleware(req, res, next);
});

// Rotas da API
app.use('/api', routes);

// Tratamento de erros
if (process.env.NODE_ENV === 'production') {
  app.use(sentryErrorHandler);
}
app.use(errorHandler);

export default app; 