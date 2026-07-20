import { FastifyReply, FastifyRequest } from 'fastify';

export const roleGuard = (allowedRoles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user || !allowedRoles.includes(user.role)) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
    }
  };
};
