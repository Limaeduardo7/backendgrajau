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

// Configurar trust proxy para funcionar corretamente com Nginx
app.set('trust proxy', true);

// Inicializar Sentry em produção
if (process.env.NODE_ENV === 'production') {
  sentry.initSentry();
  // Adicionar middleware do Sentry no início para capturar todas as requisições
  app.use(sentryRequestHandler);
}

// Segurança
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutos por padrão
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limite de 100 requisições por IP por padrão
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisições deste IP, tente novamente após 15 minutos',
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