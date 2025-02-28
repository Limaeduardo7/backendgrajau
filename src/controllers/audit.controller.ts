import { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import AuditService from '../services/AuditService';

class AuditController {
  /**
   * Lista logs de auditoria com filtros
   */
  async getAuditLogs(req: Request, res: Response) {
    try {
      const {
        userId,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        page = '1',
        limit = '20',
      } = req.query;

      // Converter datas
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate && typeof startDate === 'string') {
        parsedStartDate = new Date(startDate);
      }

      if (endDate && typeof endDate === 'string') {
        parsedEndDate = new Date(endDate);
        // Definir para o final do dia
        parsedEndDate.setHours(23, 59, 59, 999);
      }

      const result = await AuditService.getAuditLogs({
        userId: userId as string,
        action: action as string,
        entityType: entityType as string,
        entityId: entityId as string,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      });

      return res.json(result);
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
    }
  }

  /**
   * Obtém histórico de auditoria de uma entidade específica
   */
  async getEntityAuditTrail(req: Request, res: Response) {
    try {
      const { type, id } = req.params;

      if (!type || !id) {
        throw new ApiError(400, 'Tipo e ID são obrigatórios');
      }

      const logs = await AuditService.getEntityAuditTrail(type, id);

      return res.json(logs);
    } catch (error) {
      console.error('Erro ao buscar histórico de auditoria da entidade:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao buscar histórico de auditoria da entidade' });
    }
  }

  /**
   * Obtém histórico de auditoria de um usuário específico
   */
  async getUserAuditTrail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { page = '1', limit = '20' } = req.query;

      if (!id) {
        throw new ApiError(400, 'ID do usuário é obrigatório');
      }

      const result = await AuditService.getUserAuditTrail(
        id,
        parseInt(page as string, 10),
        parseInt(limit as string, 10)
      );

      return res.json(result);
    } catch (error) {
      console.error('Erro ao buscar histórico de auditoria do usuário:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao buscar histórico de auditoria do usuário' });
    }
  }

  /**
   * Registra manualmente uma ação de auditoria
   */
  async logAction(req: Request, res: Response) {
    try {
      const { action, entityType, entityId, details } = req.body;
      const userId = req.user?.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      if (!action || !entityType) {
        throw new ApiError(400, 'Ação e tipo de entidade são obrigatórios');
      }

      const audit = await AuditService.logAction({
        userId: userId || 'anonymous',
        action,
        entityType,
        entityId,
        details,
        ipAddress: ipAddress || 'unknown',
      });

      return res.status(201).json(audit);
    } catch (error) {
      console.error('Erro ao registrar ação de auditoria:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Erro ao registrar ação de auditoria' });
    }
  }
}

export default new AuditController(); 