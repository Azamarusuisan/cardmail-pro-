# Multi-stage build for CardMail Pro

# Base stage with Node.js and pnpm
FROM node:18-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY server/package.json ./server/
COPY worker/package.json ./worker/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build all packages
RUN pnpm build

# Server stage
FROM node:18-alpine AS server
RUN corepack enable pnpm
WORKDIR /app

# Copy built server
COPY --from=base /app/server/dist ./server/dist
COPY --from=base /app/server/package.json ./server/
COPY --from=base /app/pnpm-lock.yaml ./
COPY --from=base /app/package.json ./

# Install production dependencies only
RUN cd server && pnpm install --prod --frozen-lockfile

EXPOSE 4000
CMD ["node", "server/dist/index.js"]

# Worker stage  
FROM node:18-alpine AS worker
RUN corepack enable pnpm
WORKDIR /app

# Install Tesseract dependencies
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-jpn \
    tesseract-ocr-data-eng

# Copy built worker
COPY --from=base /app/worker/dist ./worker/dist
COPY --from=base /app/worker/package.json ./worker/
COPY --from=base /app/pnpm-lock.yaml ./
COPY --from=base /app/package.json ./

# Install production dependencies only
RUN cd worker && pnpm install --prod --frozen-lockfile

CMD ["node", "worker/dist/index.js"]

# Web stage
FROM node:18-alpine AS web
RUN corepack enable pnpm
WORKDIR /app

# Copy built web app
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/public ./apps/web/public
COPY --from=base /app/apps/web/package.json ./apps/web/
COPY --from=base /app/apps/web/next.config.js ./apps/web/
COPY --from=base /app/pnpm-lock.yaml ./
COPY --from=base /app/package.json ./

# Install production dependencies only
RUN cd apps/web && pnpm install --prod --frozen-lockfile

EXPOSE 3000
CMD ["pnpm", "--filter", "@cardmail-pro/web", "start"]

# Development stage
FROM base AS development
EXPOSE 3000 4000
CMD ["pnpm", "dev"]