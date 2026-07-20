import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { roleGuard } from '../middleware/roleGuard.js';
import bcrypt from 'bcrypt';

const userRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // List Users (Admin Only)
  server.get('/', { preHandler: [server.authenticate, roleGuard(['ADMIN'])] }, async (request, reply) => {
    const users = await server.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        preferredGfaUnit: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return users;
  });

  // Create User (Admin Only)
  server.post('/', { preHandler: [server.authenticate, roleGuard(['ADMIN'])] }, async (request: any, reply) => {
    const { email, password, name, role } = request.body;

    const existingUser = await server.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return reply.status(400).send({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await server.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role || 'VIEWER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });

    return user;
  });

  // Update User Role (Admin Only)
  server.patch('/:id/role', { preHandler: [server.authenticate, roleGuard(['ADMIN'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { role } = request.body;

    if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(role)) {
      return reply.status(400).send({ message: 'Invalid role' });
    }

    const user = await server.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });

    return user;
  });

  // Delete User (Admin Only)
  server.delete('/:id', { preHandler: [server.authenticate, roleGuard(['ADMIN'])] }, async (request: any, reply) => {
    const { id } = request.params;

    // Prevent deleting self
    if (id === request.user.id) {
      return reply.status(400).send({ message: 'Cannot delete your own account' });
    }

    await server.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  });
};

export default userRoutes;
