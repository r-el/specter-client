FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . ./

# Configure the API URL at build time.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build the frontend into the dist directory.
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist

# Install a lightweight static file server.
RUN npm install -g serve --no-audit --no-fund \
    && npm cache clean --force

EXPOSE 4173
CMD ["sh", "-c", "serve -s dist -l ${PORT:-4173}"]
