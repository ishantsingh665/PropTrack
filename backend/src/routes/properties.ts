import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';
import { snapshotGate } from '../middleware/snapshotGate.js';
import { normalizeAddress, convertToSqft } from '../services/propertyService.js';

const propertyRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // List Properties (Keyset Pagination + Filters)
  server.get('/', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { after, limit = 50, companyId, status, countryCode, typeId, search } = request.query;

    const take = parseInt(limit.toString());
    const cursor = after ? { id: after } : undefined;
    const skip = after ? 1 : 0;

    const properties = await server.prisma.property.findMany({
      take,
      skip,
      cursor,
      where: {
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
        ...(countryCode ? { countryCode } : {}),
        ...(typeId ? { propertyTypeId: typeId } : {}),
        ...(status || companyId ? {
          companies: {
            some: {
              ...(status ? { status } : {}),
              ...(companyId ? { companyId } : {}),
            }
          }
        } : {}),
      },
      include: {
        type: true,
        companies: {
          where: { validTo: null },
          include: { company: true }
        }
      },
      orderBy: { id: 'asc' },
    });

    const lastId = properties.length > 0 ? properties[properties.length - 1].id : null;

    return {
      data: properties,
      pagination: {
        after: lastId,
        limit: take,
      },
    };
  });

  // Get Single Property
  server.get('/:id', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { id } = request.params;
    const property = await server.prisma.property.findUnique({
      where: { id },
      include: {
        type: true,
        companies: {
          include: { company: true }
        },
        units: true,
        parent: true,
      },
    });

    if (!property || property.deletedAt) {
      return reply.status(404).send({ message: 'Property not found' });
    }

    return property;
  });

  // Create Property
  server.post('/', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const {
      parentId,
      propertyLevel,
      propertyTypeId,
      name,
      addressLine1,
      addressLatin,
      city,
      postalCode,
      countryCode,
      gfaInputValue,
      gfaInputUnit,
    } = request.body;

    // Validation
    if (propertyLevel === 'unit' && !parentId) {
      return reply.status(400).send({ message: 'Parent building is required for units' });
    }

    const gfaSqftRaw = gfaInputValue && gfaInputUnit ? convertToSqft(gfaInputValue, gfaInputUnit) : null;
    const gfaSqft = gfaSqftRaw !== null ? parseFloat(gfaSqftRaw) : null;
    const addressNormalized = normalizeAddress(addressLatin || addressLine1);

    const { latitude, longitude } = request.body;
    const { initialCompanyId, initialOwnershipPct } = request.body;
    const isManual = latitude !== undefined && longitude !== undefined;

    const property = await server.prisma.$transaction(async (tx) => {
      const p = await tx.property.create({
        data: {
          parentId,
          propertyLevel,
          propertyTypeId,
          name,
          addressLine1,
          addressLatin,
          addressNormalized,
          city,
          postalCode,
          countryCode,
          gfaSqft,
          gfaInputValue,
          gfaInputUnit,
          latitude: isManual ? parseFloat(latitude) : null,
          longitude: isManual ? parseFloat(longitude) : null,
          geocodeStatus: isManual ? 'manual_override' : 'pending',
        },
      });

      if (initialCompanyId) {
        await tx.propertyCompany.create({
          data: {
            propertyId: p.id,
            companyId: initialCompanyId,
            ownershipPct: initialOwnershipPct ? parseFloat(initialOwnershipPct) : 100,
            status: 'active',
            validFrom: new Date(),
          }
        });
      }

      return p;
    });

    if (!isManual) {
      await (server as any).geocodeService.queueGeocoding(property.id);
    }

    return property;
  });

  // Update Property
  server.put('/:id', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const {
      parentId,
      propertyTypeId,
      name,
      addressLine1,
      addressLatin,
      city,
      postalCode,
      countryCode,
      gfaInputValue,
      gfaInputUnit,
      logEntry // Human readable entry for the building log
    } = request.body;

    const gfaSqftRaw = gfaInputValue && gfaInputUnit ? convertToSqft(gfaInputValue, gfaInputUnit) : null;
    const gfaSqft = gfaSqftRaw !== null ? parseFloat(gfaSqftRaw) : null;
    const addressNormalized = normalizeAddress(addressLatin || addressLine1);

    const { latitude, longitude } = request.body;
    const isManual = latitude !== undefined && longitude !== undefined;

    const oldProperty = await server.prisma.property.findUnique({
      where: { id }
    });

    if (!oldProperty) {
      return reply.status(404).send({ message: 'Property not found' });
    }

    const addressChanged = 
      oldProperty.addressLine1 !== addressLine1 ||
      oldProperty.city !== city ||
      oldProperty.countryCode !== countryCode;

    const property = await server.prisma.$transaction(async (tx) => {
      const updated = await tx.property.update({
        where: { id },
        data: {
          parentId,
          propertyTypeId,
          name,
          addressLine1,
          addressLatin,
          addressNormalized,
          city,
          postalCode,
          countryCode,
          gfaSqft,
          gfaInputValue,
          gfaInputUnit,
          ...(isManual ? {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            geocodeStatus: 'manual_override'
          } : (addressChanged ? {
            geocodeStatus: 'pending',
            geocodeAttempts: 0
          } : {}))
        },
      });

      if (logEntry) {
        await tx.propertyChangeLog.create({
          data: {
            propertyId: id,
            userId: request.user.id,
            entry: logEntry,
          }
        });
      }

      return updated;
    });

    if (addressChanged && !isManual) {
      // Remove any existing queue entries for this property
      await server.prisma.geocodeQueue.deleteMany({
        where: { propertyId: id }
      });
      await (server as any).geocodeService.queueGeocoding(id);
    }

    return property;
  });

  // Update Property Status
  server.patch('/:id/status', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { status, companyId, reason } = request.body;

    if (!status || !companyId) {
      return reply.status(400).send({ message: 'Status and Company ID are required' });
    }

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

    const updatedStake = await server.prisma.$transaction(async (tx) => {
      // Log the change
      await tx.propertyStatusLog.create({
        data: {
          propertyCompanyId: stake.id,
          oldStatus: stake.status,
          newStatus: status,
          reason,
        },
      });

      // Update the status
      return await tx.propertyCompany.update({
        where: { id: stake.id },
        data: { status },
      });
    });

    return updatedStake;
  });

  // Delete Property (Soft Delete)
  server.delete('/:id', { preHandler: [server.authenticate, roleGuard(['ADMIN', 'EDITOR'])] }, async (request: any, reply) => {
    const { id } = request.params;

    await server.prisma.property.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Property soft-deleted successfully' };
  });

  // Get Property Ownership History (Timeline)
  server.get('/:id/ownership', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { id } = request.params;

    const history = await server.prisma.propertyCompany.findMany({
      where: { propertyId: id },
      include: {
        company: true,
        transferLegs: {
          include: {
            transfer: true,
          }
        }
      },
      orderBy: { validFrom: 'asc' },
    });

    return history;
  });

  // Get Property Change Log (Building Log)
  server.get('/:id/history', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    const { id } = request.params;

    const logs = await server.prisma.propertyChangeLog.findMany({
      where: { 
        propertyId: id,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  });

  // Delete Change Log Entry (Admin Only)
  server.delete('/:id/history/:logId', { preHandler: [server.authenticate, roleGuard(['ADMIN'])] }, async (request: any, reply) => {
    const { logId } = request.params;
    const { reason } = request.body;

    if (!reason) {
      return reply.status(400).send({ message: 'Delete reason is required' });
    }

    await server.prisma.propertyChangeLog.update({
      where: { id: logId },
      data: {
        deletedAt: new Date(),
        deleteReason: reason,
      },
    });

    return { message: 'Change log entry deleted successfully' };
  });
};

export default propertyRoutes;
