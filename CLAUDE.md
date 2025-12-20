# SORI (MusicGram) Project Context

> 이 파일은 Claude가 매 세션마다 자동으로 읽어 프로젝트 컨텍스트를 유지합니다.

---

## 프로젝트 목표

### 슈퍼앱 (Super App)
- **테스트용이 아님. 실제 글로벌 서비스 런칭이 목표.**
- 200만 DAU 대응 설계
- 글로벌 시장 타겟 (한국, 일본, 미국, 유럽 등)

---

## 핵심 컨셉 (반드시 기억할 것)

**"Instagram인데, 사진/영상 대신 YouTube Music에서 검색한 음악을 플레이리스트로 만들어 공유하고 듣는 앱"**

```
┌─────────────────────────────────────────────────────────────┐
│                     Instagram vs SORI                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Instagram                        SORI (MusicGram)         │
│   ──────────                       ─────────────────        │
│                                                             │
│   📷 사진/영상 촬영·업로드    →    🔍 음악 검색              │
│   📁 갤러리에 저장           →    📁 플레이리스트에 저장     │
│   📤 피드에 공유             →    📤 피드에 공유             │
│   ❤️ 좋아요·댓글·팔로우      →    ❤️ 좋아요·댓글·팔로우      │
│   👀 보기                    →    🎧 듣기                    │
│                                                             │
│   ──────────────────────────────────────────────────────    │
│   콘텐츠 소스: 카메라롤       →    콘텐츠 소스: YouTube Music │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 핵심 원칙
1. **UI/UX는 Instagram과 100% 동일** (Pixel-perfect)
2. **콘텐츠만 다름**: 이미지/영상 → 음악 플레이리스트
3. **음악 소스**: YouTube Music (ytmusicapi 사용)
4. **사용자 플로우**: 음악 검색 → 플레이리스트 저장 → 공유 → 듣기

---

## 글로벌 앱 요구사항

### 1. 자동 언어 변경 (Instagram처럼)
- 사용자 브라우저/기기 언어 감지
- IP 기반 국가 감지
- 지원 언어: 한국어, 영어, 일본어 등
- `react-i18next` 사용 권장

### 2. 국가별 콘텐츠
- 사용자 위치에 따른 차트/신규 앨범 자동 표시
- KR → 한국 차트, US → Billboard 스타일
- Backend에서 `CF-IPCountry` 헤더로 국가 감지

---

## 컨텍스트 기반 추천 (메인 피드)

### 시간/날씨/기온 기반 플레이리스트 자동 추천

사용자 접속 시 다음 정보를 감안하여 메인 피드 상단에 맞춤형 플레이리스트 표시:

| 요소 | 감지 방법 | 예시 |
|------|----------|------|
| **시간** | 브라우저 API (`new Date()`) | 아침/오후/저녁/밤 |
| **날씨** | IP → 위치 → OpenWeatherMap API | 맑음/비/눈/흐림 |
| **기온** | OpenWeatherMap API | 덥다/춥다/쾌적 |

### 추천 로직 예시
```
아침 + 맑음 → Upbeat/Acoustic 플레이리스트
밤 + 비 → Jazz/Lo-fi/Ballad 플레이리스트
여름 + 더움 → Summer Hits 플레이리스트
```

### 표시 위치
- 메인 피드 최상단 "For You" 섹션
- 개인화된 인사말: "Good Evening! Raining in Seoul? Try this chill playlist."

---

## sample 폴더 기능 → 마이페이지 구현 필수

`sample/` 폴더의 기존 기능들을 React로 마이페이지(ProfilePage)에 완벽하게 구현해야 함:

### 필수 구현 기능

#### 1. Your Music (좋아요한 곡 관리)
- 좋아요한 곡 목록 표시 (`your-music.js`)
- YouTube 메타데이터 자동 로드 (썸네일, 제목, 아티스트)
- 곡 클릭 시 재생
- 곡 삭제 기능

#### 2. Music Player (음악 플레이어)
- YouTube IFrame Player 통합 (`player.js`)
- 재생/일시정지/다음/이전
- 셔플 모드 (랜덤 재생)
- 반복 모드 (없음/전체/한곡)
- 진행 바 (시간 표시, 시크)
- 볼륨 조절
- 미니 플레이어 (하단 고정)

#### 3. 플레이리스트 관리
- 플레이리스트 생성/수정/삭제
- 곡 추가/제거/순서 변경
- 플레이리스트 전체 재생

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 19 + Vite 7 + Tailwind CSS 4 + Zustand |
| Backend | FastAPI + Python + ytmusicapi |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Cache | Upstash Redis |
| Hosting | Cloud Run (Backend), Vercel (Frontend) |
| i18n | react-i18next (예정) |
| Weather API | OpenWeatherMap (예정) |

---

## 주요 API 엔드포인트

```
Base URL: https://musicgram-api-89748215794.us-central1.run.app

GET /api/search?q=검색어     # 음악 검색
GET /api/charts?country=KR   # 국가별 차트
GET /api/new-albums          # 신규 앨범
GET /api/artist/{id}         # 아티스트 정보
GET /api/album/{id}          # 앨범 정보
```

---

## Supabase 정보

- **Project ID**: `nrtkbulkzhhlstaomvas`
- **API URL**: `https://nrtkbulkzhhlstaomvas.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/nrtkbulkzhhlstaomvas

---

## 프로젝트 구조

```
sori/
├── backend/          # FastAPI 백엔드 (Cloud Run 배포됨)
├── frontend/         # React 프론트엔드
│   ├── src/
│   │   ├── pages/    # 페이지 컴포넌트
│   │   ├── components/
│   │   ├── stores/   # Zustand 스토어
│   │   └── lib/      # Supabase 클라이언트
├── sample/           # 기존 기능 레퍼런스 (마이페이지에 구현 필요)
│   ├── js/
│   │   ├── player.js       # 음악 플레이어 로직
│   │   ├── your-music.js   # 좋아요한 곡 관리
│   │   └── ...
│   └── pages/
├── docs/             # 프로젝트 문서
└── supabase/         # 마이그레이션 SQL
```

---

## 중요 알림

1. **이 프로젝트는 슈퍼앱을 목표로 함** - 단순 테스트/학습용이 아님
2. **글로벌 서비스** - 다국어 지원 필수
3. **sample 폴더 기능 100% 구현** - 마이페이지에 Your Music + Player 완벽 구현
4. **컨텍스트 기반 추천** - 시간/날씨/기온 기반 플레이리스트 자동 표시
