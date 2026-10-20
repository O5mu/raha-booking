# Multi-stage build: build the React app and the API in separate stages, then
# copy only the build output into a small final image.

# 1) Build the React app into static files (client/dist)
FROM node:24-alpine AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 2) Compile the TypeScript API into JavaScript (server/dist)
FROM node:24-alpine AS server
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# 3) Final image: production dependencies + compiled code only
FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=4000 \
    STATIC_DIR=/app/client/dist
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=server /app/server/dist ./dist
COPY server/db ./db
COPY --from=client /app/client/dist /app/client/dist
# Don't run as root inside the container.
USER node
EXPOSE 4000
# Hosts like Render pick their own port and pass it in $PORT, so don't hard-code 4000.
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- "http://localhost:${PORT}/api/health" || exit 1
CMD ["node", "dist/scripts/start.js"]
