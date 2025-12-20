# 🎵 MusicGram API 배포 정보

> 배포 완료: 2024년 12월 20일

---

## 🌐 API 엔드포인트

### 프로덕션 URL

```
https://musicgram-api-89748215794.us-central1.run.app
```

### API 문서 (자동 생성)

```
https://musicgram-api-89748215794.us-central1.run.app/docs
```

---

## 📋 사용 가능한 API

### 1. 헬스 체크

```
GET /health
응답: {"status": "healthy", "redis": "not configured"}
```

### 2. 음악 검색

```
GET /api/search?q=아이유&filter=songs&limit=20&country=KR
```

### 3. 국가별 차트

```
GET /api/charts?country=KR
GET /api/charts?country=JP
GET /api/charts?country=US
```

### 4. 신규 앨범

```
GET /api/new-albums?country=KR
```

### 5. 아티스트 정보

```
GET /api/artist/{artist_id}
```

### 6. 앨범 정보

```
GET /api/album/{album_id}
```

---

## ☁️ 인프라 정보

| 항목            | 값                                        |
| --------------- | ----------------------------------------- |
| **플랫폼**      | Google Cloud Run                          |
| **프로젝트 ID** | musicgram-api                             |
| **리전**        | us-central1 (미국 중부)                   |
| **이미지**      | gcr.io/musicgram-api/musicgram-api:latest |
| **결제 계정**   | 019F63-7D53DA-633FDD                      |

---

## 🔧 관리 명령어

### 서비스 상태 확인

```bash
gcloud run services describe musicgram-api --project=musicgram-api --region=us-central1
```

### 로그 확인

```bash
gcloud run services logs read musicgram-api --project=musicgram-api --region=us-central1
```

### 새 버전 배포

```bash
# Docker 이미지 빌드
docker build -t musicgram-api ./backend

# 태그
docker tag musicgram-api gcr.io/musicgram-api/musicgram-api:latest

# 푸시
docker push gcr.io/musicgram-api/musicgram-api:latest

# 배포
gcloud run deploy musicgram-api \
  --image gcr.io/musicgram-api/musicgram-api:latest \
  --platform managed \
  --region us-central1 \
  --project musicgram-api
```

---

## 🔗 관련 콘솔 링크

- **Cloud Run 콘솔:** https://console.cloud.google.com/run?project=musicgram-api
- **Container Registry:** https://console.cloud.google.com/gcr/images/musicgram-api
- **결제 대시보드:** https://console.cloud.google.com/billing?project=musicgram-api

---

## 📝 다음 단계

1. [ ] Cloudflare CDN 연결 (글로벌 속도 향상)
2. [ ] Upstash Redis 연결 (캐싱)
3. [ ] 커스텀 도메인 연결
4. [ ] 프론트엔드 개발 (React + Vite)
5. [ ] Supabase 데이터베이스 연결
