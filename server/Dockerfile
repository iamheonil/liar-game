# syntax=docker/dockerfile:1

# ---------- 빌드 단계 ----------
# 로컬에 JDK 가 없어도, 버전이 달라도 컨테이너 안에서 동일하게 빌드됨
FROM gradle:8.14-jdk21 AS builder
WORKDIR /build

# 의존성만 먼저 받아 두면 소스만 바뀐 재빌드에서 이 레이어가 캐시됨
COPY settings.gradle.kts build.gradle.kts ./
RUN gradle --no-daemon dependencies --quiet || true

COPY src ./src
RUN gradle --no-daemon clean bootJar -x test

# ---------- 실행 단계 ----------
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# 루트로 돌리지 않기 위한 전용 계정
RUN addgroup -S liar && adduser -S liar -G liar
COPY --from=builder --chown=liar:liar /build/build/libs/*.jar app.jar
USER liar

EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"

# 컨테이너가 살아 있는지와 앱이 응답하는지는 다른 문제라 헬스체크를 붙임
HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/rooms > /dev/null || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
