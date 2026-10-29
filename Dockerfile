# Production Dockerfile for Dokploy (React + Vite + Express Backend)
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
COPY .npmrc ./

# Install dependencies including devDependencies needed for building
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Build the client bundle with Vite
RUN npm run build

# Production runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package files & install production dependencies
COPY package*.json ./
COPY .npmrc ./
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy built frontend dist and server source from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src

# Install tsx globally in runner to execute server.ts in production without full devDependencies
RUN npm install -g tsx

EXPOSE 3000

CMD ["tsx", "server.ts"]
