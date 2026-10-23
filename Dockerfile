FROM node:22.23.4-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY server/package.json ./server/
COPY worker/package.json ./worker/
RUN npm ci
COPY . .
RUN npm run build:all

FROM base AS production-deps
RUN npm prune --omit=dev

FROM node:22.23.4-alpine AS server
WORKDIR /app
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=base /app/server/package.json ./server/
COPY --from=base /app/server/dist ./server/dist
EXPOSE 4000
CMD ["node", "server/dist/index.js"]

FROM node:22.23.4-alpine AS worker
WORKDIR /app
RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-jpn tesseract-ocr-data-eng
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=base /app/worker/package.json ./worker/
COPY --from=base /app/worker/dist ./worker/dist
CMD ["node", "worker/dist/index.js"]

FROM nginx:stable-alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=base /app/apps/web/dist /usr/share/nginx/html
EXPOSE 3000

FROM base AS development
EXPOSE 5173 4000
CMD ["npm", "run", "dev"]
