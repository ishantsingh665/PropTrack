"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleGuard = void 0;
const fastify_1 = require("fastify");
const roleGuard = (allowedRoles) => {
    return async (request, reply) => {
        const user = request.user;
        if (!user || !allowedRoles.includes(user.role)) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: 'You do not have permission to access this resource',
            });
        }
    };
};
exports.roleGuard = roleGuard;
//# sourceMappingURL=roleGuard.js.map