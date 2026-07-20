import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';
import { TransferService } from '../services/transferService.js';

const transferRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  const transferService = new TransferService(server.prisma);

  // List Transfers (Keyset Pagination)
  server.get('/', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { after, limit = 50 } = request.query;
    
    const take = parseInt(limit.toString());
    const cursor = after ? { id: after } : undefined;
    const skip = after ? 1 : 0;

    const transfers = await server.prisma.propertyTransfer.findMany({
      take,
      skip,
      cursor,
      include: {
        legs: {
          include: {
            propertyCompany: {
              include: {
                property: true,
                company: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const lastId = transfers.length > 0 ? transfers[transfers.length - 1].id : null;

    return {
      data: transfers,
      pagination: {
        after: lastId,
        limit: take,
      },
    };
  });

  // Get Single Transfer
  server.get('/:id', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { id } = request.params;
    const transfer = await server.prisma.propertyTransfer.findUnique({
      where: { id },
      include: {
        legs: {
          include: {
            propertyCompany: {
              include: {
                property: true,
                company: true,
              }
            }
          }
        }
      },
    });

    if (!transfer) {
      return reply.status(404).send({ message: 'Transfer not found' });
    }

    return transfer;
  });

  // Create Transfer/Swap
  server.post('/', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { type, legs, notes } = request.body;

    if (!type || !legs || !Array.isArray(legs) || legs.length === 0) {
      return reply.status(400).send({ message: 'Type and legs are required' });
    }

    try {
      const result = await transferService.executeTransferEvent(type, legs, notes);
      return result;
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });

  // Reverse Transfer
  server.post('/:id/reverse', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { notes } = request.body;

    try {
      const result = await transferService.reverseTransfer(id, notes);
      return result;
    } catch (err: any) {
      return reply.status(400).send({ message: err.message });
    }
  });
};

export default transferRoutes;
