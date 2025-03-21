import express, { Request, Response, NextFunction } from 'express';
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
import path from 'path';
import jwt from 'jsonwebtoken';
import publicRoutes from './routes/public.routes';

const app = express();

// Configurações básicas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuração CORS atualizada
app.use(cors({
  origin: ['https://anunciargrajaueregiao.com', 'http://localhost:5173', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-User-ID',
    'X-User-Email',
    'X-User-Role',
    'X-API-Key'
  ],
  credentials: true
}));

// Log de todas as requisições
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`[REQUEST] ${req.method} ${req.path}`);
  logger.debug('[REQUEST] Headers:', req.headers);
  logger.debug('[REQUEST] Body:', req.body);
  next();
});

// Rotas públicas (sem autenticação)
app.use('/public', publicRoutes);

// ======= INÍCIO DAS ROTAS PÚBLICAS (ALTA PRIORIDADE) ========

// Rota de teste básica
app.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Servidor está funcionando!' });
});

// Rota pública para criar posts no blog sem qualquer autenticação
app.post('/public/blog/posts', express.json(), async (req: Request, res: Response) => {
  logger.info('[PUBLIC API] Iniciando POST /public/blog/posts');
  logger.debug('[PUBLIC API] Headers:', req.headers);
  logger.debug('[PUBLIC API] Body:', req.body);
  
  try {
    logger.info('[PUBLIC API] Recebida requisição POST /public/blog/posts');
    logger.debug('[PUBLIC API] Body:', JSON.stringify(req.body, null, 2));
    
    // Acessar o prisma diretamente
    const prisma = (await import('./config/prisma')).default;
    
    const data = req.body;
    
    // Verificar dados obrigatórios
    if (!data.title || !data.content || !data.categoryId) {
      logger.warn('[PUBLIC API] Dados obrigatórios ausentes');
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
      logger.warn('[PUBLIC API] Tentativa de criar post com título duplicado');
      return res.status(400).json({ error: 'Já existe um post com este título' });
    }
    
    // Usar o ID fixo do usuário admin que foi criado
    const adminId = 'admin_user';
    
    // Criar post usando o ID do admin
    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug,
        content: data.content,
        tags: data.tags || [],
        image: data.image || null,
        authorId: adminId, // ID fixo do admin
        categoryId: data.categoryId,
        published: true,
        featured: false,
        publishedAt: new Date()
      }
    });
    
    logger.info(`[PUBLIC API] Post criado com sucesso: ${post.id}`);
    res.status(201).json(post);
  } catch (error) {
    logger.error('[PUBLIC API] Erro ao criar post:', error);
    res.status(500).json({ error: 'Erro ao criar post' });
  }
});

// Rota pública para listar as categorias do blog
app.get('/public/blog/categories', async (req: Request, res: Response) => {
  // Configuração CORS específica para esta rota
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  try {
    logger.info('[PUBLIC API] Recebida requisição GET /public/blog/categories');
    
    // Acessar o prisma diretamente
    const prisma = (await import('./config/prisma')).default;
    
    // Buscar todas as categorias
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    logger.info(`[PUBLIC API] ${categories.length} categorias recuperadas com sucesso`);
    res.status(200).json(categories);
  } catch (error) {
    logger.error('[PUBLIC API] Erro ao listar categorias:', error);
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

// Rota pública para listar os posts do blog
app.get('/public/blog/posts', async (req: Request, res: Response) => {
  // Configuração CORS específica para esta rota
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  try {
    logger.info('[PUBLIC API] Recebida requisição GET /public/blog/posts');
    
    // Acessar o prisma diretamente
    const prisma = (await import('./config/prisma')).default;
    
    // Buscar todos os posts
    const posts = await prisma.blogPost.findMany({
      where: {
        published: true
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        category: true
      },
      orderBy: {
        publishedAt: 'desc'
      }
    });
    
    logger.info(`[PUBLIC API] ${posts.length} posts recuperados com sucesso`);
    res.status(200).json(posts);
  } catch (error) {
    logger.error('[PUBLIC API] Erro ao listar posts:', error);
    res.status(500).json({ error: 'Erro ao listar posts' });
  }
});

// Rota pública para buscar um post específico
app.get('/public/blog/posts/:id', async (req: Request, res: Response) => {
  // Configuração CORS específica para esta rota
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  try {
    const { id } = req.params;
    logger.info(`[PUBLIC API] Recebida requisição GET /public/blog/posts/${id}`);
    
    // Acessar o prisma diretamente
    const prisma = (await import('./config/prisma')).default;
    
    // Buscar o post pelo ID
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        category: true,
        comments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!post) {
      logger.warn(`[PUBLIC API] Post com ID ${id} não encontrado`);
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    
    logger.info(`[PUBLIC API] Post ${id} recuperado com sucesso`);
    res.status(200).json(post);
  } catch (error) {
    logger.error('[PUBLIC API] Erro ao buscar post:', error);
    res.status(500).json({ error: 'Erro ao buscar post' });
  }
});

// Adicionar OPTIONS handler global para rotas públicas
app.options('/public/*', (req: Request, res: Response) => {
  logger.info(`[CORS] Handling OPTIONS for ${req.path}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.status(204).send();
});

// ======= FIM DAS ROTAS PÚBLICAS ========

// Configurações de segurança
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

// Lista de rotas que não precisam de autenticação
const publicPaths = [
  { path: '/api/admin/stats', method: 'GET' },
  { path: '/api/blog/posts', method: 'POST' },
  { path: '/api/blog/posts-public', method: 'POST' }
];

// Middleware de autenticação (exceto para rotas públicas)
app.use((req: Request, res: Response, next: NextFunction) => {
  // Verificar se é uma rota pública
  const isPublicPath = publicPaths.some(route => 
    route.path === req.path && route.method === req.method
  );

  if (isPublicPath) {
    logger.debug(`[AUTH] Rota pública acessada: ${req.method} ${req.path}`);
    return next();
  }
  
  // Aplicar middleware de autenticação JWT
  return verifyJWT(req, res, next);
});

// ====== NOVAS ROTAS PÚBLICAS PARA TESTES NO POSTMAN ======

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
app.post('/api/blog/posts', (req: Request, res: Response, next: NextFunction) => {
  // Configuração CORS específica para esta rota
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Usuário temporário para bypass de autenticação
  req.user = {
    id: "user_test_temporary",
    clerkId: "user_test_temporary",
    role: "ADMIN",
    email: "test@example.com"
  };
  
  logger.info('[BYPASS] Autenticação desativada para rota do blog');
  next();
}, async (req: Request, res: Response) => {
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

// Adicionar suporte para OPTIONS preflight para a rota do blog
app.options('/api/blog/posts', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.status(204).send();
});

// ======= FIM DAS ROTAS PÚBLICAS ========

// Rotas da API
app.use('/api', routes);

// Tratamento de erros
if (process.env.NODE_ENV === 'production') {
  app.use(sentryErrorHandler);
}
app.use(errorHandler);

export default app; 