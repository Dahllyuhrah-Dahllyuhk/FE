# ── Build stage ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 파일만 먼저 복사 (레이어 캐시 최대화)
COPY package.json package-lock.json* pnpm-lock.yaml* ./

RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# 소스 복사
COPY . .

# NEXT_PUBLIC 환경변수 (빌드 타임에 번들됨)
ARG NEXT_PUBLIC_API_BASE=https://matuabom.store
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}

# standalone 출력 모드로 빌드 (이미지 크기 ~70% 감소)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Run stage (최소 이미지) ────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=Asia/Seoul

# non-root 사용자로 실행 (보안)
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# standalone 빌드 결과물만 복사
COPY --from=builder /app/public          ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
