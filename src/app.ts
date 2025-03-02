import express from 'express';
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
app.use(helmet());

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
      
      // Opcionalmente, combinar com outros identificadores como user-agent
      const userAgent = req.get('user-agent') || 'unknown';
      
      // Retornar uma combinação de identificadores
      return `${realIp}-${userAgent.substring(0, 20)}`;
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
  }
});

// Aplicar rate limiting a todas as requisições
app.use(limiter);

// Middlewares
app.use(express.json());

// Configurar Morgan para usar o logger Winston
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.http(message.trim());
    },
  },
}));

// Middleware de logging personalizado
app.use(logRequest);

// Sanitização de dados
app.use(sanitizeData);

// Documentação Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

// Middleware para adicionar o prefixo /api/ às rotas que não o possuem
app.use(apiPrefixMiddleware);

// Rota de status
app.get('/status', (req, res) => {
  res.status(200).json({ status: 'online', timestamp: new Date().toISOString() });
});

// Rotas - Importante: as rotas devem ser definidas APÓS o middleware de prefixo de API
app.use('/api', routes);

// Middleware do Sentry para capturar erros (antes do errorHandler)
if (process.env.NODE_ENV === 'production') {
  app.use(sentryErrorHandler);
}

// Tratamento de erros
app.use(errorHandler);

export default app; 