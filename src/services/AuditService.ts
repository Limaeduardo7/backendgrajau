import prisma from '../config/prisma';

/**
 * Serviço para registrar e consultar ações de auditoria
 */
class AuditService {
  /**
   * Registra uma ação de auditoria
   */
  async logAction(data: {
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
  }) {
    try {
      const { userId, action, entityType, entityId, details, ipAddress } = data;

      const audit = await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId: entityId || null,
          details: details ? JSON.stringify(details) : null,
          ipAddress: ipAddress || null,
          timestamp: new Date(),
        },
      });

      return audit;
    } catch (error) {
      console.error('Erro ao registrar auditoria:', error);
      // Não lançamos erro para não interromper o fluxo principal
      return null;
    }
  }

  /**
   * Busca registros de auditoria com filtros
   */
  async getAuditLogs(params: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = params;

    const skip = (page - 1) * limit;

    // Construir filtro
    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    // Filtro de data
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    // Buscar logs
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Processar detalhes
    const processedLogs = logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));

    return {
      logs: processedLogs,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  }

  /**
   * Busca registros de auditoria para uma entidade específica
   */
  async getEntityAuditTrail(entityType: string, entityId: string) {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Processar detalhes
    return logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  }

  /**
   * Busca registros de auditoria para um usuário específico
   */
  async getUserAuditTrail(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          userId,
        },
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({
        where: {
          userId,
        },
      }),
    ]);

    // Processar detalhes
    const processedLogs = logs.map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));

    return {
      logs: processedLogs,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  }
}

export default new AuditService(); 