import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { auditContext, calculateDiff } from '../services/auditService.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (server) => {
  const basePrisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  const prisma = basePrisma.$extends({
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const result: any = await query(args);
          const ctx = auditContext.getStore();

          if (model !== 'AuditLog' && model !== 'MergeLog') {
            // Remove sensitive fields from log
            const logData = { ...result };
            delete logData.passwordHash;

            await (basePrisma as any).auditLog.create({
              data: {
                tableName: model,
                recordId: result.id,
                userId: ctx?.userId,
                action: 'INSERT',
                diff: logData, // Store initial state in diff field
                changedAt: new Date(),
              }
            });
          }
          return result;
        },

        async update({ model, args, query }) {
          const ctx = auditContext.getStore();
          const modelName = model.charAt(0).toLowerCase() + model.slice(1);
          
          // To calculate diff, we need the old data
          const oldData = await (basePrisma as any)[modelName].findUnique({
            where: args.where
          });

          const result: any = await query(args);

          if (model !== 'AuditLog' && oldData) {
            const diff = calculateDiff(oldData, args.data);
            if (diff) {
              await (basePrisma as any).auditLog.create({
                data: {
                  tableName: model,
                  recordId: result.id,
                  userId: ctx?.userId,
                  action: 'UPDATE',
                  diff,
                  changedAt: new Date(),
                }
              });
            }
          }
          return result;
        },
        async delete({ model, args, query }) {
          const ctx = auditContext.getStore();
          const result: any = await query(args);

          if (model !== 'AuditLog') {
            await (basePrisma as any).auditLog.create({
              data: {
                tableName: model,
                recordId: result.id,
                userId: ctx?.userId,
                action: 'DELETE',
                changedAt: new Date(),
              }
            });
          }
          return result;
        }
      }
    }
  });

  await basePrisma.$connect();

  server.decorate('prisma', prisma as any);

  server.addHook('onClose', async (server) => {
    await basePrisma.$disconnect();
  });
});

export default prismaPlugin;
