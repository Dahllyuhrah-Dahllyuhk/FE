# ---- Build stage ----
FROM node:20 AS builder

WORKDIR /app

# 패키지 정보만 먼저 복사 (캐시 극대화)
COPY package*.json pnpm-lock.yaml* yarn.lock* ./

# 의존성 설치 (하나만 실행되도록 분기)
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    elif [ -f yarn.lock ]; then \
      yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then \
      corepack enable && pnpm install --frozen-lockfile; \
    else \
      npm install; \
    fi

# 나머지 소스 복사
COPY . .

# 환경 변수
ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}

# Next.js 빌드
RUN npm run build

# ---- Run stage ----
FROM node:20

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=Asia/Seoul

# 빌드 산출물만 복사
COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "run", "start"]
