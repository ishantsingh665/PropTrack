import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';
import { snapshotGate } from '../middleware/snapshotGate.js';

const companyRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // List Companies (Keyset Pagination)
  server.get('/', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { after, limit = 50, search } = request.query;
    
    const take = parseInt(limit.toString());
    const cursor = after ? { id: after } : undefined;
    const skip = after ? 1 : 0;

    const companies = await server.prisma.company.findMany({
      take,
      skip,
      cursor,
      where: {
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { id: 'asc' },
    });

    const lastId = companies.length > 0 ? companies[companies.length - 1].id : null;

    return {
      data: companies,
      pagination: {
        after: lastId,
        limit: take,
      },
    };
  });

  // Get Single Company
  server.get('/:id', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { id } = request.params;
    const company = await server.prisma.company.findUnique({
      where: { id },
    });

    if (!company || company.deletedAt) {
      return reply.status(404).send({ message: 'Company not found' });
    }

    return company;
  });

  // Create Company
  server.post('/', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR']), snapshotGate] }, async (request: any, reply) => {
    const { 
      name, 
      registrationNumber, 
      countryCode,
      isin,
      status,
      snapshotsEnabled,
      indexListed,
      reportPropertyCount
    } = request.body;

    if (!name || !countryCode) {
      return reply.status(400).send({ message: 'Name and Country Code are required' });
    }

    const company = await server.prisma.company.create({
      data: {
        name,
        registrationNumber,
        countryCode,
        isin,
        status: status || 'active',
        snapshotsEnabled: snapshotsEnabled ?? true,
        indexListed: indexListed ?? false,
        reportPropertyCount: reportPropertyCount ? parseInt(reportPropertyCount) : null
      },
    });

    return company;
  });

  // Update Company
  server.put('/:id', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { 
      name, 
      registrationNumber, 
      countryCode,
      isin,
      status,
      snapshotsEnabled,
      indexListed,
      reportPropertyCount
    } = request.body;

    const company = await server.prisma.company.update({
      where: { id },
      data: {
        name,
        registrationNumber,
        countryCode,
        isin,
        status,
        snapshotsEnabled,
        indexListed,
        reportPropertyCount: reportPropertyCount !== undefined ? (reportPropertyCount ? parseInt(reportPropertyCount) : null) : undefined
      },
    });

    return company;
  });

  // Delete Company (Soft Delete)
  server.delete('/:id', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id } = request.params;

    await server.prisma.company.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Company soft-deleted successfully' };
  });
};

export default companyRoutes;
