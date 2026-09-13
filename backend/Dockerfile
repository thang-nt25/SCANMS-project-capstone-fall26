# Stage 1: Build & Development
FROM node:22-alpine AS development

WORKDIR /usr/src/app

COPY package*.json ./
COPY .npmrc ./

RUN apk add --no-cache openssl && npm ci

COPY . .

# Generate Prisma Client
RUN DATABASE_URL=postgresql://postgres:build-only@localhost:5432/build npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
