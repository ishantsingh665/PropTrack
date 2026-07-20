import { FastifyPluginAsync } from 'fastify';
declare const authPlugin: FastifyPluginAsync;
export default authPlugin;
declare module 'fastify' {
    interface FastifyInstance {
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
//# sourceMappingURL=auth.d.ts.map