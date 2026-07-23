# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies for build
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# Runtime stage
FROM node:20-slim

WORKDIR /app

# Install openssl for Prisma compatibility
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3001

ENV NODE_ENV=production

CMD ["npm", "run", "start"]
