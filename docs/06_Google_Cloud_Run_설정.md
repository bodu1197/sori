# ☁️ Google Cloud Run 설정 가이드

> MusicGram 백엔드를 Google Cloud Run에 배포하는 단계별 가이드
>
> **실제 설정 완료:** 2024년 12월
>
> - 프로젝트 ID: `musicgram-api`
> - 리전: `us-central1`
> - 결제 계정: `019F63-7D53DA-633FDD`

---

## 📋 목차

1. [Google Cloud 계정 및 프로젝트 설정](#1-google-cloud-계정-및-프로젝트-설정)
2. [결제 계정 생성 (중요!)](#2-결제-계정-생성)
3. [Google Cloud CLI 설치](#3-google-cloud-cli-설치)
4. [프로젝트 생성 및 설정](#4-프로젝트-생성-및-설정)
5. [API 활성화](#5-api-활성화)
6. [백엔드 코드 및 Docker](#6-백엔드-코드-및-docker)
7. [Cloud Run 배포](#7-cloud-run-배포)
8. [환경변수 설정](#8-환경변수-설정)

---

## 1. Google Cloud 계정 및 프로젝트 설정

### Step 1.1: Google Cloud Console 접속

👉 https://console.cloud.google.com

### Step 1.2: Google 계정으로 로그인

- Gmail 계정 사용
- 없으면 새로 생성

---

## 2. 결제 계정 생성 (⚠️ 중요!)

### 세금 정보 문제 해결

일부 국가(인도네시아 등)는 세금 정보가 필수입니다.
**해결 방법: 미국(United States)으로 결제 프로필 생성**

### Step 2.1: 결제 계정 만들기

👉 https://console.cloud.google.com/billing

### Step 2.2: 국가 선택

```
┌─────────────────────────────────────────┐
│  결제 계정 만들기                        │
├─────────────────────────────────────────┤
│                                         │
│  국가: [United States 🇺🇸] ← 권장!       │
│                                         │
│  계정 유형: [개인]                       │
│                                         │
└─────────────────────────────────────────┘
```

### Step 2.3: 미국 주소 예시 (필요시)

```
주소: 123 Main Street
도시: Los Angeles
주: California
우편번호: 90001
```

### Step 2.4: 카드 정보 입력

- 한국/인도네시아 카드 사용 가능
- 세금 정보 없이 진행 가능!

### 무료 크레딧

- 신규 가입 시 $300 크레딧 제공
- 90일간 사용 가능
- 자동 결제 안 됨 (수동 업그레이드 전까지)

---

## 1. Google Cloud 계정 및 프로젝트 설정

### Step 1.1: Google Cloud 계정 생성

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. Google 계정으로 로그인
3. **무료 체험** 시작 (신규 가입 시 $300 크레딧 제공!)

### Step 1.2: 새 프로젝트 생성

1. 상단 프로젝트 선택 드롭다운 클릭
2. **"새 프로젝트"** 클릭
3. 프로젝트 정보 입력:
   - 프로젝트 이름: `musicgram-backend`
   - 조직: (개인은 그냥 두기)
4. **"만들기"** 클릭

```
┌─────────────────────────────────────────┐
│  새 프로젝트                            │
├─────────────────────────────────────────┤
│  프로젝트 이름: musicgram-backend       │
│  프로젝트 ID: musicgram-backend-xxxxx   │
│  위치: 조직 없음                        │
│                                         │
│              [만들기]                   │
└─────────────────────────────────────────┘
```

### Step 1.3: 결제 계정 연결

1. 좌측 메뉴 → **"결제"**
2. 결제 계정 추가 (카드 등록 필요, 무료 크레딧 사용 가능)
3. 프로젝트에 결제 계정 연결

> ⚠️ 무료 크레딧 $300으로 충분히 테스트 가능!
> Cloud Run은 월 200만 요청까지 무료!

### Step 1.4: 필요한 API 활성화

1. 좌측 메뉴 → **"API 및 서비스"** → **"라이브러리"**
2. 아래 API 검색 후 각각 **"사용"** 클릭:
   - Cloud Run Admin API
   - Container Registry API (또는 Artifact Registry API)
   - Cloud Build API

---

## 2. Google Cloud CLI 설치

### Step 2.1: gcloud CLI 설치

**Windows:**

1. [Google Cloud SDK 설치 프로그램](https://cloud.google.com/sdk/docs/install) 다운로드
2. 설치 프로그램 실행
3. 설치 완료 후 **Google Cloud SDK Shell** 실행

**설치 확인:**

```powershell
gcloud --version
```

### Step 2.2: gcloud 초기화 및 로그인

```powershell
# 로그인
gcloud auth login

# 브라우저가 열리면 Google 계정으로 로그인
# 권한 허용
```

### Step 2.3: 프로젝트 설정

```powershell
# 프로젝트 목록 확인
gcloud projects list

# 프로젝트 설정 (프로젝트 ID 사용)
gcloud config set project musicgram-backend-xxxxx

# 리전 설정 (한국 사용자 많으면 asia-northeast3)
gcloud config set run/region asia-northeast3
```

**추천 리전:**
| 리전 | 위치 | 코드 |
|------|------|------|
| 서울 | 한국 | `asia-northeast3` |
| 도쿄 | 일본 | `asia-northeast1` |
| US Central | 미국 중부 | `us-central1` |
| 프랑크푸르트 | 유럽 | `europe-west3` |

---

## 3. 백엔드 코드 준비

### Step 3.1: 프로젝트 구조 생성

```
musicgram/
└── backend/
    ├── main.py              # FastAPI 앱
    ├── requirements.txt     # Python 패키지
    ├── Dockerfile          # Docker 설정
    └── .dockerignore       # Docker 제외 파일
```

### Step 3.2: main.py 생성

```python
# backend/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from ytmusicapi import YTMusic
import os
import json
import redis

app = FastAPI(title="MusicGram API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis 연결 (선택)
redis_url = os.getenv("REDIS_URL")
cache = redis.from_url(redis_url) if redis_url else None

# YTMusic 인스턴스
ytmusic = YTMusic()

@app.get("/")
async def root():
    return {"message": "MusicGram API is running!"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/search")
async def search_music(q: str, filter: str = "songs", limit: int = 20):
    # 캐시 확인
    if cache:
        cache_key = f"search:{filter}:{q}"
        cached = cache.get(cache_key)
        if cached:
            return json.loads(cached)

    # YouTube Music 검색
    results = ytmusic.search(q, filter=filter, limit=limit)

    # 캐시 저장
    if cache:
        cache.setex(cache_key, 1800, json.dumps(results))

    return results

@app.get("/api/charts")
async def get_charts(country: str = "KR"):
    if cache:
        cache_key = f"charts:{country}"
        cached = cache.get(cache_key)
        if cached:
            return json.loads(cached)

    ytmusic_local = YTMusic(language='ko' if country == 'KR' else 'en', location=country)
    charts = ytmusic_local.get_charts(country=country)

    if cache:
        cache.setex(cache_key, 3600, json.dumps(charts))

    return charts

@app.get("/api/new-albums")
async def get_new_albums(country: str = "KR"):
    if cache:
        cache_key = f"new_albums:{country}"
        cached = cache.get(cache_key)
        if cached:
            return json.loads(cached)

    ytmusic_local = YTMusic(language='ko' if country == 'KR' else 'en', location=country)
    albums = ytmusic_local.get_new_albums()

    if cache:
        cache.setex(cache_key, 3600, json.dumps(albums))

    return albums

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

### Step 3.3: requirements.txt 생성

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
ytmusicapi==1.3.2
redis==5.0.1
python-dotenv==1.0.0
```

---

## 4. Docker 설정

### Step 4.1: Dockerfile 생성

```dockerfile
# backend/Dockerfile

# Python 3.11 슬림 이미지 사용
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# Cloud Run은 PORT 환경변수 사용
ENV PORT=8080

# 서버 실행
CMD ["python", "main.py"]
```

### Step 4.2: .dockerignore 생성

```
# backend/.dockerignore
__pycache__
*.pyc
*.pyo
.env
.env.local
.git
.gitignore
README.md
*.md
.vscode
```

### Step 4.3: 로컬 테스트 (선택)

```powershell
# Docker Desktop 설치 필요
cd backend

# 이미지 빌드
docker build -t musicgram-api .

# 로컬 실행
docker run -p 8080:8080 musicgram-api

# 테스트: http://localhost:8080
```

---

## 5. Cloud Run 배포

### 방법 A: gcloud 명령어로 직접 배포 (권장) ⭐

```powershell
cd backend

# Cloud Run에 직접 배포 (소스에서 빌드)
gcloud run deploy musicgram-api \
    --source . \
    --platform managed \
    --region asia-northeast3 \
    --allow-unauthenticated
```

**배포 과정에서 묻는 질문들:**

```
API [run.googleapis.com] not enabled on project. Enable? (Y/n): Y
Building using Dockerfile...
Deploying container to Cloud Run service [musicgram-api]...
Allow unauthenticated invocations? (y/N): y
```

**배포 완료 시 출력:**

```
Service [musicgram-api] revision [musicgram-api-00001-abc]
has been deployed and is serving 100 percent of traffic.

Service URL: https://musicgram-api-xxxxx-an.a.run.app
```

### 방법 B: Container Registry 사용

```powershell
# 1. Docker 이미지 빌드 및 푸시
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/musicgram-api

# 2. Cloud Run에 배포
gcloud run deploy musicgram-api \
    --image gcr.io/YOUR_PROJECT_ID/musicgram-api \
    --platform managed \
    --region asia-northeast3 \
    --allow-unauthenticated
```

---

## 6. 환경변수 설정

### Step 6.1: Cloud Console에서 설정

1. [Cloud Run Console](https://console.cloud.google.com/run) 접속
2. 배포된 서비스 클릭 (`musicgram-api`)
3. **"새 버전 수정 및 배포"** 클릭
4. **"변수 및 보안 비밀"** 탭 클릭
5. **"변수 추가"**:

```
FRONTEND_URL = https://musicgram.vercel.app
REDIS_URL = redis://default:xxx@xxx.upstash.io:6379
```

6. **"배포"** 클릭

### Step 6.2: 명령어로 설정

```powershell
gcloud run services update musicgram-api \
    --update-env-vars FRONTEND_URL=https://musicgram.vercel.app \
    --update-env-vars REDIS_URL=redis://xxx@xxx.upstash.io:6379 \
    --region asia-northeast3
```

---

## 7. 커스텀 도메인 연결 (선택)

### Step 7.1: 도메인 매핑

1. Cloud Run Console → 서비스 선택
2. 상단 **"도메인 매핑 관리"** 클릭
3. **"매핑 추가"** 클릭
4. 도메인 입력: `api.musicgram.com`
5. DNS 설정 안내에 따라 설정

### Step 7.2: DNS 설정

도메인 등록 업체에서 CNAME 레코드 추가:

```
Type: CNAME
Name: api
Value: ghs.googlehosted.com
```

---

## 📊 배포 후 확인

### API 테스트

```powershell
# 기본 확인
curl https://musicgram-api-xxxxx-an.a.run.app/

# 헬스 체크
curl https://musicgram-api-xxxxx-an.a.run.app/health

# 음악 검색 테스트
curl "https://musicgram-api-xxxxx-an.a.run.app/api/search?q=아이유"

# 차트 테스트
curl "https://musicgram-api-xxxxx-an.a.run.app/api/charts?country=KR"
```

### 로그 확인

```powershell
# 실시간 로그 보기
gcloud run services logs read musicgram-api --region asia-northeast3
```

---

## 💰 비용 안내

### Cloud Run 무료 할당량 (월간)

| 항목            | 무료 한도       |
| --------------- | --------------- |
| 요청 수         | 200만 건        |
| CPU 시간        | 180,000 vCPU-초 |
| 메모리 시간     | 360,000 GiB-초  |
| 네트워크 (북미) | 1GB             |

> ⚠️ 대부분의 소규모~중규모 앱은 무료 한도 내에서 운영 가능!

---

## 🔄 업데이트 배포

코드 수정 후 재배포:

```powershell
cd backend

# 다시 배포 (같은 명령어)
gcloud run deploy musicgram-api \
    --source . \
    --platform managed \
    --region asia-northeast3 \
    --allow-unauthenticated
```

---

## ✅ 체크리스트

```
[ ] Google Cloud 계정 생성
[ ] 프로젝트 생성 (musicgram-backend)
[ ] 결제 계정 연결
[ ] 필요 API 활성화
[ ] gcloud CLI 설치
[ ] gcloud 로그인 및 프로젝트 설정
[ ] 백엔드 코드 준비 (main.py, requirements.txt)
[ ] Dockerfile 생성
[ ] Cloud Run 배포
[ ] 환경변수 설정
[ ] API 테스트 확인
```

---

## 🆘 자주 발생하는 문제

### 문제 1: 권한 오류

```
ERROR: (gcloud.run.deploy) PERMISSION_DENIED
```

**해결:** 결제 계정 연결 확인, API 활성화 확인

### 문제 2: 빌드 실패

```
ERROR: build failed
```

**해결:** Dockerfile 문법 확인, requirements.txt 패키지 버전 확인

### 문제 3: 서비스 시작 실패

```
Container failed to start
```

**해결:** PORT 환경변수 사용 (Cloud Run은 8080 권장)

---

## 📚 참고 링크

- [Cloud Run 공식 문서](https://cloud.google.com/run/docs)
- [Cloud Run 가격](https://cloud.google.com/run/pricing)
- [FastAPI 배포 가이드](https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-python-service)
