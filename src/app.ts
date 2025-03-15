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
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-User-ID',
    'X-User-Email',
    'X-User-Role'
  ],
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
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

// Middleware simplificado para verificar JWT
const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
  logger.info('[JWT] Iniciando verificação do token');
  
  const authHeader = req.headers.authorization;
  logger.debug('[JWT] Authorization header:', authHeader);
  
  const token = authHeader?.split(' ')[1];
  
  logger.debug('[JWT] Headers recebidos:', JSON.stringify(req.headers, null, 2));
  
  if (!token) {
    logger.warn('[JWT] Token não fornecido');
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  try {
    logger.debug('[JWT] Tentando verificar token com JWT_SECRET');
    // Verificar o token JWT
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    logger.debug('[JWT] Token decodificado:', JSON.stringify(decoded, null, 2));
    
    // Adicionar informações do usuário à requisição
    req.user = {
      id: decoded.sub,
      clerkId: decoded.sub,
      role: decoded.role || 'user',
      email: decoded.email
    };
    
    logger.info('[JWT] Token validado com sucesso. User:', JSON.stringify(req.user, null, 2));
    next();
  } catch (error) {
    logger.error('[JWT] Erro ao verificar token:', error);
    return res.status(401).json({ 
      error: 'Token inválido',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

// Chave de API para o blog (em produção, use variável de ambiente)
const BLOG_API_KEY = process.env.BLOG_API_KEY || 'blog-secret-key-2024';

// Rate limiting específico para a rota do blog
const blogRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // limite de 50 requisições por IP
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});

// Middleware para verificar a chave de API do blog
const verifyBlogApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== BLOG_API_KEY) {
    logger.warn('[BYPASS] Tentativa de acesso sem API key válida');
    return res.status(401).json({ error: 'API key inválida ou não fornecida' });
  }
  
  logger.info('[BYPASS] API key validada com sucesso');
  next();
};

// Rota do blog com autenticação JWT
app.post('/api/blog/posts', verifyJWT, async (req: Request, res: Response) => {
  try {
    logger.info('[BLOG] Recebida requisição POST /api/blog/posts');
    logger.debug('[BLOG] User:', JSON.stringify(req.user, null, 2));
    logger.debug('[BLOG] Body:', JSON.stringify(req.body, null, 2));

    // Acessar o prisma diretamente
    const prisma = (await import('./config/prisma')).default;
    
    const data = req.body;
    
    // Verificar dados obrigatórios
    if (!data.title || !data.content || !data.categoryId) {
      logger.warn('[BLOG] Dados obrigatórios ausentes');
      return res.status(400).json({ 
        error: 'Dados incompletos',
        required: ['title', 'content', 'categoryId'],
        received: Object.keys(data)
      });
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
      logger.warn('[BLOG] Tentativa de criar post com título duplicado');
      return res.status(400).json({ error: 'Já existe um post com este título' });
    }
    
    if (!req.user?.id) {
      logger.error('[BLOG] User ID não encontrado na requisição');
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Criar post usando o ID do usuário autenticado
    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        content: data.content,
        tags: data.tags || [],
        image: data.image || null,
        authorId: req.user.id,
        categoryId: data.categoryId,
        published: true,
        featured: false,
        publishedAt: new Date()
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
    
    logger.info(`[BLOG] Post criado com sucesso: ${post.id}`);
    return res.status(201).json(post);
  } catch (error) {
    logger.error('[BLOG] Erro ao criar post:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao criar post',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
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

// Middleware de autenticação (exceto para rotas públicas)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Lista de rotas públicas
  const publicRoutes = [
    { path: '/api/blog/posts', method: 'POST' },
    { path: '/api/admin/stats', method: 'GET' }
  ];

  // Verificar se é uma rota pública
  const isPublicRoute = publicRoutes.some(route => 
    route.path === req.path && route.method === req.method
  );

  if (isPublicRoute) {
    logger.debug(`[AUTH] Rota pública acessada: ${req.method} ${req.path}`);
    return next();
  }
  
  // Aplicar middleware de autenticação do Clerk
  return verifyJWT(req, res, next);
});

// Rotas da API
app.use('/api', routes);

// Tratamento de erros
if (process.env.NODE_ENV === 'production') {
  app.use(sentryErrorHandler);
}
app.use(errorHandler);

export default app; 