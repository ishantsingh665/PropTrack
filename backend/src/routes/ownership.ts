import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';

const ownershipRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Add Ownership Stake
  server.post('/:id/owners', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { companyId, ownershipPct, status = 'active' } = request.body;

    if (!companyId || ownershipPct === undefined) {
      return reply.status(400).send({ message: 'Company ID and Ownership Percentage are required' });
    }

    const stake = await server.prisma.propertyCompany.create({
      data: {
        propertyId: id,
        companyId,
        ownershipPct,
        status,
        validFrom: new Date(),
      },
    });

    return stake;
  });

  // Update Ownership Stake
  server.put('/:id/owners/:companyId', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id, companyId } = request.params;
    const { ownershipPct, status } = request.body;

    const stake = await server.prisma.propertyCompany.findFirst({
      where: {
        propertyId: id,
        companyId,
        validTo: null,
      },
    });

    if (!stake) {
      return reply.status(404).send({ message: 'Ownership stake not found' });
    }

    const updatedStake = await server.prisma.propertyCompany.update({
      where: { id: stake.id },
      data: {
        ...(ownershipPct !== undefined ? { ownershipPct } : {}),
        ...(status ? { status } : {}),
      },
    });

    return updatedStake;
  });

  // Remove Ownership Stake (Soft Delete - close the timeline)
  server.delete('/:id/owners/:companyId', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id, companyId } = request.params;

    const stake = await server.prisma.propertyCompany.findFirst({
      where: {
        propertyId: id,
        companyId,
        validTo: null,
      },
    });

    if (!stake) {
      return reply.status(404).send({ message: 'Ownership stake not found' });
    }

    await server.prisma.propertyCompany.update({
      where: { id: stake.id },
      data: {
        validTo: new Date(),
        status: 'transferred', // Default status when removed
      },
    });

    return { message: 'Ownership stake closed successfully' };
  });
};

export default ownershipRoutes;
