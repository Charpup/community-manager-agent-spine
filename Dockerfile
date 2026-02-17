# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create data directory
RUN mkdir -p /data

# Environment
ENV NODE_ENV=production
ENV API_PORT=3001
ENV SQLITE_PATH=/data/spine.db

# Expose port
EXPOSE 3001

# Start command
CMD ["node", "dist/main.js"]
