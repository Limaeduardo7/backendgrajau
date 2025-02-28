import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import logger from './logger';

/**
 * Inicializa o Sentry para monitoramento de erros
 * Só é ativado em ambiente de produção ou se forçado por variável de ambiente
 */
export const initSentry = (): void => {
  const dsn = process.env.SENTRY_DSN;
  const env = process.env.NODE_ENV || 'development';
  const enableProfiling = process.env.ENABLE_PERFORMANCE_MONITORING === 'true';
  
  // Só inicializa se tiver DSN configurado e estiver em produção
  if (!dsn) {
    logger.warn('Sentry DSN não configurado. Monitoramento de erros desativado.');
    return;
  }
  
  if (env !== 'production') {
    logger.info('Sentry não inicializado em ambiente de desenvolvimento.');
    return;
  }
  
  try {
    Sentry.init({
      dsn,
      environment: env,
      integrations: [
        // Habilita o rastreamento de performance se configurado
        ...(enableProfiling ? [new ProfilingIntegration()] : []),
      ],
      // Captura 10% das transações para performance monitoring
      tracesSampleRate: 0.1,
      // Captura 10% dos perfis se o profiling estiver habilitado
      profilesSampleRate: enableProfiling ? 0.1 : 0,
    });
    
    logger.info('Sentry inicializado com sucesso.');
  } catch (error) {
    logger.error('Erro ao inicializar Sentry:', error);
  }
};

/**
 * Middleware para capturar erros e enviar para o Sentry
 */
export const sentryErrorHandler = Sentry.Handlers.errorHandler();

/**
 * Middleware para rastrear requisições no Sentry
 */
export const sentryRequestHandler = Sentry.Handlers.requestHandler({
  // Não inclui dados sensíveis nos logs
  ip: true,
  user: ['id', 'role'],
  request: ['headers', 'method', 'url'],
});

/**
 * Captura uma exceção manualmente e envia para o Sentry
 */
export const captureException = (error: Error, context?: Record<string, any>): void => {
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: context });
  }
  
  // Sempre registra no log local
  logger.error(`${error.message}`, { error, ...context });
};

export default {
  initSentry,
  sentryErrorHandler,
  sentryRequestHandler,
  captureException,
}; 