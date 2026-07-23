import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';
import { SnapshotService } from '../services/snapshotService.js';

const snapshotRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  const snapshotService = new SnapshotService(server.prisma);

  // --- New Snapshot Architecture Endpoints ---

  // Get Snapshot Preview Counts
  server.get('/snapshots/preview', { preHandler: [server.authenticate] }, async (request, reply) => {
    return await snapshotService.getSnapshotPreview();
  });

  // Get List of Snapshot Years
  server.get('/snapshots/years', { preHandler: [server.authenticate] }, async (request, reply) => {
    const years = await snapshotService.getSnapshotYears();
    return { years };
  });

  // List All Snapshots
  server.get('/snapshots', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { year } = request.query;
    return await snapshotService.listSnapshots(year ? parseInt(year) : undefined);
  });

  // Create New Snapshot
  server.post('/snapshots', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { name, year } = request.body;
    if (!name || !year) {
      return reply.status(400).send({ message: 'Name and Year are required.' });
    }
    try {
      const snapshot = await snapshotService.createSnapshot(name, year, request.user.id);
      return snapshot;
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return reply.status(409).send({ message: error.message });
      }
      throw error;
    }
  });

  // Get Snapshot Detail (with Resolved Data)
  server.get('/snapshots/:id', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { id } = request.params;
    return await snapshotService.getSnapshotDetail(id);
  });

  // Edit Snapshot Company Overrides
  server.patch('/snapshots/:snapshotId/companies/:snapshotCompanyId', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { snapshotCompanyId } = request.params;
    return await snapshotService.updateSnapshotCompany(snapshotCompanyId, request.body);
  });

  // Edit Snapshot Property Overrides
  server.patch('/snapshots/:snapshotId/properties/:snapshotPropertyId', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { snapshotPropertyId } = request.params;
    return await snapshotService.updateSnapshotProperty(snapshotPropertyId, request.body);
  });

  // --- Legacy / Dashboard Snapshots (Keep for now if dashboard relies on them) ---

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

  // Legacy POST /snapshots for monthly logic - maybe deprecate or keep as "Quick Snapshot"
  server.post('/snapshots/monthly', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request, reply) => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    // This is the old takeSnapshot logic which I've removed from the service in favor of the new one
    // If needed, we can re-add it or map it to a new service method.
    // For now, I'll return a 501 or similar if we decide to remove monthly snapshots.
    return reply.status(501).send({ message: 'Monthly snapshots are deprecated in favor of the new Snapshot system.' });
  });
};

export default snapshotRoutes;
