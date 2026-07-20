import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';
import { SnapshotService } from '../services/snapshotService.js';

const snapshotRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  const snapshotService = new SnapshotService(server.prisma);

  // Take Snapshot for Current Month
  server.post('/snapshots', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request, reply) => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const snapshots = await snapshotService.takeSnapshot(currentMonth);
    return { message: `Snapshots taken for ${currentMonth}`, count: snapshots.length };
  });

  // List Available Snapshots for a Company
  server.get('/snapshots/:companyId', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { companyId } = request.params;
    const snapshots = await server.prisma.companyMonthlySnapshot.findMany({
      where: { companyId },
      orderBy: { month: 'desc' }
    });
    return snapshots;
  });

  // Get Dashboard Data (Current vs Prev Month)
  server.get('/dashboard/:companyId', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { companyId } = request.params;
    const { month } = request.query;

    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const dashboard = await snapshotService.getDashboardData(companyId, targetMonth);
    
    return dashboard;
  });

  // Check Snapshot Gate Status
  server.get('/snapshots/gate-status', { preHandler: [server.authenticate] }, async (request, reply) => {
    const isOpen = await snapshotService.isGateOpen();
    return { isOpen };
  });
};

export default snapshotRoutes;
