# syntax=docker/dockerfile:1

# ---------- 빌드 단계 ----------
FROM node:22-alpine AS builder
WORKDIR /build

# 잠금 파일만 먼저 복사하면 소스 변경 시 의존성 설치 레이어가 재사용됨
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- 실행 단계 ----------
FROM nginx:1.27-alpine AS runtime
COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
