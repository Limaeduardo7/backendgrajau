import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Diretório de logs
const logDir = path.join(__dirname, '../../logs');

// Garantir que o diretório de logs existe
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Arquivo de log para ações sensíveis
const securityLogFile = path.join(logDir, 'security.log');

/**
 * Registra ações sensíveis em um arquivo de log
 */
export const logSecurityAction = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Capturar o momento da ação
    const timestamp = new Date().toISOString();
    
    // Informações do usuário
    const userId = req.user?.id || 'anonymous';
    const userIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Informações da requisição
    const method = req.method;
    const url = req.originalUrl;
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Montar o log
    const logEntry = JSON.stringify({
      timestamp,
      action,
      userId,
      userIp,
      method,
      url,
      userAgent,
      requestBody: action === 'AUTH_ATTEMPT' ? { email: req.body.email } : undefined,
    });
    
    // Escrever no arquivo de log
    fs.appendFile(securityLogFile, logEntry + '\n', (err) => {
      if (err) {
        console.error('Erro ao escrever log de segurança:', err);
      }
    });
    
    next();
  };
};

/**
 * Registra tentativas de login
 */
export const logAuthAttempt = logSecurityAction('AUTH_ATTEMPT');

/**
 * Registra alterações de permissões
 */
export const logPermissionChange = logSecurityAction('PERMISSION_CHANGE');

/**
 * Registra exclusões de recursos
 */
export const logResourceDeletion = logSecurityAction('RESOURCE_DELETION');

/**
 * Registra ações administrativas
 */
export const logAdminAction = logSecurityAction('ADMIN_ACTION');

/**
 * Registra alterações de dados sensíveis
 */
export const logSensitiveDataChange = logSecurityAction('SENSITIVE_DATA_CHANGE'); 