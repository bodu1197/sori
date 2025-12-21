# SORI (MusicGram) Project Context

> 이 파일은 Claude가 매 세션마다 자동으로 읽어 프로젝트 컨텍스트를 유지합니다.

---

## ⚠️ 세션 시작 시 필수 실행 사항 (MANDATORY)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🧠 깊은 생각 MCP (Sequential Thinking) 반드시 실행!                │
│                                                                     │
│  모든 작업 시작 전에 mcp__sequential-thinking__sequentialthinking   │
│  도구를 사용하여 문제를 단계별로 분석하고 계획을 수립할 것.          │
│                                                                     │
│  특히 다음 상황에서 필수:                                           │
│  - 새로운 기능 구현 전                                              │
│  - 버그 수정 전                                                     │
│  - 복잡한 로직 변경 전                                              │
│  - 사용자 요청 분석 시                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 세션 시작 체크리스트:
1. ☐ **깊은 생각 MCP 실행** - 작업 전 문제 분석 및 계획 수립
2. ☐ **작업 일지 확인** - 이전 세션 작업 내용 파악
3. ☐ **git status 확인** - 현재 코드 상태 파악

### ⚠️ 작업 완료 시 필수 (MANDATORY)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🚨 작업이 끝나면 반드시 git push 해야 함!                          │
│                                                                     │
│  모든 기능 구현, 버그 수정, 코드 변경 완료 후:                       │
│  1. git add .                                                       │
│  2. git commit -m "커밋 메시지"                                     │
│  3. git push origin main                                            │
│                                                                     │
│  ❌ push 없이 작업 종료 절대 금지                                   │
│  ✅ 사용자가 요청하지 않아도 작업 완료 시 자동으로 push             │
└─────────────────────────────────────────────────────────────────────┘
```

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
| Frontend | React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + Zustand |
| Backend | FastAPI + Python + ytmusicapi |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Cache | Upstash Redis |
| Hosting | Cloud Run (Backend), Vercel (Frontend) |
| i18n | react-i18next |
| Weather API | OpenWeatherMap (예정) |

---

## 주요 API 엔드포인트

```
Base URL: https://musicgram-api-89748215794.us-central1.run.app

GET /api/search?q=검색어     # 음악 검색
GET /api/charts?country=KR   # 국가별 차트
GET /api/new-albums          # 신규 앨범
GET /api/home                # 홈 피드 추천 (ytmusic.get_home())
GET /api/artist/{id}         # 아티스트 정보
GET /api/album/{id}          # 앨범 정보
GET /api/playlist/{id}       # 플레이리스트 트랙 목록
```

---

## Supabase 정보

- **Project ID**: `nrtkbulkzhhlstaomvas`
- **API URL**: `https://nrtkbulkzhhlstaomvas.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/nrtkbulkzhhlstaomvas
- **Access Token (PAT)**: `sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296`

### Supabase Management API 사용법

DB 스키마 변경, 정책 추가 등 관리 작업 시:

```bash
# SQL 실행 예시
curl -X POST "https://api.supabase.com/v1/projects/nrtkbulkzhhlstaomvas/database/query" \
  -H "Authorization: Bearer sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR_SQL_HERE"}'
```

---

## Cloud Run 환경변수 설정

### 필수 환경변수

```bash
# Google Cloud Console > Cloud Run > musicgram-api > Edit & Deploy New Revision > Variables

SUPABASE_URL=https://nrtkbulkzhhlstaomvas.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
REDIS_URL=rediss://default:<password>@<region>.upstash.io:6379
ALLOWED_ORIGINS=https://sori-frontend.vercel.app,http://localhost:5173
```

### Upstash Redis 설정 방법

1. https://console.upstash.com/ 접속
2. Create Database > Name: sori-cache, Region: Iowa (us-central1)
3. Details 탭에서 Redis URL 복사 (rediss://... 형식)
4. Cloud Run 환경변수에 REDIS_URL 추가

### 검색 캐시 순서

```
1. Supabase (영구 저장) - 모든 인스턴스 공유, 24시간 TTL
2. Redis (임시 캐시) - 빠른 조회, 30분 TTL
3. ytmusicapi (API 호출) - 캐시 미스 시 사용
```

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
5. **하드코딩된 가짜 데이터 절대 금지** - 모든 데이터는 실제 API에서 가져올 것

---

## 작업 일지 (Work Log)

> **세션 시작 시 반드시 이 섹션을 먼저 읽을 것!**

### 2025-12-20 세션 작업 내용

#### 완료된 기능 (Completed Features)

| 기능 | 파일 | 상태 |
|------|------|------|
| YouTube Music Player | `MiniPlayer.jsx`, `YouTubePlayer.jsx`, `usePlayerStore.js` | ✅ 완료 |
| Your Music (좋아요한 곡) | `ProfilePage.jsx` | ✅ 완료 |
| 재생/일시정지/다음/이전 | `MiniPlayer.jsx` | ✅ 완료 |
| 셔플 모드 | `usePlayerStore.js`, `MiniPlayer.jsx` | ✅ 완료 |
| 반복 모드 (none/all/one) | `usePlayerStore.js`, `MiniPlayer.jsx` | ✅ 완료 |
| 볼륨 조절 + 음소거 | `MiniPlayer.jsx` | ✅ 완료 |
| 진행 바 (시간 표시, 시크) | `MiniPlayer.jsx` | ✅ 완료 |
| 미니 플레이어 확장/축소 | `MiniPlayer.jsx` | ✅ 완료 |
| 좋아요 곡 삭제 | `ProfilePage.jsx` | ✅ 완료 |
| 컨텍스트 기반 추천 (For You) | `FeedPage.jsx`, `useContextRecommendation.js` | ✅ 완료 |
| 실제 차트 API 연결 | `ChartsPage.jsx` | ✅ 완료 |
| 다크모드 전체 적용 | 모든 페이지 | ✅ 완료 |
| Story Highlights 버튼 삭제 | `ProfilePage.jsx` | ✅ 완료 |
| **외부 음악 검색 박스** | `ProfilePage.jsx` | ✅ 완료 |
| **검색 결과 슬라이드 패널** | `ProfilePage.jsx` | ✅ 완료 |
| **Cloud Run API 검색 연결** | `ProfilePage.jsx` (ytmusicapi) | ✅ 완료 |
| **검색 결과 재생 + 좋아요 추가** | `ProfilePage.jsx` | ✅ 완료 |
| **검색 결과 순서 개선** | `ProfilePage.jsx` | ✅ 완료 |
| **모든 항목 표시 (slice 제거)** | `ProfilePage.jsx` | ✅ 완료 |
| **Similar Artists 섹션 추가** | `ProfilePage.jsx` | ✅ 완료 |
| **큰 썸네일 사용 (getBestThumbnail)** | `ProfilePage.jsx` | ✅ 완료 |
| **글로벌 국가 지원 (70+ 국가)** | `backend/main.py`, `useCountry.ts` | ✅ 완료 |
| **Discover 탭 (ytmusic.get_home)** | `ProfilePage.tsx` | ✅ 완료 |
| **플레이리스트 패널 (슬라이드업)** | `ProfilePage.tsx` | ✅ 완료 |
| **플레이리스트/앨범 클릭 재생** | `ProfilePage.tsx`, `backend/main.py` | ✅ 완료 |

#### 삭제된 하드코딩 데이터

| 파일 | 삭제된 내용 |
|------|-------------|
| `MobileLayout.jsx` | Super Shy / NewJeans 데모 트랙 |
| `ChartsPage.jsx` | MOCK_CHARTS 하드코딩 차트 데이터 |
| `ChartsPage.jsx` | 데모 스켈레톤 filler |
| `SearchPage.jsx` | mock 관련 코멘트 |

#### 커밋 히스토리 (최신순)

```
d63c26a Add playlist panel for Discover tab music playback
7cd7f01 Improve Discover tab with ytmusic.get_home() for real recommendations
274e5fa Add Discover tab with trending songs, new albums, and moods
34adf40 Fix: Use only YouTube Music API supported languages
4518412 Add global country support for localized YouTube Music results
3e0824c Improve search results: show all items and add Similar Artists section
41947f7 Remove Story Highlights section from ProfilePage
3890435 Remove hardcoded demo data and fix dark mode text colors
2d0d662 Add player controls, song deletion, and context-based recommendations
```

#### 남은 작업 (TODO)

| 우선순위 | 기능 | 상태 |
|---------|------|------|
| 높음 | 플레이리스트 CRUD (생성/수정/삭제) | ⏳ 미구현 |
| 높음 | 곡 순서 변경 (드래그앤드롭) | ⏳ 미구현 |
| 중간 | 다국어 지원 (i18n) | ⏳ 미구현 |
| 중간 | 팔로우/팔로워 시스템 | ⏳ 미구현 |
| 중간 | 좋아요/댓글 기능 | ⏳ 미구현 |
| 낮음 | 알림 시스템 | ⏳ 미구현 |

#### 주요 파일 구조

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── MobileLayout.jsx    # 메인 레이아웃 (데모 트랙 삭제됨)
│   │   ├── TopNav.jsx          # 상단 네비게이션
│   │   └── BottomNav.jsx       # 하단 네비게이션
│   └── player/
│       ├── MiniPlayer.jsx      # 미니 플레이어 (볼륨/반복/셔플 추가)
│       └── YouTubePlayer.jsx   # YouTube IFrame 플레이어
├── hooks/
│   ├── useCountry.js           # 국가 감지
│   └── useContextRecommendation.js  # 시간/날씨 기반 추천 (신규)
├── stores/
│   ├── usePlayerStore.js       # 플레이어 상태 관리
│   └── useAuthStore.js         # 인증 상태 관리
├── lib/
│   ├── supabase.js             # Supabase 클라이언트
│   └── api.js                  # API 유틸리티 (신규)
└── pages/
    ├── FeedPage.jsx            # 메인 피드 (For You 섹션 추가)
    ├── SearchPage.jsx          # 검색 페이지
    ├── CreatePage.jsx          # 플레이리스트 생성
    ├── ChartsPage.jsx          # 차트 (실제 API 연결)
    ├── ProfilePage.jsx         # 프로필 (Your Music, 삭제 기능)
    └── AuthPage.jsx            # 로그인/회원가입
```

#### 중요 API 정보

- **Backend API**: `https://musicgram-api-89748215794.us-central1.run.app`
- **Weather API**: Open-Meteo (무료, API 키 불필요)
- **IP 위치**: ipapi.co (무료)

---

### 작업 시 주의사항

1. **하드코딩 금지**: 모든 Mock/Demo/Fake 데이터 사용 금지
2. **다크모드 필수**: 모든 텍스트에 `text-black dark:text-white` 또는 `text-gray-XXX dark:text-gray-XXX` 적용
3. **API 우선**: 데이터는 반드시 실제 API에서 가져올 것
4. **Instagram UI 유지**: UI/UX는 Instagram과 동일하게 유지

---

## 코드 품질 필수 규칙 (MANDATORY)

```
+-----------------------------------------------------------------------+
|  EMOJI 사용 절대 금지                                                  |
|                                                                       |
|  - 코드, 주석, 문자열, UI 텍스트 어디에도 이모지 사용 불가             |
|  - 사용자가 명시적으로 요청하지 않는 한 어떤 상황에서도 금지           |
|  - 커밋 메시지에도 이모지 사용 금지                                   |
|                                                                       |
|  BAD:  console.log("Success! 🎉")                                     |
|  GOOD: console.log("Success!")                                        |
+-----------------------------------------------------------------------+
```

```
+-----------------------------------------------------------------------+
|  SonarQube 스캔 통과 필수                                             |
|                                                                       |
|  모든 코드는 SonarQube 품질 검사를 통과해야 함:                        |
|                                                                       |
|  - Code Smells 최소화                                                 |
|  - Bugs 0개 유지                                                      |
|  - Vulnerabilities 0개 유지                                           |
|  - Security Hotspots 검토 및 해결                                     |
|  - Duplications 5% 이하 유지                                          |
|  - Coverage 기준 충족                                                 |
|                                                                       |
|  코딩 시 준수사항:                                                    |
|  - 사용하지 않는 변수/import 제거                                     |
|  - 중복 코드 제거                                                     |
|  - 복잡도(Cognitive Complexity) 15 이하 유지                          |
|  - 하드코딩된 비밀번호/API 키 금지                                    |
|  - 적절한 에러 처리 필수                                              |
|  - console.log 프로덕션 코드에서 제거                                 |
+-----------------------------------------------------------------------+
```

---

## ⚠️ 음악 검색 API 사용법 (절대 잊지 말 것!)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🚨 중요: YouTube API가 아님! Cloud Run 백엔드 API 사용!            │
│                                                                     │
│  음악 검색은 Google Cloud Run에 배포된 백엔드 API를 통해 수행.      │
│  백엔드는 Python의 ytmusicapi 라이브러리를 사용하여 검색.           │
│                                                                     │
│  ❌ 절대 YouTube Data API 직접 호출 금지                           │
│  ✅ 반드시 Cloud Run 백엔드 API 사용                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 검색 API 사용 예시

```javascript
const API_BASE_URL = 'https://musicgram-api-89748215794.us-central1.run.app';

// 음악 검색
const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&filter=songs&limit=20`);
const data = await response.json();
const results = data.results || [];

// 검색 결과 구조
// results = [
//   {
//     videoId: 'abc123',
//     title: '곡 제목',
//     artists: [{ name: '아티스트명' }],
//     thumbnail: 'https://...',
//     duration: '3:45'
//   },
//   ...
// ]
```

### API 엔드포인트 상세

| 엔드포인트 | 설명 | 파라미터 |
|-----------|------|----------|
| `GET /api/search` | 음악 검색 | `q` (검색어), `filter` (songs/albums/artists), `limit` |
| `GET /api/charts` | 국가별 차트 | `country` (KR/US/JP 등) |
| `GET /api/new-albums` | 신규 앨범 | `country` |
| `GET /api/artist/{id}` | 아티스트 정보 | - |
| `GET /api/album/{id}` | 앨범 정보 | - |
| `GET /api/search/summary` | 아티스트 전체 디스코그래피 | `q`, `country`, `force_refresh` |

---

## ytmusicapi 라이브러리 레퍼런스

> **공식 문서**: https://ytmusicapi.readthedocs.io/
> **GitHub**: https://github.com/sigma67/ytmusicapi
> **현재 버전**: 1.11.4

### 검색 (Search)

```python
# 기본 검색
ytmusic.search(query, filter=None, limit=20)
# filter 옵션: "songs", "albums", "artists", "playlists", "videos", "podcasts"

# 자동완성 제안
ytmusic.get_search_suggestions(query)
```

### 아티스트 (Artists)

```python
# 아티스트 정보 조회 - 핵심 함수!
artist = ytmusic.get_artist(browseId)
# 반환값:
# {
#   "name": "아티스트명",
#   "description": "소개",
#   "subscribers": "1.5M",
#   "thumbnails": [...],
#   "songs": { "browseId": "...", "results": [...] },      # 인기곡
#   "albums": { "browseId": "...", "params": "...", "results": [...] },
#   "singles": { "browseId": "...", "params": "...", "results": [...] },
#   "videos": { "browseId": "...", "results": [...] },
#   "related": { "results": [...] }
# }

# 아티스트의 전체 앨범/싱글 목록 가져오기
# albums 또는 singles 섹션의 browseId와 params 사용
all_albums = ytmusic.get_artist_albums(browseId, params)
# 반환값: [{ "browseId": "...", "title": "앨범명", "year": "2024", ... }, ...]
```

### 앨범 (Albums)

```python
# 앨범 상세 정보 (트랙 목록 포함)
album = ytmusic.get_album(browseId)
# 반환값:
# {
#   "title": "앨범명",
#   "type": "Album" | "Single" | "EP",
#   "year": "2024",
#   "artists": [{ "name": "...", "id": "..." }],
#   "thumbnails": [...],
#   "tracks": [
#     { "videoId": "abc123", "title": "곡 제목", "duration": "3:45", ... },
#     ...
#   ]
# }
```

### 노래 (Songs)

```python
# 노래 상세 정보
song = ytmusic.get_song(videoId)

# 가사 가져오기
lyrics = ytmusic.get_lyrics(browseId)  # song에서 lyricsId 사용

# 관련 노래
related = ytmusic.get_song_related(browseId)
```

### 차트 (Charts)

```python
# 국가별 차트
charts = ytmusic.get_charts(country="KR")
# 반환값:
# {
#   "countries": [...],
#   "songs": { "items": [...] },
#   "videos": { "items": [...] },
#   "artists": { "items": [...] },
#   "trending": { "items": [...] }
# }
```

### 플레이리스트 (Playlists)

```python
# 플레이리스트 조회
playlist = ytmusic.get_playlist(playlistId, limit=100)

# 플레이리스트 생성 (인증 필요)
ytmusic.create_playlist(title, description, privacy="PRIVATE", video_ids=[])

# 플레이리스트 수정
ytmusic.edit_playlist(playlistId, title=None, description=None, privacy=None)

# 곡 추가/제거
ytmusic.add_playlist_items(playlistId, videoIds)
ytmusic.remove_playlist_items(playlistId, videos)
```

### 라이브러리 (Library) - 인증 필요

```python
ytmusic.get_library_playlists()   # 내 플레이리스트
ytmusic.get_library_songs()       # 저장한 노래
ytmusic.get_library_albums()      # 저장한 앨범
ytmusic.get_library_artists()     # 구독한 아티스트
ytmusic.get_liked_songs()         # 좋아요한 노래
ytmusic.get_history()             # 재생 기록

# 좋아요/싫어요
ytmusic.rate_song(videoId, rating)  # rating: "LIKE", "DISLIKE", "INDIFFERENT"
```

### 주요 ID 형식

| ID 타입 | 예시 | 설명 |
|--------|------|------|
| browseId (아티스트) | `UCvSDb9ctnIzyrlNewg5SGwQ` | 아티스트 채널 ID |
| browseId (앨범) | `MPREb_abc123` | 앨범 브라우즈 ID |
| videoId | `dQw4w9WgXcQ` | YouTube 비디오 ID (곡 재생용) |
| playlistId | `VLPL...` | 플레이리스트 ID |

### 검색 로직 (SORI 앱용)

```
1. 아티스트 검색: ytmusic.search(query, filter="artists")
2. 아티스트 페이지 조회: ytmusic.get_artist(browseId)
3. 전체 앨범 목록: ytmusic.get_artist_albums(albums.browseId, albums.params)
4. 각 앨범 상세: ytmusic.get_album(album.browseId)
5. 트랙 목록 추출: album.tracks

중요: 일반 검색(filter="songs")은 해당 아티스트 외의 노래도 포함됨!
      아티스트의 노래만 가져오려면 반드시 아티스트 페이지에서 추출할 것!
