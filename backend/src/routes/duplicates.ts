import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';
import { DuplicateEngine } from '../services/duplicateEngine.js';
import { MergeService } from '../services/mergeService.js';

const duplicateRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  const duplicateEngine = new DuplicateEngine(server.prisma);
  const mergeService = new MergeService(server.prisma);

  // List Duplicate Pairs
  server.get('/', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { status, scope, matchLevel } = request.query;

    const pairs = await server.prisma.duplicatePair.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(scope ? { scope } : {}),
        ...(matchLevel ? { matchLevel } : {}),
      },
      include: {
        property1: {
          include: {
            type: true,
            companies: {
              where: { validTo: null },
              include: { company: true }
            }
          }
        },
        property2: {
          include: {
            type: true,
            companies: {
              where: { validTo: null },
              include: { company: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return pairs;
  });

  // Trigger Scan
  server.post('/scan', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request, reply) => {
    try {
      const result = await duplicateEngine.scanForDuplicates();
      return result;
    } catch (err: any) {
      return reply.status(500).send({ message: err.message });
    }
  });

  // Update Status
  server.patch('/:id', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { status } = request.body;

    if (!['pending', 'duplicate', 'not_duplicate', 'merged'].includes(status)) {
      return reply.status(400).send({ message: 'Invalid status' });
    }

    const pair = await server.prisma.duplicatePair.update({
      where: { id },
      data: { status },
    });

    return pair;
  });

  // Execute Merge
  server.post('/:id/merge', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { keepId, removeId } = request.body;
    const userId = request.user.id;

    if (!keepId || !removeId) {
      return reply.status(400).send({ message: 'Both keepId and removeId are required' });
    }

    try {
      const result = await mergeService.executeMerge(id, keepId, removeId, userId);
      return result;
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });
};

export default duplicateRoutes;
