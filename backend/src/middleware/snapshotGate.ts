import { FastifyReply, FastifyRequest } from 'fastify';
import { SnapshotService } from '../services/snapshotService.js';

export const snapshotGate = async (request: any, reply: FastifyReply) => {
  const prisma = (request.server as any).prisma;
  const snapshotService = new SnapshotService(prisma);
  
  const isOpen = await snapshotService.isGateOpen();
  
  if (!isOpen) {
    return reply.status(403).send({
      error: 'Snapshot Gate Locked',
      message: 'A snapshot for the current month must be taken before you can add or modify data. Please contact an administrator.',
    });
  }
};
