import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';

const geocodeRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // List Geocoding Queue (Admin/Editor Only)
  server.get('/queue', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const queue = await server.prisma.geocodeQueue.findMany({
      include: {
        // We can't directly include property because it's not a formal relation in schema.prisma 
        // (the field is propertyId but no @relation was defined in the snippet I saw earlier).
        // Let's check the schema again or just manually join if needed.
      },
      orderBy: { nextRunAt: 'asc' }
    });

    // Manual join for better UI
    const propertyIds = queue.map(q => q.propertyId);
    const properties = await server.prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: { id: true, name: true, addressLine1: true, city: true, countryCode: true }
    });

    const propertyMap = properties.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as any);

    return queue.map(q => ({
      ...q,
      property: propertyMap[q.propertyId] || null
    }));
  });

  // Retry Failed Job
  server.post('/queue/:id/retry', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id } = request.params;
    
    const job = await server.prisma.geocodeQueue.findUnique({ where: { id } });
    if (!job) return reply.status(404).send({ message: 'Job not found' });

    await server.prisma.geocodeQueue.update({
      where: { id },
      data: {
        attempts: 0,
        nextRunAt: new Date(),
        lastError: null
      }
    });

    return { message: 'Job reset for retry' };
  });

  // Force Queue Process
  server.post('/process', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request, reply) => {
    await (server as any).geocodeService.processQueue();
    return { message: 'Queue processing triggered' };
  });
};

export default geocodeRoutes;
