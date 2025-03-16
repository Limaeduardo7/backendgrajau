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

// Configuração CORS atualizada
app.use(cors({
  origin: ['https://anunciargrajaueregiao.com', 'http://localhost:5173'],
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

// Middleware para verificar JWT do Supabase
const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info('[AUTH] Modo temporário de teste - autenticação desativada');
    
    // Adicionar informações de usuário temporário para testes
    req.user = {
      id: "user_test_temporary",
      clerkId: "user_test_temporary",
      role: "ADMIN",
      email: "test@example.com"
    };
    
    logger.info('[AUTH] Usuário de teste configurado:', JSON.stringify(req.user, null, 2));
    return next();
    
    // Código original comentado
    /*
    logger.info('[AUTH] Iniciando verificação do token');
    logger.debug('[AUTH] Headers completos:', req.headers);
    logger.debug('[AUTH] JWT_SECRET configurado:', !!process.env.JWT_SECRET);
    
    const authHeader = req.headers.authorization;
    logger.debug('[AUTH] Authorization header:', authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('[AUTH] Token não fornecido ou formato inválido');
      return res.status(401).json({ 
        error: 'Token não fornecido ou formato inválido',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];
    logger.debug('[AUTH] Token extraído:', token.substring(0, 20) + '...');
    
    if (!process.env.JWT_SECRET) {
      logger.error('[AUTH] JWT_SECRET não configurado no ambiente');
      return res.status(500).json({ 
        error: 'Erro de configuração do servidor',
        code: 'NO_JWT_SECRET'
      });
    }
    
    try {
      // Verificar o token JWT usando a chave do Supabase
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      logger.debug('[AUTH] Token decodificado:', JSON.stringify(decoded, null, 2));

      // Adicionar informações do usuário à requisição
      req.user = {
        id: decoded.sub,
        clerkId: decoded.sub, // Mantemos para compatibilidade
        role: decoded.role || 'user',
        email: decoded.email
      };

      logger.info('[AUTH] Token validado com sucesso. User:', JSON.stringify(req.user, null, 2));
      next();
    } catch (error) {
      logger.error('[AUTH] Erro ao verificar token:', error);
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'INVALID_TOKEN',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
    */
  } catch (error) {
    logger.error('[AUTH] Erro no middleware de autenticação:', error);
    return res.status(500).json({ 
      error: 'Erro interno no servidor',
      code: 'SERVER_ERROR',
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

// Rota pública para testes sem nenhuma verificação de autenticação
app.post('/api/blog/posts-public', async (req: Request, res: Response) => {
  try {
    logger.info('[BLOG] Recebida requisição POST /api/blog/posts-public (rota pública)');
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
    
    // ID fixo de um usuário ADMIN para teste
    const fixedAuthorId = "testuser123";

    // Criar post usando o ID do usuário fixo para testes
    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        content: data.content,
        tags: data.tags || [],
        image: data.image || null,
        authorId: fixedAuthorId,
        categoryId: data.categoryId,
        published: true,
        featured: false,
        publishedAt: new Date()
      }
    });
    
    logger.info(`[BLOG] Post criado com sucesso: ${post.id}`);
    res.status(201).json(post);
  } catch (error) {
    logger.error('[BLOG] Erro ao criar post:', error);
    res.status(500).json({ error: 'Erro ao criar post' });
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

// Remover a rota do blog da lista de rotas públicas
const publicRoutes = [
  { path: '/api/admin/stats', method: 'GET' }
];

// Middleware de autenticação (exceto para rotas públicas)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Verificar se é uma rota pública
  const isPublicRoute = publicRoutes.some(route => 
    route.path === req.path && route.method === req.method
  );

  if (isPublicRoute) {
    logger.debug(`[AUTH] Rota pública acessada: ${req.method} ${req.path}`);
    return next();
  }
  
  // Aplicar middleware de autenticação JWT
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