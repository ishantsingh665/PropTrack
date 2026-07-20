import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';

const propertyTypeRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // List All Property Types (Hierarchy)
  server.get('/', { preHandler: [server.authenticate] }, async (request, reply) => {
    const types = await server.prisma.propertyType.findMany({
      where: { parentId: null },
      include: {
        children: true,
      },
    });

    return types;
  });

  // Create Property Type (Admin Only)
  server.post('/', { preHandler: [server.authenticate, roleGuard(['ADMIN'])] }, async (request: any, reply) => {
    const { name, parentId } = request.body;

    if (!name) {
      return reply.status(400).send({ message: 'Name is required' });
    }

    const type = await server.prisma.propertyType.create({
      data: {
        name,
        parentId,
      },
    });

    return type;
  });

  // Toggle Active Status (Admin Only)
  server.patch('/:id/toggle-active', { preHandler: [server.authenticate, roleGuard(['ADMIN'])] }, async (request: any, reply) => {
    const { id } = request.params;
    
    const current = await server.prisma.propertyType.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!current) {
      return reply.status(404).send({ message: 'Property Type not found' });
    }

    const type = await server.prisma.propertyType.update({
      where: { id },
      data: {
        isActive: !current.isActive,
      },
    });

    return type;
  });
};

export default propertyTypeRoutes;
