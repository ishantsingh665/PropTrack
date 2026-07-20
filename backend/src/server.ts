import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import companyRoutes from './routes/companies.js';
import propertyTypeRoutes from './routes/propertyTypes.js';
import propertyRoutes from './routes/properties.js';
import ownershipRoutes from './routes/ownership.js';
import transferRoutes from './routes/transfers.js';
import duplicateRoutes from './routes/duplicates.js';
import auditRoutes from './routes/audit.js';
import importRoutes from './routes/import.js';
import noteRoutes from './routes/notes.js';
import snapshotRoutes from './routes/snapshots.js';
import userRoutes from './routes/users.js';
import searchRoutes from './routes/search.js';
import geocodeRoutes from './routes/geocoding.js';
import { auditContext } from './services/auditService.js';
import { GeocodeService } from './services/geocodeService.js';

dotenv.config();

const server = Fastify({
  logger: true,
});

// Plugins
server.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
});
server.register(multipart);
server.register(prismaPlugin);
server.register(authPlugin);

// Geocode Service Decorator
server.decorate('geocodeService', null);

// Audit Context Hook
server.addHook('preHandler', async (request: any) => {
  if (request.user) {
    return new Promise((resolve) => {
      auditContext.run({ userId: request.user.id }, () => {
        resolve(undefined);
      });
    });
  }
});

// Routes
server.register(authRoutes, { prefix: '/api/auth' });
server.register(companyRoutes, { prefix: '/api/companies' });
server.register(propertyTypeRoutes, { prefix: '/api/property-types' });
server.register(propertyRoutes, { prefix: '/api/properties' });
server.register(ownershipRoutes, { prefix: '/api/properties' });
server.register(transferRoutes, { prefix: '/api/transfers' });
server.register(duplicateRoutes, { prefix: '/api/duplicates' });
server.register(auditRoutes, { prefix: '/api/audit' });
server.register(importRoutes, { prefix: '/api/import' });
server.register(noteRoutes, { prefix: '/api' });
server.register(snapshotRoutes, { prefix: '/api' });
server.register(userRoutes, { prefix: '/api/users' });
server.register(searchRoutes, { prefix: '/api/search' });
server.register(geocodeRoutes, { prefix: '/api/geocoding' });

server.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
    
    // Initialize Geocode Service after server starts and prisma is ready
    const geocodeService = new GeocodeService(server.prisma);
    (server as any).geocodeService = geocodeService;

    // Start background worker for geocoding
    setInterval(() => {
      geocodeService.processQueue().catch(err => {
        server.log.error('Geocoding worker error:', err);
      });
    }, 30000); // Every 30 seconds

    console.log(`Server listening at http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
