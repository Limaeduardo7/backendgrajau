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
import apiPrefixMiddleware from './middlewares/apiPrefixMiddleware';
import { sessionRecoveryMiddleware } from './middlewares/auth.middleware';
import { Request, Response, NextFunction } from 'express';
import path from 'path';

const app = express();

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

// Middleware de recuperação de sessão (antes de morgan para capturar problemas de autenticação)
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
      ? authHeader.substring(7, 15) + '...' // Mostrar apenas parte do token por segurança
      : authHeader.substring(0, 8) + '...';
    
    logger.debug(`${method} ${url} - IP: ${ip} - Token: ${token}`);
  } else {
    logger.debug(`${method} ${url} - IP: ${ip} - Sem token`);
  }
  
  // Registrar o tempo de resposta
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

// Sanitização de dados
app.use(sanitizeData);

// Documentação Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

// Middleware para adicionar o prefixo /api/ às rotas que não o possuem
app.use(apiPrefixMiddleware);

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

// Rotas - Importante: as rotas devem ser definidas APÓS o middleware de prefixo de API
app.use('/api', routes);

// Adicionar o middleware de tratamento de erros do Sentry antes do handler de erros padrão
if (process.env.NODE_ENV === 'production') {
  app.use(sentryErrorHandler);
}

// Middleware de tratamento de erros
app.use(errorHandler);

export default app; 