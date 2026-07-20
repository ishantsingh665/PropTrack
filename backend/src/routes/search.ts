import { FastifyInstance, FastifyPluginAsync } from 'fastify';

const searchRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get('/', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { query } = request.query;

    if (!query || query.length < 2) {
      return { properties: [], companies: [] };
    }

    const [properties, companies] = await Promise.all([
      server.prisma.property.findMany({
        take: 5,
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { addressLine1: { contains: query, mode: 'insensitive' } },
            { city: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          addressLine1: true,
          city: true,
          countryCode: true,
          propertyLevel: true,
        },
      }),
      server.prisma.company.findMany({
        take: 5,
        where: {
          deletedAt: null,
          name: { contains: query, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          countryCode: true,
        },
      }),
    ]);

    return { properties, companies };
  });
};

export default searchRoutes;
