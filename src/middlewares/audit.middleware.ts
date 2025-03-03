import { Request, Response, NextFunction } from 'express';
import AuditService from '../services/AuditService';

// Definindo uma interface para estender o Request
interface AuthRequest extends Request {
  user?: {
    id: string;
    clerkId: string;
    role: string;
    email: string;
  };
}

/**
 * Middleware para auditoria de ações
 * @param action Nome da ação
 * @param entityType Tipo da entidade
 * @param getEntityId Função para extrair o ID da entidade da requisição
 */
export const auditAction = (
  action: string,
  entityType: string,
  getEntityId?: (req: Request) => string | undefined
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Capturar o response original para auditar após a conclusão da requisição
    const originalSend = res.send;

    // Sobrescrever o método send para capturar o resultado
    res.send = function (body?: any): Response {
      // Restaurar o método original
      res.send = originalSend;

      // Executar o método original
      const result = originalSend.call(this, body);

      // Se a requisição foi bem-sucedida (status 2xx), registrar a auditoria
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = req.user?.id || 'anonymous';
          const entityId = getEntityId ? getEntityId(req) : undefined;
          const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

          // Determinar os detalhes a serem registrados
          let details: any;
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            // Para requisições que modificam dados, registrar o corpo da requisição
            details = {
              requestBody: req.body,
              // Se o corpo da resposta for um objeto, incluí-lo nos detalhes
              responseBody: typeof body === 'string' ? JSON.parse(body) : body,
            };
          } else if (req.method === 'DELETE') {
            // Para exclusões, registrar apenas o ID da entidade
            details = { entityId };
          } else {
            // Para outras requisições, não registrar detalhes
            details = undefined;
          }

          // Registrar a auditoria de forma assíncrona
          AuditService.logAction({
            userId,
            action,
            entityType,
            entityId,
            details,
            ipAddress,
          }).catch((error) => {
            console.error('Erro ao registrar auditoria:', error);
          });
        } catch (error) {
          console.error('Erro ao processar auditoria:', error);
        }
      }

      return result;
    };

    next();
  };
};

/**
 * Middleware para auditoria de ações administrativas
 */
export const auditAdminAction = (action: string, entityType: string) => {
  return auditAction(`ADMIN_${action}`, entityType, (req) => {
    // Tentar extrair o ID da entidade de várias fontes possíveis
    return req.params.id || req.body.id || req.body.itemId;
  });
};

/**
 * Middleware para auditoria de ações de usuário
 */
export const auditUserAction = (action: string, entityType: string) => {
  return auditAction(`USER_${action}`, entityType, (req) => {
    // Tentar extrair o ID da entidade de várias fontes possíveis
    return req.params.id || req.body.id;
  });
}; 