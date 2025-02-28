import rateLimit from 'express-rate-limit';

// Limiter padrão para a maioria das rotas
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: {
    error: 'Muitas requisições deste IP, por favor tente novamente após 15 minutos'
  }
});

// Limiter mais restritivo para rotas sensíveis (login, cadastro, etc)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // limite de 5 tentativas
  message: {
    error: 'Muitas tentativas de autenticação, por favor tente novamente após 1 hora'
  }
});

// Limiter para webhook (permite maior número de chamadas)
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 60, // 60 requisições por minuto (um por segundo)
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter mais restritivo para rotas sensíveis (autenticação, pagamentos, etc.)
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // limite cada IP a 10 requisições por janela
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Muitas tentativas, tente novamente mais tarde',
    code: 'TOO_MANY_ATTEMPTS'
  }
});

// Limiter específico para a API pública
export const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // número de requisições
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Limite de requisições excedido para a API pública',
  },
}); 