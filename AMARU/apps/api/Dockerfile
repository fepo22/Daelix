FROM node:24-alpine

ENV COREPACK_HOME=/corepack
RUN corepack enable

WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config/package.json packages/config/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/import-engine/package.json packages/import-engine/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
RUN corepack pnpm install --frozen-lockfile

COPY . .
ARG DATABASE_URL=postgresql://amaru:amaru_local_only@localhost:5432/amaru
RUN DATABASE_URL="${DATABASE_URL}" corepack pnpm --filter @amaru/shared build \
    && DATABASE_URL="${DATABASE_URL}" corepack pnpm --filter @amaru/api build

WORKDIR /workspace/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
