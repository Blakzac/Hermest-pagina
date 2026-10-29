# Production Dockerfile para Dokploy (Debian GNU/Linux x64 con compatibilidad nativa para Rolldown/esbuild)
FROM node:22-slim AS builder

WORKDIR /app

# Instalar dependencias nativas del sistema si se requieren compilaciones C/C++
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY .npmrc ./

# Instalar dependencias forzando la inclusión de dependencias opcionales nativas
RUN npm install --legacy-peer-deps --include=optional

# Copiar el código fuente
COPY . .

# Compilar frontend con Vite
RUN npm run build

# Etapa de ejecución en producción
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
COPY .npmrc ./

# Instalar solo dependencias de producción
RUN npm install --omit=dev --legacy-peer-deps --include=optional && npm cache clean --force

# Copiar archivos compilados y backend
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src

# Instalar tsx para levantar server.ts
RUN npm install -g tsx

EXPOSE 3000

CMD ["tsx", "server.ts"]
