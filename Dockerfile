# Stage 1: Base with Build Tools (for native modules like better-sqlite3)
FROM node:20-bookworm AS base
WORKDIR /app
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Install Dependencies
FROM base AS dependencies
COPY package*.json ./
# 我们在这里先执行 npm install，利用 Docker 缓存
# 只有 package.json 发生变化时，这一步才会重新执行
RUN npm install

# Stage 3: Development (Hot Reloading)
FROM dependencies AS development
# 这里不需要 COPY . .，因为 docker-compose 会通过 volumes 挂载
# 但为了容器独立运行的完整性，我们还是 COPY 一份
COPY . .
CMD ["npm", "run", "dev"]

# Stage 4: Production (Build & Minimal Image)
FROM dependencies AS build
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS production
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=build /app/dist ./dist
# 注意：如果 production 需要 better-sqlite3，也需要重新安装它在 slim 镜像中
# 或者直接在 base 阶段构建。目前我们先以开发模式为主。
CMD ["npm", "start"]
