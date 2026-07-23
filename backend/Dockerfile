FROM node:20-slim

# Install openssl for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install -g nodemon ts-node

COPY . .
RUN npx prisma generate

EXPOSE 3001

CMD ["nodemon", "--watch", "src", "--ext", "ts", "--exec", "npx ts-node src/server.ts"]
