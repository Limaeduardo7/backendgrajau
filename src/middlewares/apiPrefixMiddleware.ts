import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para garantir que todas as rotas tenham o prefixo /api/
 * Este middleware verifica se a rota já possui o prefixo /api/
 * Se não tiver, redireciona para a mesma rota com o prefixo /api/
 */
const apiPrefixMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Ignorar requisições para arquivos estáticos ou outros recursos não-API
  if (req.path.startsWith('/public/') || 
      req.path.startsWith('/assets/') || 
      req.path.startsWith('/favicon.ico') ||
      req.path === '/') {
    return next();
  }

  // Se a rota não começar com /api/ e não for uma rota de sistema
  if (!req.path.startsWith('/api/')) {
    // Construir a nova URL com o prefixo /api/
    const newPath = `/api${req.path.startsWith('/') ? req.path : `/${req.path}`}`;
    
    // Preservar query parameters
    const queryString = Object.keys(req.query).length > 0 
      ? `?${new URLSearchParams(req.query as Record<string, string>).toString()}` 
      : '';
    
    // Redirecionar para a nova URL
    return res.redirect(307, `${newPath}${queryString}`);
  }

  next();
};

export default apiPrefixMiddleware; 