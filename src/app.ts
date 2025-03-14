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

const app = express();

// ======= INÍCIO DAS ROTAS BYPASS (MÁXIMA PRIORIDADE) ========
// ATENÇÃO: Estas rotas são definidas antes de todos os middlewares
// para garantir que não sejam afetadas por nenhuma configuração

// Middleware CORS específico para a rota bypass de posts
app.use('/api/blog/posts', (req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Responder imediatamente para requisições OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Rota bypass para posts do blog direta (sem auth) - IMPLEMENTAÇÃO DIRETA
app.post('/api/blog/posts', async (req: Request, res: Response) => {
  try {
    logger.info('[BYPASS] Recebida requisição POST /api/blog/posts');
    logger.debug('[BYPASS] Headers:', req.headers);
    
    // Processar o corpo da requisição manualmente (já que estamos antes dos middlewares)
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.debug('[BYPASS] Corpo vazio, tentando processar manualmente');
      // Se o corpo já não foi processado, tente processar manualmente
      if (req.headers['content-type']?.includes('application/json')) {
        let data = '';
        req.on('data', chunk => {
          data += chunk;
          logger.debug('[BYPASS] Recebido chunk de dados');
        });
        
        await new Promise<void>((resolve) => {
          req.on('end', () => {
            try {
              if (data) {
                logger.debug('[BYPASS] Dados recebidos:', data);
                req.body = JSON.parse(data);
                logger.debug('[BYPASS] Dados parseados:', req.body);
              }
              resolve();
            } catch (e) {
              logger.error('[BYPASS] Erro ao processar JSON do corpo:', e);
              req.body = {};
              resolve();
            }
          });
        });
      }
    }

    logger.info('[BYPASS] Iniciando criação de post');
    logger.debug('[BYPASS] Body após processamento:', req.body);
    
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
        authorId: 'admin_bypass',
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
    logger.error('Erro no bypass de criação de post (implementação direta):', error);
    return res.status(500).json({ error: 'Erro interno ao criar post' });
  }
});

// Rota bypass para estatísticas de admin direta (sem auth) - IMPLEMENTAÇÃO DIRETA
app.get('/api/admin/stats', async (req: Request, res: Response) => {
  try {
    logger.info('Obtendo estatísticas de admin (implementação direta)');
    
    // Acessar o prisma diretamente
    const prisma = (await import('./config/prisma')).default;
    
    // Obter contagens de cada modelo diretamente
    const [
      userCount,
      businessCount,
      professionalCount,
      jobCount,
      applicationCount,
      blogPostCount,
      reviewCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.professional.count(),
      prisma.job.count(),
      prisma.application.count(),
      prisma.blogPost.count(),
      prisma.review.count(),
    ]);
    
    // Retornar os dados diretamente
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
    logger.error('Erro no bypass de estatísticas de admin (implementação direta):', error);
    return res.status(500).json({ error: 'Erro interno ao obter estatísticas' });
  }
});

// Definir middleware para lidar com CORS na rota específica /api/blog/posts OPTIONS
app.options('/api/blog/posts', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).send();
});

// Definir middleware para lidar com CORS na rota específica /api/admin/stats OPTIONS
app.options('/api/admin/stats', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).send();
});

// ======= FIM DAS ROTAS BYPASS ========

// Configurar trust proxy apenas para ambientes específicos
// Em produção, configurar apenas para os IPs dos proxies confiáveis (Nginx, load balancers, etc.)
if (process.env.NODE_ENV === 'production') {
  // Configurar para IPs específicos dos proxies confiáveis
  // Exemplo: app.set('trust proxy', ['10.0.0.1', '10.0.0.2']);
  // Ou para uma sub-rede: app.set('trust proxy', 'loopback, 10.0.0.0/8');
  // Se não souber os IPs exatos, use o número de proxies na cadeia
  app.set('trust proxy', 1); // Assume um proxy na frente (Nginx, etc.)
} else {
  // Em desenvolvimento, pode ser seguro desabilitar
  app.set('trust proxy', false);
}

// Inicializar Sentry em produção
if (process.env.NODE_ENV === 'production') {
  sentry.initSentry();
  // Adicionar middleware do Sentry no início para capturar todas as requisições
  app.use(sentryRequestHandler);
}

// Segurança
app.use(helmet({
  // Configurar Content-Security-Policy para permitir o funcionamento da API
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://anunciargrajaueregiao.com"]
    }
  },
  // Desativar crossOriginResourcePolicy para permitir o compartilhamento de recursos
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configuração CORS - reposicionada após configurações de segurança
app.use(cors({
  origin: [
    'https://anunciargrajaueregiao.com',
    'https://www.anunciargrajaueregiao.com',
    'https://admin.anunciargrajaueregiao.com',
    'https://dashboard.anunciargrajaueregiao.com',
    'https://api.anunciargrajaueregiao.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Clerk-Auth',
    'Clerk-Frontend-API',
    'X-Auth-Token',
    // Cabeçalhos personalizados
    'X-User-ID',
    'X-User-Email',
    'X-User-Role',
    'X-Original-User-ID'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400 // 24 horas em segundos
}));

// Rate limiting com configuração mais segura
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutos por padrão
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limite de 100 requisições por IP por padrão
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisições deste IP, tente novamente após 15 minutos',
  // Configurar uma função personalizada para determinar o IP do cliente
  // Isso é mais seguro do que confiar cegamente no X-Forwarded-For
  keyGenerator: (req) => {
    // Em produção, usar uma combinação de identificadores para maior segurança
    if (process.env.NODE_ENV === 'production') {
      // Usar o IP real (considerando o trust proxy configurado acima)
      const realIp = req.ip || '0.0.0.0';
      
      // Remover a porta do IP, se houver (problema comum em alguns proxies)
      const cleanIp = realIp.replace(/:\d+[^:]*$/, '');
      
      // Opcionalmente, combinar com outros identificadores como user-agent
      const userAgent = req.get('user-agent') || 'unknown';
      
      // Retornar uma combinação de identificadores
      return `${cleanIp}-${userAgent.substring(0, 20)}`;
    }
    
    // Em desenvolvimento, usar apenas o IP
    return req.ip || '0.0.0.0';
  },
  // Adicionar um handler para quando o limite for atingido
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit excedido para IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000 / 60) // em minutos
    });
  },
  // Desabilitar a validação do trust proxy para evitar o erro
  validate: {
    trustProxy: false
  }
});

// Aplicar rate limiting a todas as requisições
app.use(limiter);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Adicionar suporte para form-data

// Middleware de sanitização de dados
app.use(sanitizeData);

// Middleware de recuperação de sessão
app.use(sessionRecoveryMiddleware);

// Servir arquivos estáticos da pasta public
app.use('/api', express.static(path.join(__dirname, 'public')));

// Middleware de logging personalizado
app.use(logRequest);

// Middleware para registrar detalhes de autenticação em todas as requisições
app.use((req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7, 15) + '...'
      : authHeader.substring(0, 8) + '...';
    
    logger.debug(`${method} ${url} - IP: ${ip} - Token: ${token}`);
  } else {
    logger.debug(`${method} ${url} - IP: ${ip} - Sem token`);
  }
  
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    if (status >= 400) {
      logger.warn(`${method} ${url} - Status: ${status} - Duração: ${duration}ms`);
    } else {
      logger.debug(`${method} ${url} - Status: ${status} - Duração: ${duration}ms`);
    }
  });
  
  next();
});

// Adicionar rota de teste para POST
app.post('/api/test-post', (req: Request, res: Response) => {
  logger.debug('Recebendo requisição POST em /api/test-post');
  logger.debug('Headers:', req.headers);
  logger.debug('Body:', req.body);
  return res.status(200).json({ 
    message: 'POST funcionando corretamente',
    receivedData: {
      headers: req.headers,
      body: req.body
    }
  });
});

// Adicionar rota direta para blog posts
app.post('/api/blog/posts-direct', (req: Request, res: Response) => {
  logger.debug('Recebendo requisição POST em /api/blog/posts-direct');
  logger.debug('Headers:', req.headers);
  logger.debug('Body:', req.body);
  return res.status(200).json({ 
    message: 'POST direto para blog posts funcionando corretamente',
    receivedData: {
      headers: req.headers,
      body: req.body
    }
  });
});

// Documentação Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

// Rotas - Importante: as rotas devem ser definidas APÓS o middleware de prefixo de API
app.use('/api', routes);

// Rota de status
app.get('/api/status', (req, res) => {
  res.status(200).json({ status: 'online', timestamp: new Date().toISOString() });
});

// Rota para a página de recuperação de autenticação
app.get('/api/auth-recovery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth-recovery-page.html'));
});

// Rota específica para o script de recuperação de autenticação
app.get('/api/auth-recovery.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendFile(path.join(__dirname, 'public', 'auth-recovery.js'));
});

// Adicionar o middleware de tratamento de erros do Sentry antes do handler de erros padrão
if (process.env.NODE_ENV === 'production') {
  app.use(sentryErrorHandler);
}

// Middleware de tratamento de erros
app.use(errorHandler);

export default app; 