"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("./plugins/prisma"));
const auth_1 = __importDefault(require("./plugins/auth"));
const auth_2 = __importDefault(require("./routes/auth"));
dotenv_1.default.config();
const server = (0, fastify_1.default)({
    logger: true,
});
// Plugins
server.register(cors_1.default, {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
});
server.register(multipart_1.default);
server.register(prisma_1.default);
server.register(auth_1.default);
// Routes
server.register(auth_2.default, { prefix: '/api/auth' });
server.get('/health', async () => {
    return { status: 'ok' };
});
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3000');
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening at http://localhost:${port}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map