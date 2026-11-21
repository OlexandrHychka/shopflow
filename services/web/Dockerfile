FROM node:26.13.1-alpine3.24 AS builder

RUN npm install -g pnpm@12.21.0

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY services/web/package.json ./services/web/
COPY services/api/package.json ./services/api/
COPY tests/e2e/package.json ./tests/e2e/
COPY tsconfig.base.json ./
COPY services/web/tsconfig.json ./services/web/
COPY services/web/next.config.ts ./services/web/
COPY services/web/next-env.d.ts ./services/web/
COPY services/web/app ./services/web/app
COPY services/web/public ./services/web/public
COPY services/web/tests ./services/web/tests
COPY services/web/vitest.config.ts ./services/web/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @shopflow/web build

FROM node:26.13.1-alpine3.24

RUN npm install -g pnpm@12.21.0

WORKDIR /app

ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/services/web/.next/standalone ./
COPY --from=builder /app/services/web/.next/static ./services/web/.next/static
COPY --from=builder /app/services/web/public ./services/web/public

RUN addgroup -g 1001 -S shopflow && adduser -u 1001 -S shopflow -G shopflow
USER shopflow

CMD ["node", "services/web/server.js"]
