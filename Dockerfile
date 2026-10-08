FROM node:22-alpine AS builder

WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:12113
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=4173

COPY package*.json ./
RUN npm pkg delete scripts.prepare \
    && npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force
COPY --from=builder /app/dist ./dist

EXPOSE 4173
CMD ["npm", "run", "preview"]
