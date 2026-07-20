"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const fastify_1 = require("fastify");
const authPlugin = (0, fastify_plugin_1.default)(async (server) => {
    server.register(jwt_1.default, {
        secret: process.env.JWT_SECRET || 'super-secret-default',
        cookie: {
            cookieName: 'token',
            signed: false,
        },
    });
    server.register(cookie_1.default);
    server.decorate('authenticate', async (request, reply) => {
        try {
            await request.jwtVerify();
        }
        catch (err) {
            reply.send(err);
        }
    });
});
exports.default = authPlugin;
//# sourceMappingURL=auth.js.map