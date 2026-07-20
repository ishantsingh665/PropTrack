"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = require("fastify");
const bcrypt_1 = __importDefault(require("bcrypt"));
const authRoutes = async (server) => {
    // Register
    server.post('/register', async (request, reply) => {
        const { email, password, name } = request.body;
        const existingUser = await server.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return reply.status(400).send({ message: 'User already exists' });
        }
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        const user = await server.prisma.user.create({
            data: {
                email,
                passwordHash,
                name,
                role: 'ADMIN', // First user is Admin for now, or use logic
            },
        });
        const token = server.jwt.sign({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    });
    // Login
    server.post('/login', async (request, reply) => {
        const { email, password } = request.body;
        const user = await server.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return reply.status(401).send({ message: 'Invalid credentials' });
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return reply.status(401).send({ message: 'Invalid credentials' });
        }
        const token = server.jwt.sign({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    });
    // Me (Verify token)
    server.get('/me', { preHandler: [server.authenticate] }, async (request) => {
        return request.user;
    });
};
exports.default = authRoutes;
//# sourceMappingURL=auth.js.map