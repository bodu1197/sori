# MusicGram Deployment Guide

## 🚀 Quick Deploy

### Backend (Google Cloud Run)

백엔드 코드를 수정했다면 아래 명령어를 터미널에 입력하세요. (Docker 불필요)

```powershell
gcloud run deploy musicgram-api --source backend --region us-central1 --quiet
```

### Frontend (Vercel)

프론트엔드 코드를 수정했다면 아래 명령어를 입력하세요.

```powershell
vercel --prod --yes
```

---

## 🔧 Configuration

### Update Environment Variables (Backend)

백엔드 환경 변수(API Key 등)를 수정하려면:

```powershell
gcloud run services update musicgram-api --update-env-vars KEY=VALUE --region us-central1 --quiet
```

예시: `GOOGLE_API_KEY` 업데이트

```powershell
gcloud run services update musicgram-api --update-env-vars GOOGLE_API_KEY=your_key_here --region us-central1 --quiet
```

### Check Backend Status

배포된 백엔드 서비스 상태 확인:

```powershell
gcloud run services list
```

### View Logs

에러 로그 확인:

```powershell
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=musicgram-api" --limit 20
```
