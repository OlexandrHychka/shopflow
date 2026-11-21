FROM node:26.13.1-alpine3.24 AS builder

RUN npm install -g pnpm@12.21.0

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY services/api/package.json ./services/api/
COPY services/web/package.json ./services/web/
COPY tests/e2e/package.json ./tests/e2e/
COPY tsconfig.base.json ./
COPY services/api/tsconfig.json services/api/tsconfig.build.json ./services/api/
COPY services/api/src ./services/api/src

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @shopflow/api build

FROM node:26.13.1-alpine3.24

RUN npm install -g pnpm@12.21.0

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY services/api/package.json ./services/api/
COPY --from=builder /app/services/api/dist ./services/api/dist
COPY --from=builder /app/services/api/node_modules ./services/api/node_modules
COPY --from=builder /app/node_modules ./node_modules

RUN addgroup -g 1001 -S shopflow && adduser -u 1001 -S shopflow -G shopflow
USER shopflow

ENV HOST=0.0.0.0
ENV PORT=3001

WORKDIR /app/services/api

CMD ["node", "dist/server.js"]
