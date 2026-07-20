import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';

const auditRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // List Audit Logs (Admin Only)
  server.get('/', { preHandler: [server.authenticate, roleGuard(['ADMIN'])] }, async (request: any, reply) => {
    const { 
      after, 
      limit = 100, 
      tableName, 
      recordId, 
      userId, 
      dateFrom, 
      dateTo,
      action 
    } = request.query;

    const take = parseInt(limit.toString());
    const cursor = after ? { id: after } : undefined;
    const skip = after ? 1 : 0;

    const logs = await server.prisma.auditLog.findMany({
      take,
      skip,
      cursor,
      where: {
        ...(tableName ? { tableName } : {}),
        ...(recordId ? { recordId } : {}),
        ...(userId ? { userId } : {}),
        ...(action ? { action } : {}),
        ...(dateFrom || dateTo ? {
          changedAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          }
        } : {}),
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { changedAt: 'desc' },
    });

    const lastId = logs.length > 0 ? logs[logs.length - 1].id : null;

    return {
      data: logs.map(log => ({
        ...log,
        changes: log.diff,
        diff: undefined
      })),
      pagination: {
        after: lastId,
        limit: take,
      },
    };
  });
};

export default auditRoutes;
