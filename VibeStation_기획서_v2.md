# VibeStation 기획서 v2.0

## 글로벌 음악 팬덤 SNS 슈퍼앱

---

# 1. 프로젝트 정의

## 한 문장 정의
> **"글로벌 음악 팬덤 SNS + YouTube Music Lite 보너스"**

## 본질
```
VibeStation = Instagram/TikTok (음악 팬덤 특화)
            + YouTube Music Lite (무료 보너스)
            + 팬 쇼핑몰 (수익화)
```

## 핵심 가치 (우선순위)
| 순위 | 가치 | 설명 |
|------|------|------|
| 1 | **속도** | 전 세계 어디서든 1초 이내 로딩 |
| 2 | **글로벌** | 20개 언어, 다통화 지원 |
| 3 | **소셜** | 팬덤 커뮤니티/포스팅 |
| 4 | **음악** | 무료 YouTube Music Lite |
| 5 | **커머스** | 개인 쇼핑몰 |

## 주의사항
- MVP 없음 - 완전한 기능의 글로벌 플랫폼으로 개발
- 속도가 최우선 - 모든 설계는 속도 중심

---

# 2. 시스템 아키텍처

## 통합 구조 (Vercel 단일화)

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (통합 플랫폼)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [Next.js Frontend]          [Python API]                  │
│   - App Router                - ytmusicapi                  │
│   - React Server Components   - FastAPI                     │
│   - Edge Runtime              - 서버리스 함수               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    Vercel Edge Network                      │
│            (전 세계 Edge 캐싱, CDN)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Supabase                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ PostgreSQL  │  │    Auth     │  │      Storage        │  │
│  │ (캐시+데이터)│  │  (OAuth)    │  │  (미디어 파일)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │  Realtime   │  │    Edge     │                           │
│  │ (실시간)    │  │  Functions  │                           │
│  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (캐시 MISS 시에만)
┌─────────────────────────────────────────────────────────────┐
│                    YouTube Music                             │
│                   (ytmusicapi 호출)                          │
│                                                             │
│   * 운영 시 IP 차단되면 프록시(WebShare) 추가               │
└─────────────────────────────────────────────────────────────┘
```

## 폴더 구조

```
vibestation/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 관련 페이지
│   ├── (main)/                   # 메인 레이아웃
│   │   ├── page.tsx              # 홈
│   │   ├── explore/              # 탐색
│   │   ├── search/               # 검색
│   │   ├── feed/                 # 피드
│   │   ├── artist/[id]/          # 아티스트 팬카페
│   │   ├── album/[id]/           # 앨범 상세
│   │   ├── song/[id]/            # 곡 상세
│   │   ├── shop/                 # 쇼핑몰
│   │   ├── profile/              # 내 정보
│   │   └── settings/             # 설정
│   └── layout.tsx
├── api/                          # Python 서버리스 함수
│   ├── music/
│   │   ├── search.py
│   │   ├── artist.py
│   │   ├── album.py
│   │   ├── song.py
│   │   ├── charts.py
│   │   ├── moods.py
│   │   └── lyrics.py
│   └── index.py
├── components/                   # React 컴포넌트
├── lib/                          # 유틸리티
├── store/                        # Zustand 상태관리
├── requirements.txt              # Python 의존성
├── vercel.json                   # Vercel 설정
└── package.json
```

---

# 3. 속도 전략 (최우선)

## 속도 목표
| 지표 | 목표 | 설명 |
|------|------|------|
| FCP | < 1초 | First Contentful Paint |
| LCP | < 2.5초 | Largest Contentful Paint |
| TTI | < 3초 | Time to Interactive |
| CLS | < 0.1 | Cumulative Layout Shift |
| Cache Hit | > 95% | 캐시 적중률 |

## 3단계 캐싱 전략

```
요청 → [1. Edge Cache] → [2. Supabase Cache] → [3. ytmusicapi]
           (10ms)             (50ms)              (500ms+)
```

### Level 1: Vercel Edge Cache
- 위치: 전 세계 Edge PoP
- 지연: ~10ms
- 저장: 인기 데이터 자동 승격

### Level 2: Supabase PostgreSQL
- 위치: 멀티 리전
- 지연: ~50ms
- 저장: 모든 캐시 데이터
- 신선도 관리

### Level 3: ytmusicapi (Origin)
- 최후의 수단
- 결과는 즉시 Supabase에 저장

## 데이터별 캐시 TTL (신선도)

| 데이터 | TTL | 이유 |
|--------|-----|------|
| 아티스트 기본정보 | 7일 | 안정적 |
| 아티스트 앨범목록 | 1일 | 신규 앨범 반영 |
| 앨범 정보 | 30일 | 거의 불변 |
| 곡 정보 | 30일 | 거의 불변 |
| 가사 | 영구 | 불변 |
| 차트 | 1시간 | 실시간성 |
| 검색 결과 | 6시간 | 적당한 신선도 |
| 무드/장르 | 1일 | 플레이리스트 변동 |
| 인기 포스트 | 10분 | 자주 변동 |

## 캐시 승격 알고리즘

```javascript
if (조회수 > 100/시간) → Edge Cache 승격
if (조회수 > 10/시간) → Supabase Cache 유지
if (조회수 < 1/일) → Cache 해제 (저장은 유지)
```

## 성능 예산

```
HTML: < 14KB (첫 TCP 라운드트립)
CSS: < 50KB
JS (초기): < 50KB
JS (전체): < 200KB
이미지 (초기 뷰포트): < 200KB
웹폰트: < 50KB (서브셋)
```

## Stale-While-Revalidate 패턴

```
1. 캐시된 데이터 즉시 반환 (오래됐어도)
2. 백그라운드에서 새 데이터 fetch
3. 캐시 갱신
4. 다음 요청은 최신 데이터
```

---

# 4. 글로벌화 전략

## 지원 언어 (20개)
```
ko, en, ja, zh-CN, zh-TW, es, pt, fr, de, it,
ru, ar, hi, th, vi, id, tr, nl, pl, uk
```

## 지원 통화
```
KRW, USD, EUR, JPY, CNY, GBP, CAD, AUD, INR, BRL,
MXN, THB, VND, IDR, TRY
```

## 지역별 인프라

```
🇰🇷 아시아-태평양 (서울, 도쿄, 싱가포르, 시드니)
├── Vercel Edge PoP
└── Supabase 리전: 싱가포르

🇺🇸 북미 (뉴욕, 샌프란시스코, 토론토)
├── Vercel Edge PoP
└── Supabase 리전: 버지니아 (Primary)

🇪🇺 유럽 (런던, 프랑크푸르트, 암스테르담)
├── Vercel Edge PoP
└── Supabase 리전: 프랑크푸르트

🇧🇷 남미 (상파울루)
└── Vercel Edge PoP
```

## 다국어 데이터 저장

```json
{
  "name": "BTS",
  "name_i18n": {
    "ko": "방탄소년단",
    "ja": "防弾少年団",
    "zh-CN": "防弹少年团",
    "es": "BTS"
  }
}
```

## 자동 번역 통합
- Google Translate API / DeepL API
- 사용자 게시물 자동 번역
- 아티스트 설명 번역
- 가사 번역

---

# 5. 핵심 기능

## 5.1 데이터 캐싱 시스템

### 데이터 흐름

```
[사용자 검색]
      ↓
[Supabase 캐시 확인]
      ↓
  ┌───┴───┐
  ↓       ↓
[HIT]   [MISS]
  ↓       ↓
[즉시   [ytmusicapi 호출]
반환]         ↓
        [Supabase 저장]
              ↓
        [아티스트면 가상회원 생성]
              ↓
        [응답 반환]
```

### 캐시 테이블 구조

```sql
CREATE TABLE cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,           -- 'artist', 'album', 'song', 'chart', 'search', 'lyrics', 'mood'
  key TEXT NOT NULL,            -- 검색어 또는 ID
  data JSONB NOT NULL,          -- 전체 응답 데이터
  language TEXT DEFAULT 'en',   -- 요청 언어
  country TEXT DEFAULT 'ZZ',    -- 요청 국가
  hit_count INT DEFAULT 1,      -- 조회수 (승격용)
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(type, key, language, country)
);

CREATE INDEX idx_cache_lookup ON cache(type, key, language, country);
CREATE INDEX idx_cache_expiry ON cache(expires_at);
CREATE INDEX idx_cache_hits ON cache(hit_count DESC);
```

## 5.2 가상회원 시스템 (아티스트 = 팬카페)

### 개념
검색된 아티스트 → 자동으로 "가상 회원" 등록 → 팬카페 홈페이지 자동 생성

### 팬카페 홈 구성

```
┌─────────────────────────────────────────────────────────────┐
│ [배너 이미지]                                               │
│                                                             │
│ ┌──────┐                                                    │
│ │ 프사 │  아티스트명  ✓ 공식                               │
│ └──────┘  팔로워 1.2M | 게시물 5.4K                         │
│           [팔로우] [알림설정]                               │
├─────────────────────────────────────────────────────────────┤
│ [음악] [영상] [앨범] [팬포스트] [샵] [정보]                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [인기곡 TOP 5]              [최신 앨범]                    │
│  1. 곡제목 - 3:45            앨범 커버 + 제목               │
│  2. 곡제목 - 4:12                                           │
│  ...                                                        │
│                                                             │
│  [팬 포스트 피드]                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 사용자A: 오늘 콘서트 다녀왔어요! [이미지]           │   │
│  │ ♥ 1.2K  💬 234  ↗ 56                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 자동 수집 콘텐츠
- `get_artist()` → 기본 정보, 구독자
- `get_artist_albums()` → 디스코그래피
- `search(artist, filter="videos")` → 뮤직비디오
- `get_charts()` → 차트 순위

## 5.3 YouTube Music Lite (보너스 기능)

### ytmusicapi 지원 기능 (인증 없이)

| 기능 | API 메서드 | 용도 |
|------|-----------|------|
| 검색 | `search()` | 통합 검색 |
| 자동완성 | `get_search_suggestions()` | 실시간 제안 |
| 홈 피드 | `get_home()` | 추천 콘텐츠 |
| 아티스트 | `get_artist()` | 프로필, 인기곡 |
| 앨범 목록 | `get_artist_albums()` | 디스코그래피 |
| 앨범 상세 | `get_album()` | 트랙 리스트 |
| 곡 정보 | `get_song()` | 메타데이터 |
| 관련 곡 | `get_song_related()` | 추천 |
| 가사 | `get_lyrics()` | 가사 표시 |
| 차트 | `get_charts(country)` | 국가별 차트 |
| 무드 | `get_mood_categories()` | 분위기별 분류 |
| 무드 플리 | `get_mood_playlists()` | 무드별 플레이리스트 |
| 탐색 | `get_explore()` | 신규/트렌딩 |
| 재생목록 | `get_watch_playlist()` | 다음 곡 대기열 |
| 팟캐스트 | `get_podcast()` | 팟캐스트 정보 |
| 에피소드 | `get_episode()` | 에피소드 상세 |

### 음악 재생
- YouTube IFrame Player API 사용 (공식, 합법)
- 백그라운드 재생: PWA로 일부 지원

## 5.4 소셜 포스팅 (인스타/X/틱톡 스타일)

### 포스트 유형
| 유형 | 설명 | 아이콘 |
|------|------|--------|
| 이미지 | 최대 10장 캐러셀 | 📷 |
| 숏폼 비디오 | 최대 3분 | 🎬 |
| 텍스트 | 트위터 스타일 | 📝 |
| 음악 공유 | 곡/앨범 카드 | 🎵 |
| 리뷰 | 별점 + 리뷰 | ⭐ |

### 피드 알고리즘
1. 팔로우한 아티스트 팬카페 포스트
2. 팔로우한 유저 포스트
3. 인기 포스트 (좋아요/댓글/조회수)
4. 같은 관심 아티스트 기반 추천
5. 국가/언어 기반 로컬 콘텐츠

### 인터랙션
- 좋아요 ♥
- 댓글 💬
- 공유 ↗
- 저장 🔖
- 리포스트 🔄

## 5.5 개인 쇼핑몰

### 기능
- 회원 누구나 쇼핑몰 개설
- 팬굿즈, 핸드메이드, 앨범 리셀, 포토카드
- 다국가 배송
- 다통화 결제 (Stripe Connect)
- 아티스트 태그 → 팬카페 샵 탭에 노출

### 카테고리
- 팬굿즈
- 앨범/음반
- 포토카드
- 패션/의류
- 액세서리
- 아트/일러스트
- 디지털 굿즈

### 수수료
- 기본: 10%
- Legend 등급: 5%
- VIP 등급: 3%

## 5.6 보상 시스템 (Vibe Points)

### 포인트 획득

| 활동 | VP | 일일 한도 |
|------|-----|----------|
| 포스트 작성 | +50 | 500 |
| 이미지 포스트 | +80 | 400 |
| 비디오 포스트 | +150 | 450 |
| 리뷰 작성 | +100 | 500 |
| 댓글 작성 | +10 | 200 |
| 좋아요 받음 | +5 | 무제한 |
| 댓글 받음 | +10 | 무제한 |
| 공유됨 | +20 | 무제한 |
| 팔로워 획득 | +30 | 무제한 |
| 연속 접속 보너스 | +50~500 | - |
| 첫 구매 | +500 | 1회 |
| 쇼핑몰 판매 | +판매액 10% | 무제한 |

### 회원 등급

| 등급 | 필요 VP | 혜택 |
|------|---------|------|
| 🌱 Newbie | 0 | 기본 기능 |
| 🎵 Fan | 1,000 | 프로필 배지 |
| 🎸 Enthusiast | 5,000 | 커스텀 프로필 테마 |
| 🎤 Star | 20,000 | 포스트 상단 노출 부스트 |
| 👑 Legend | 100,000 | 쇼핑몰 수수료 50% 할인 |
| 💎 VIP | 500,000 | 전용 배지 + 모든 혜택 + 수수료 70% 할인 |

### VP 사용처
- 포스트 홍보 (더 많은 노출)
- 쇼핑몰 광고
- 프리미엄 프로필 꾸미기
- 쇼핑몰 수수료 할인
- 현금 환전 (일정 금액 이상)

### 리더보드
- 주간/월간 활동 랭킹
- 아티스트별 탑 팬 랭킹
- 국가별 랭킹
- 카테고리별 랭킹 (리뷰어, 포스터, 판매자)

---

# 6. 추가 기능 (제안)

## 6.1 AI 기능 (OpenAI/Claude API)

| 기능 | 설명 |
|------|------|
| 🎵 AI 플레이리스트 | "비오는 날 감성 K-pop" 프롬프트로 생성 |
| 📝 AI 번역 | 팬↔팬 실시간 다국어 소통 |
| 🎤 AI 가사 해석 | 가사 의미/배경 설명 |
| 💬 AI 챗봇 | 아티스트 정보 Q&A |
| 🖼️ AI 이미지 | 팬아트 생성 보조 |

## 6.2 실시간 기능 (Supabase Realtime)

| 기능 | 설명 |
|------|------|
| 🔴 라이브 리스닝 파티 | 팬들이 함께 음악 듣기 |
| 💬 실시간 채팅 | 팬카페 채팅방 |
| 📊 실시간 차트 | 순위 변동 애니메이션 |
| 🎉 실시간 축하 | 1위 달성 이벤트 |
| 🔔 실시간 알림 | 좋아요, 댓글, 팔로우 |

## 6.3 게임화

| 기능 | 설명 |
|------|------|
| 🏆 팬 랭킹 | 아티스트별 슈퍼팬 인증 |
| 🎯 일일/주간 미션 | 포스트 작성, 음악 감상 |
| 🎁 출석 체크 | 연속 보너스 |
| 🏅 수집형 배지 | 앨범 컴플리트, 콘서트 인증 |
| 🎮 팬 퀴즈 | 아티스트 퀴즈 대회 |

## 6.4 크리에이터 이코노미

| 기능 | 설명 |
|------|------|
| 💰 팬아트 마켓 | 디지털 아트 판매 |
| 🎨 디지털 굿즈 | 월페이퍼, 이모티콘 |
| 📹 독점 콘텐츠 | 유료 구독 |
| 💸 선물하기 | 팬→팬 포인트 선물 |
| 🎁 후원 | 크리에이터 후원 |

## 6.5 데이터 인사이트

| 기능 | 설명 |
|------|------|
| 📈 취향 분석 | 내 음악 취향 리포트 |
| 🌍 팬덤 지도 | 글로벌 팬 분포 시각화 |
| 📊 성장 그래프 | 아티스트 인기 추이 |
| 🎵 감상 통계 | 월간 감상 리포트 |
| 🔥 트렌드 분석 | 떠오르는 아티스트/곡 |

## 6.6 오프라인 연결

| 기능 | 설명 |
|------|------|
| 🎫 콘서트 정보 | 공연/이벤트 통합 |
| 📍 주변 팬 찾기 | 위치 기반 팬 매칭 |
| 🤝 팬미팅 주선 | 오프라인 모임 |
| 🎟️ 티켓 리셀 | 안전한 티켓 거래 |

---

# 7. 데이터베이스 스키마

## 핵심 테이블

```sql
-- ============================================
-- 1. 사용자 (Users)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,

  -- 설정
  language TEXT DEFAULT 'en',
  country TEXT DEFAULT 'US',
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',

  -- 포인트/등급
  points INT DEFAULT 0,
  level TEXT DEFAULT 'newbie',

  -- 통계
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  posts_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 아티스트 - 가상회원 (Virtual Artists)
-- ============================================
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT UNIQUE NOT NULL,    -- YouTube 채널 ID

  -- 기본 정보
  name TEXT NOT NULL,
  name_i18n JSONB DEFAULT '{}',       -- 다국어 이름
  thumbnail_url TEXT,
  banner_url TEXT,
  description TEXT,
  description_i18n JSONB DEFAULT '{}',
  subscribers TEXT,                    -- "1.5M" 형식

  -- 팬카페 설정
  slug TEXT UNIQUE,                    -- URL: /artist/bts
  theme JSONB DEFAULT '{}',            -- 테마 설정

  -- 통계
  platform_followers INT DEFAULT 0,    -- 우리 플랫폼 팔로워
  total_posts INT DEFAULT 0,
  total_views BIGINT DEFAULT 0,

  -- 캐시
  cached_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 캐시 (모든 ytmusicapi 데이터)
-- ============================================
CREATE TABLE cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                  -- 'artist', 'album', 'song', 'chart', 'search', 'lyrics', 'mood', 'home', 'explore'
  key TEXT NOT NULL,                   -- 검색어 또는 ID
  data JSONB NOT NULL,                 -- 전체 응답

  language TEXT DEFAULT 'en',
  country TEXT DEFAULT 'ZZ',

  hit_count INT DEFAULT 1,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  UNIQUE(type, key, language, country)
);

-- ============================================
-- 4. 포스트 (Posts)
-- ============================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id),  -- 태그된 아티스트

  -- 콘텐츠
  type TEXT NOT NULL,                  -- 'image', 'video', 'text', 'music', 'review'
  content TEXT,
  content_i18n JSONB DEFAULT '{}',
  media_urls TEXT[],

  -- 음악 연결
  music_type TEXT,                     -- 'song', 'album', 'playlist'
  music_id TEXT,                       -- videoId 또는 browseId
  music_data JSONB,                    -- 캐시된 음악 정보

  -- 리뷰용
  rating DECIMAL(2,1),                 -- 0.0 ~ 5.0

  -- 메타
  language TEXT,
  hashtags TEXT[],
  mentions UUID[],

  -- 통계
  views_count BIGINT DEFAULT 0,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  saves_count INT DEFAULT 0,

  -- 상태
  is_pinned BOOLEAN DEFAULT FALSE,
  visibility TEXT DEFAULT 'public',    -- 'public', 'followers', 'private'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. 인터랙션 (좋아요/댓글/저장 통합)
-- ============================================
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  target_type TEXT NOT NULL,           -- 'post', 'song', 'album', 'artist', 'product', 'comment'
  target_id TEXT NOT NULL,

  type TEXT NOT NULL,                  -- 'like', 'comment', 'save', 'share', 'repost'
  content TEXT,                        -- 댓글 내용

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. 팔로우 (Follows)
-- ============================================
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,

  following_type TEXT NOT NULL,        -- 'user', 'artist'
  following_id TEXT NOT NULL,          -- user UUID 또는 artist UUID

  notifications BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_type, following_id)
);

-- ============================================
-- 7. 플레이리스트 (Playlists)
-- ============================================
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  title_i18n JSONB DEFAULT '{}',
  description TEXT,
  cover_url TEXT,

  is_public BOOLEAN DEFAULT FALSE,

  songs JSONB DEFAULT '[]',            -- [{videoId, title, artist, thumbnail, duration}]
  songs_count INT DEFAULT 0,

  plays_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. 쇼핑몰 (Shops)
-- ============================================
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  name_i18n JSONB DEFAULT '{}',
  slug TEXT UNIQUE NOT NULL,           -- URL: /shop/my-store
  description TEXT,
  description_i18n JSONB DEFAULT '{}',

  logo_url TEXT,
  banner_url TEXT,

  -- 설정
  default_currency TEXT DEFAULT 'USD',
  supported_currencies TEXT[] DEFAULT ARRAY['USD'],
  shipping_countries TEXT[],

  -- 연관 아티스트
  artist_ids UUID[],

  -- 카테고리
  category TEXT,                       -- 'fan_goods', 'albums', 'fashion', 'art'

  -- 통계
  products_count INT DEFAULT 0,
  sales_count INT DEFAULT 0,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  rating DECIMAL(2,1),
  reviews_count INT DEFAULT 0,

  -- 상태
  is_verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. 상품 (Products)
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  title_i18n JSONB DEFAULT '{}',
  description TEXT,
  description_i18n JSONB DEFAULT '{}',

  images TEXT[],
  video_url TEXT,

  -- 가격 (다통화)
  prices JSONB NOT NULL,               -- {"USD": 29.99, "KRW": 35000}
  compare_prices JSONB,                -- 할인 전 가격

  -- 옵션
  variants JSONB,                      -- [{name, options, prices}]

  -- 재고
  stock INT DEFAULT 0,
  sku TEXT,

  -- 배송
  weight DECIMAL(10,2),
  shipping_options JSONB,

  -- 연관
  artist_id UUID REFERENCES artists(id),
  category TEXT,
  tags TEXT[],

  -- 통계
  views_count INT DEFAULT 0,
  sales_count INT DEFAULT 0,
  rating DECIMAL(2,1),
  reviews_count INT DEFAULT 0,

  -- 상태
  status TEXT DEFAULT 'active',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. 주문 (Orders)
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,

  user_id UUID REFERENCES users(id),
  shop_id UUID REFERENCES shops(id),

  -- 상품
  items JSONB NOT NULL,                -- [{product_id, variant, quantity, price}]

  -- 금액
  subtotal DECIMAL(15,2) NOT NULL,
  shipping_fee DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL,

  -- 배송
  shipping_address JSONB,
  tracking_number TEXT,

  -- 상태
  status TEXT DEFAULT 'pending',       -- 'pending', 'paid', 'shipped', 'delivered', 'cancelled'

  -- 결제
  payment_intent_id TEXT,              -- Stripe
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. 포인트 내역 (Point Transactions)
-- ============================================
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  amount INT NOT NULL,                 -- + 획득, - 사용
  type TEXT NOT NULL,                  -- 'earn', 'spend', 'transfer'
  reason TEXT NOT NULL,                -- 'post_created', 'like_received', 'purchase'

  reference_type TEXT,                 -- 'post', 'order', 'user'
  reference_id TEXT,

  balance_after INT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. 알림 (Notifications)
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  type TEXT NOT NULL,                  -- 'like', 'comment', 'follow', 'mention', 'order'
  title TEXT NOT NULL,
  body TEXT,

  actor_id UUID REFERENCES users(id),

  reference_type TEXT,
  reference_id TEXT,

  is_read BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 인덱스
-- ============================================

-- 캐시 조회
CREATE INDEX idx_cache_lookup ON cache(type, key, language, country);
CREATE INDEX idx_cache_expiry ON cache(expires_at) WHERE expires_at > NOW();
CREATE INDEX idx_cache_hits ON cache(hit_count DESC);

-- 포스트 피드
CREATE INDEX idx_posts_feed ON posts(created_at DESC) WHERE visibility = 'public';
CREATE INDEX idx_posts_artist ON posts(artist_id, created_at DESC);
CREATE INDEX idx_posts_user ON posts(user_id, created_at DESC);

-- 인터랙션
CREATE INDEX idx_interactions_target ON interactions(target_type, target_id, type);
CREATE INDEX idx_interactions_user ON interactions(user_id, type, created_at DESC);

-- 팔로우
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_type, following_id);

-- 상품
CREATE INDEX idx_products_shop ON products(shop_id, status);
CREATE INDEX idx_products_artist ON products(artist_id);

-- 알림
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

---

# 8. API 설계

## Music API (Python)

```
GET  /api/music/search?q={query}&filter={filter}&lang={lang}&country={code}
GET  /api/music/suggestions?q={query}
GET  /api/music/home?lang={lang}&country={code}
GET  /api/music/explore?lang={lang}&country={code}
GET  /api/music/artist/{channelId}
GET  /api/music/artist/{channelId}/albums
GET  /api/music/album/{browseId}
GET  /api/music/song/{videoId}
GET  /api/music/song/{videoId}/related
GET  /api/music/lyrics/{browseId}
GET  /api/music/charts/{country}
GET  /api/music/moods
GET  /api/music/moods/{params}/playlists
GET  /api/music/watch/{videoId}?radio={bool}&shuffle={bool}
GET  /api/music/podcast/{playlistId}
GET  /api/music/episode/{videoId}
```

## Social API (Next.js API Routes)

```
# 포스트
GET    /api/posts/feed?type={following|foryou|artist}
GET    /api/posts/explore
GET    /api/posts/{id}
POST   /api/posts
PUT    /api/posts/{id}
DELETE /api/posts/{id}

# 인터랙션
POST   /api/posts/{id}/like
DELETE /api/posts/{id}/like
POST   /api/posts/{id}/comment
GET    /api/posts/{id}/comments
POST   /api/posts/{id}/share
POST   /api/posts/{id}/save

# 사용자
GET    /api/users/{id}
PUT    /api/users/{id}
GET    /api/users/{id}/posts
GET    /api/users/{id}/likes
GET    /api/users/{id}/playlists
POST   /api/users/{id}/follow
DELETE /api/users/{id}/follow
GET    /api/users/{id}/followers
GET    /api/users/{id}/following

# 아티스트 팬카페
GET    /api/artists/{id}
GET    /api/artists/{id}/posts
GET    /api/artists/{id}/products
POST   /api/artists/{id}/follow
```

## Commerce API

```
# 쇼핑몰
GET    /api/shops
GET    /api/shops/{slug}
POST   /api/shops
PUT    /api/shops/{slug}

# 상품
GET    /api/shops/{slug}/products
GET    /api/products/{id}
POST   /api/shops/{slug}/products
PUT    /api/products/{id}
DELETE /api/products/{id}

# 장바구니
GET    /api/cart
POST   /api/cart/items
PUT    /api/cart/items/{id}
DELETE /api/cart/items/{id}

# 주문
POST   /api/orders
GET    /api/orders
GET    /api/orders/{id}

# 결제
POST   /api/checkout/session
POST   /api/checkout/webhook
```

## Points API

```
GET    /api/points/balance
GET    /api/points/history
POST   /api/points/redeem
GET    /api/points/leaderboard?type={weekly|monthly|artist}
```

---

# 9. 화면 구성

## 메인 네비게이션

```
데스크톱: [로고] [검색바] ─────────────── [알림] [프로필]
         [홈] [탐색] [피드] [쇼핑] [내음악]

모바일:   ─────────────────────────────
         [홈] [탐색] [+] [쇼핑] [프로필]
```

## 주요 화면

### 1. 홈
- 개인화 추천 섹션 (`get_home`)
- 실시간 차트 (국가별)
- 팔로우 아티스트 새 소식
- 인기 포스트 미리보기
- 추천 쇼핑몰/상품

### 2. 탐색
- 무드/장르 그리드
- 신규 앨범
- 차트 (글로벌/국가별)
- 팟캐스트
- 트렌딩 아티스트

### 3. 검색
- 통합 검색바 (실시간 자동완성)
- 최근 검색어
- 인기 검색어
- 탭: 전체/곡/앨범/아티스트/유저/샵

### 4. 피드
- 탭: 팔로잉 / For You / 아티스트
- 무한 스크롤 포스트
- 스토리 (상단)
- 포스트 작성 FAB

### 5. 아티스트 팬카페
- 배너 + 프로필
- 탭: 음악/영상/앨범/포스트/샵/정보
- 팬 커뮤니티 피드
- 실시간 채팅

### 6. 앨범/곡 상세
- 커버 아트
- 트랙리스트
- 가사
- 관련 포스트
- 비슷한 앨범

### 7. 플레이어
- 미니 플레이어 (하단 고정)
- 풀스크린 플레이어
- 가사 싱크
- 재생 대기열

### 8. 쇼핑몰
- 추천 샵
- 카테고리 브라우징
- 개별 샵 페이지
- 상품 상세
- 장바구니/결제

### 9. 내 정보
- 프로필
- 내 플레이리스트
- 좋아요한 곡/앨범
- 내 포스트
- 내 쇼핑몰 관리
- 포인트/등급
- 주문 내역
- 설정

---

# 10. 기술 스택

## Frontend

```
Next.js 14+ (App Router)
├── Partial Prerendering (PPR)
├── React Server Components
├── Streaming SSR
├── Edge Runtime
└── Turbopack

TypeScript
Tailwind CSS + shadcn/ui
Zustand (상태관리)
TanStack Query (데이터 페칭)
i18next (다국어)
Framer Motion (애니메이션)
YouTube IFrame API (플레이어)
```

## Backend

```
Vercel
├── Next.js API Routes (Node.js)
├── Python Serverless Functions
│   └── ytmusicapi + FastAPI
├── Edge Functions
└── Edge Config (설정)

Supabase
├── PostgreSQL (데이터베이스)
├── Auth (인증)
├── Storage (미디어)
├── Realtime (실시간)
└── Edge Functions
```

## 결제

```
Stripe Connect (글로벌)
├── 개인 쇼핑몰 정산
├── 다통화 지원
└── Webhook
```

## AI

```
OpenAI API
├── GPT-4 (플레이리스트 생성, 챗봇)
├── Whisper (음성)
└── DALL-E (이미지)

또는 Claude API
```

## 모니터링

```
Vercel Analytics (Core Web Vitals)
Sentry (에러 추적)
LogRocket (세션 리플레이)
```

---

# 11. 비용 예상

## 월간 비용 (초기)

| 서비스 | 용도 | 월 비용 |
|--------|------|---------|
| Vercel | 호스팅 + 서버리스 | $0~20 |
| Supabase | DB + Auth + Storage | $0~25 |
| OpenAI | AI 기능 | $10~50 |
| Stripe | 결제 수수료 | 거래의 2.9% |
| **총합 (초기)** | | **$10~95** |

## 확장 시

| 서비스 | 용도 | 월 비용 |
|--------|------|---------|
| Vercel Pro | 더 많은 트래픽 | $20+ |
| Supabase Pro | 더 많은 DB | $25~100 |
| WebShare 프록시 | IP 우회 (필요시) | $5~30 |
| CDN (Cloudflare) | 미디어 최적화 | $0~20 |
| **총합 (확장)** | | **$50~200+** |

---

# 12. 운영 시 IP 차단 대응

## 증상
YouTube/Google이 클라우드 IP 차단 시:
- ytmusicapi 호출 실패
- 빈 응답 또는 에러

## 해결책: 프록시 추가

```python
# api/music/search.py

from ytmusicapi import YTMusic
import os

# 프록시 설정 (필요시 활성화)
PROXY = os.environ.get('PROXY_URL')  # "http://user:pass@proxy.webshare.io:port"

if PROXY:
    import requests
    session = requests.Session()
    session.proxies = {"http": PROXY, "https": PROXY}
    ytmusic = YTMusic(requests_session=session)
else:
    ytmusic = YTMusic()
```

## 추천 프록시 서비스

| 서비스 | 가격 | 비고 |
|--------|------|------|
| WebShare | $5~30/월 | ytmusicapi 공식 추천 |
| Bright Data | $50+/월 | 대규모용 |
| SmartProxy | $15+/월 | 중간 규모 |

---

# 13. 수익 모델

| 모델 | 설명 | 예상 비율 |
|------|------|----------|
| **쇼핑몰 수수료** | 판매 금액의 3~10% | 40% |
| **프리미엄 구독** | 광고 제거, AI 기능 | 30% |
| **광고** | 포스트 부스트, 배너 | 20% |
| **기업 계정** | 공식 아티스트 계정 | 10% |

---

# 14. 성공 지표 (KPI)

| 지표 | 목표 |
|------|------|
| LCP | < 2초 (전 세계) |
| Cache Hit Rate | > 95% |
| DAU/MAU | > 40% |
| 포스트/유저/월 | > 5개 |
| 평균 세션 | > 10분 |
| 재방문율 | > 60% |
| 쇼핑몰 전환율 | > 2% |
| NPS | > 50 |

---

# 15. 차별화 요약

| 기존 서비스 | VibeStation 차별점 |
|------------|-------------------|
| YouTube Music | 무료 + SNS 결합 |
| Instagram | 음악 팬덤 특화 |
| Weverse | 글로벌 + 개인 쇼핑몰 + 모든 아티스트 |
| 팬카페 | 자동 생성 + AI 기능 + 보상 시스템 |
| Shopify | 팬덤 특화 + 아티스트 연결 |

---

# 부록: ytmusicapi 테스트 결과

로컬 테스트 (2025.12.26):
```
Python 3.13.9
ytmusicapi 1.11.4

search('BTS')           → ✅ 31개 결과
get_charts('KR')        → ✅ videos, artists 반환
get_mood_categories()   → ✅ 2개 카테고리
get_home()              → ✅ 2개 섹션
get_artist('IU')        → ✅ "IU" 반환
```

---

**문서 버전:** 2.0
**작성일:** 2025년 12월 26일
**다음 단계:** 개발 착수
