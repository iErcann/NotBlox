# Build stage
FROM node:22 AS build

WORKDIR /app

# Copy only necessary files for build
COPY back/package*.json ./back/
COPY shared ./shared/

WORKDIR /app/back

RUN npm ci

COPY back ./

RUN npm run build

# Production stage
FROM node:22-slim

WORKDIR /app/back

# Copy package files
COPY --from=build /app/back/package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files and scripts
COPY --from=build /app/back/dist ./dist
COPY --from=build /app/back/src/scripts ./src/scripts

CMD ["node", "dist/back/src/sandbox.js"]
