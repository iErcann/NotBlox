# Build stage: only the shared package needs compilation
FROM node:24 AS build

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY back/package.json ./back/
COPY shared/package.json ./shared/

RUN pnpm install --frozen-lockfile

COPY shared ./shared/
RUN pnpm run build:shared

# Production stage
# uWebSockets.js requires glibc >= 2.38 -> Debian Trixie
FROM node:24-trixie-slim

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY back/package.json ./back/
COPY shared/package.json ./shared/

# Install production dependencies (includes tsx for runtime TypeScript loading)
RUN pnpm install --frozen-lockfile --prod

# Copy shared source + compiled dist:
#   dist/ is needed for @notblox/shared package resolution
#   source is needed for relative imports inside scripts (e.g. ../../../shared/system/...)
COPY --from=build /app/shared ./shared/

# Copy back source + tsconfig so tsx can resolve @shared/* path aliases at runtime.
# To swap a script without rebuilding the image, volume-mount the scripts directory:
#   docker run -v ./my-scripts:/app/back/src/scripts -e GAME_SCRIPT=myGame.ts ...
COPY back/tsconfig.json ./back/
COPY back/src ./back/src

# Run from back/ so Node resolves tsx from back/node_modules
WORKDIR /app/back

# Probe TCP port 8001 – container is healthy once the WS server is accepting connections
HEALTHCHECK --interval=5s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "const n=require('net').createConnection(8001,'localhost'); n.on('connect',()=>{n.destroy();process.exit(0);}); n.on('error',()=>process.exit(1));"

CMD ["node", "--import", "tsx/esm", "src/sandbox.ts"]
