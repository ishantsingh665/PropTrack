import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';
import { snapshotGate } from '../middleware/snapshotGate.js';

const companyRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // List Companies (Keyset Pagination with Search)
  server.get('/', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { after, limit = 50, search, name, id, isin } = request.query;
    
    const take = Math.min(parseInt(limit.toString()), 100);
    const cursor = after ? { id: after } : undefined;
    const skip = after ? 1 : 0;

    const where: any = {
      deletedAt: null,
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { id: { contains: search, mode: 'insensitive' } },
            { isin: { contains: search, mode: 'insensitive' } },
          ]
        } : {},
        name ? { name: { contains: name, mode: 'insensitive' } } : {},
        id ? { id: { contains: id, mode: 'insensitive' } } : {},
        isin ? { isin: { contains: isin, mode: 'insensitive' } } : {},
      ]
    };

    const companies = await server.prisma.company.findMany({
      take: take + 1, // Fetch one extra to check for next page
      skip,
      cursor,
      where,
      orderBy: { id: 'asc' },
    });

    const hasNextPage = companies.length > take;
    const data = hasNextPage ? companies.slice(0, take) : companies;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data,
      pagination: {
        nextCursor,
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
