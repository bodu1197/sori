# Python 3.11 슬림 이미지 사용 (빠른 시작)
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치 + 비루트 사용자 생성 (단일 RUN으로 합침)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1000 appuser

# Python 패키지 설치 (캐시 활용) - root로 설치 후 사용자 전환
COPY --chmod=644 requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 비루트 사용자로 전환
USER appuser

# 애플리케이션 코드 복사 (읽기 전용 권한)
COPY --chown=appuser:appuser --chmod=555 *.py ./
COPY --chown=appuser:appuser --chmod=444 requirements.txt ./

# Cloud Run은 PORT 환경변수 사용
ENV PORT=8080

# 헬스체크 URL
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# Uvicorn으로 실행 (워커 수는 Cloud Run이 자동 조정)
CMD ["python", "main.py"]
