import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { FastifyPluginAsync } from 'fastify';

const authPlugin: FastifyPluginAsync = fp(async (server) => {
  server.register(jwt, {
    secret: process.env.JWT_SECRET || 'super-secret-default',
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  server.register(cookie);

  server.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
});

export default authPlugin;

declare module 'fastify' {
  export interface FastifyInstance {
    authenticate: any;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      email: string;
      role: string;
    };
  }
}
