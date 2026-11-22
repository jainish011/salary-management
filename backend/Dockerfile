# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy source code and build config
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Start production server
CMD ["node", "dist/main.js"]
