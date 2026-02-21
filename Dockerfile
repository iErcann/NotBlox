# Build stage
FROM node:24 AS build

RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY back/package.json ./back/
COPY shared/package.json ./shared/

RUN pnpm install --frozen-lockfile

# Copy source
COPY back ./back/
COPY shared ./shared/

RUN pnpm run build:back

# Production stage
# uWebSockets.js requires glibc >= 2.38 -> Debian Trixie
FROM node:24-trixie-slim

RUN corepack enable

WORKDIR /app

# Copy workspace manifests for production install
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=build /app/back/package.json ./back/
COPY --from=build /app/shared/package.json ./shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files and scripts
COPY --from=build /app/back/dist ./back/dist

CMD ["node", "back/dist/back/src/sandbox.js"]
