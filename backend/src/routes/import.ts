import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';
import { snapshotGate } from '../middleware/snapshotGate.js';
import { ImportService } from '../services/importService.js';

const importRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Bulk Import CSV
  server.post('/', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR']), snapshotGate] }, async (request: any, reply) => {
    const { companyId } = request.query;
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ message: 'No file uploaded' });
    }

    if (!data.filename.endsWith('.csv')) {
      return reply.status(400).send({ message: 'Only CSV files are allowed' });
    }

    const csvData = (await data.toBuffer()).toString();

    // Create Import Job
    const job = await server.prisma.importJob.create({
      data: {
        userId: request.user.id,
        status: 'pending',
        filename: data.filename,
      },
    });

    // Start processing in background
    const importService = new ImportService(server.prisma);
    importService.processImport(job.id, csvData, companyId).catch(err => {
      server.log.error(`Import Job ${job.id} failed:`, err);
    });

    return { jobId: job.id, status: 'pending' };
  });

  // Get Import Job Status
  server.get('/:jobId', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { jobId } = request.params;
    const job = await server.prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return reply.status(404).send({ message: 'Import job not found' });
    }

    return job;
  });
};

export default importRoutes;
