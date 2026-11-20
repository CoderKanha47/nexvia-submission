# ---- deps ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/sync/package.json apps/sync/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY tests/package.json tests/package.json
RUN npm ci --no-audit --no-fund

# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w packages/shared \
  && npm run build -w packages/db \
  && npm run build -w apps/sync \
  && npx prisma generate --schema packages/db/prisma/schema.prisma

# ---- runtime ----
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/sync ./apps/sync
COPY --from=build /app/packages/db ./packages/db
COPY --from=build /app/packages/shared ./packages/shared
WORKDIR /app/apps/sync
EXPOSE 4001
CMD ["sh", "-c", "node ../../node_modules/prisma/build/index.js migrate deploy --schema ../../packages/db/prisma/schema.prisma && node dist/index.js"]
