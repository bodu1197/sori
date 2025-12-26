# VibeStation 기획서

## 글로벌 음악 팬덤 SNS + YouTube Music Lite

---

## 1. 프로젝트 정의

### 한 문장 정의
> **"글로벌 음악 팬덤 SNS + YouTube Music Lite 보너스"**

### 본질
```
VibeStation = Instagram/TikTok (음악 팬덤 특화)
            + YouTube Music Lite (무료 보너스)
            + 팬 쇼핑몰 (수익화)
```

### 핵심 가치 (우선순위)
| 순위 | 가치 | 설명 |
|------|------|------|
| 1 | ⚡ **속도** | 전 세계 어디서든 1초 이내 로딩 |
| 2 | 🌍 **글로벌** | 20개 언어, 다통화 지원 |
| 3 | 👥 **소셜** | 팬덤 커뮤니티/포스팅 |
| 4 | 🎵 **음악** | 무료 YouTube Music Lite |
| 5 | 🛒 **커머스** | 개인 쇼핑몰 |

---

## 2. 속도 전략 (최우선)

### 속도 목표
| 지표 | 목표 | 설명 |
|------|------|------|
| FCP | < 1초 | First Contentful Paint |
| LCP | < 2.5초 | Largest Contentful Paint |
| TTI | < 3초 | Time to Interactive |
| CLS | < 0.1 | Cumulative Layout Shift |
| Cache Hit | > 95% | 캐시 적중률 |

### Edge First 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    글로벌 Edge 네트워크                      │
│         (Cloudflare Workers / Vercel Edge Functions)         │
│                                                              │
│   🌍 서울  🌍 도쿄  🌍 싱가포르  🌍 런던  🌍 뉴욕  🌍 상파울루   │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │              Edge Cache Layer (KV)                   │  │
│   │   - 아티스트 데이터                                   │  │
│   │   - 앨범/곡 데이터                                    │  │
│   │   - 인기 포스트                                       │  │
│   │   - 차트 데이터                                       │  │
│   └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Cache MISS only)
┌─────────────────────────────────────────────────────────────┐
│                     Origin Server                            │
│            (Supabase + ytmusicapi FastAPI)                   │
└─────────────────────────────────────────────────────────────┘
```

### 3단계 캐싱 전략

```
요청 → [1. Edge Cache] → [2. Redis Cache] → [3. Supabase] → [ytmusicapi]
           (10ms)            (50ms)           (100ms)        (500ms+)
```

**Level 1: Edge Cache (Cloudflare KV)**
- 위치: 전 세계 300+ PoP
- 지연: ~10ms
- 저장: 인기 데이터 (조회수 기반 자동 승격)

**Level 2: Redis Cache (Upstash)**
- 위치: 멀티 리전
- 지연: ~50ms
- 저장: 모든 캐시 데이터

**Level 3: Supabase PostgreSQL**
- 영구 저장소
- 신선도 관리

### 데이터별 캐시 TTL

| 데이터 | Edge | Redis | 이유 |
|--------|------|-------|------|
| 아티스트 기본 | 24h | 7d | 안정적 |
| 앨범 | 24h | 30d | 거의 불변 |
| 곡 | 24h | 30d | 거의 불변 |
| 가사 | 7d | 영구 | 불변 |
| 차트 | 5m | 1h | 실시간성 |
| 인기 포스트 | 1m | 10m | 자주 변동 |

### 캐시 승격 알고리즘

```javascript
if (조회수 > 100/시간) → Edge Cache 승격
if (조회수 > 10/시간) → Redis Cache 유지
if (조회수 < 1/일) → Cache 해제
```

### 성능 예산

```
HTML: < 14KB (첫 TCP 라운드트립)
CSS: < 50KB
JS (초기): < 50KB
JS (전체): < 200KB
이미지 (초기 뷰포트): < 200KB
웹폰트: < 50KB (서브셋)
```

---

## 3. 글로벌화 전략

### 지원 언어 (20개)
ko, en, ja, zh-CN, zh-TW, es, pt, fr, de, it, ru, ar, hi, th, vi, id, tr, nl, pl, uk

### 지원 통화
KRW, USD, EUR, JPY, CNY, GBP, CAD, AUD, INR, BRL, MXN, THB, VND, IDR, TRY

### 지역별 인프라 배치

```
🇰🇷 아시아-태평양 (서울, 도쿄, 싱가포르, 시드니)
├── Edge: Cloudflare PoP
├── Redis: Upstash 도쿄
└── DB Replica: Supabase 싱가포르

🇺🇸 북미 (뉴욕, 샌프란시스코, 토론토)
├── Edge: Cloudflare PoP
├── Redis: Upstash 버지니아
└── DB Primary: Supabase 버지니아

🇪🇺 유럽 (런던, 프랑크푸르트, 암스테르담)
├── Edge: Cloudflare PoP
├── Redis: Upstash 프랑크푸르트
└── DB Replica: Supabase 프랑크푸르트

🇧🇷 남미 (상파울루)
├── Edge: Cloudflare PoP
└── Redis: Upstash (가장 가까운 리전)
```

### 다국어 데이터 저장

```json
{
  "name": "BTS",
  "name_i18n": {
    "ko": "방탄소년단",
    "ja": "防弾少年団",
    "zh-CN": "防弹少年团"
  }
}
```

---

## 4. 핵심 기능

### 4.1 가상회원 시스템 (아티스트 = 팬카페)

**개념:** 검색된 아티스트 자동으로 "가상 회원" 등록 → 팬카페 자동 생성

```
┌─────────────────────────────────────────────┐
│ [배너 이미지]                               │
│ ┌──────┐                                    │
│ │ 프사 │  아티스트명  ✓ 공식               │
│ └──────┘  팔로워 1.2M | 게시물 5.4K         │
│           [팔로우] [알림설정]               │
├─────────────────────────────────────────────┤
│ [음악] [영상] [앨범] [팬포스트] [샵] [정보] │
├─────────────────────────────────────────────┤
│                                             │
│  팬들이 올린 포스트 피드 (인스타/틱톡 형식) │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.2 소셜 포스팅 (인스타/X/틱톡 스타일)

**포스트 유형:**
- 📷 이미지 포스트 (최대 10장 캐러셀)
- 🎬 숏폼 비디오 (최대 3분)
- 📝 텍스트 포스트
- 🎵 음악 공유 카드
- ⭐ 리뷰/평점

**피드 알고리즘:**
- 팔로우한 아티스트 팬카페 포스트
- 팔로우한 유저 포스트
- 인기 포스트 (좋아요/댓글/조회수)
- 국가/언어 기반 로컬 콘텐츠

### 4.3 YouTube Music Lite (보너스)

**ytmusicapi 활용 기능:**

| 기능 | API 메서드 |
|------|-----------|
| 검색 | `search()`, `get_search_suggestions()` |
| 아티스트 | `get_artist()`, `get_artist_albums()` |
| 앨범 | `get_album()` |
| 곡 | `get_song()`, `get_lyrics()` |
| 차트 | `get_charts(country)` |
| 무드/장르 | `get_mood_categories()`, `get_mood_playlists()` |
| 재생목록 | `get_watch_playlist()` (라디오/셔플) |
| 팟캐스트 | `get_podcast()`, `get_episode()` |

**재생:** YouTube IFrame Player API

### 4.4 개인 쇼핑몰

**기능:**
- 회원 누구나 쇼핑몰 개설
- 팬굿즈, 핸드메이드, 앨범 리셀
- 다국가 배송, 다통화 결제
- Stripe Connect 정산

**수수료:** 기본 10%, 등급별 할인

### 4.5 보상 시스템 (Vibe Points)

**포인트 획득:**
| 활동 | VP |
|------|-----|
| 포스트 작성 | +50 |
| 이미지 포스트 | +80 |
| 비디오 포스트 | +150 |
| 리뷰 작성 | +100 |
| 댓글 작성 | +10 |
| 좋아요 받음 | +5 |
| 팔로워 획득 | +30 |

**회원 등급:**
| 등급 | 필요 VP | 혜택 |
|------|---------|------|
| 🌱 Newbie | 0 | 기본 기능 |
| 🎵 Fan | 1,000 | 프로필 배지 |
| 🎸 Enthusiast | 5,000 | 커스텀 테마 |
| 🎤 Star | 20,000 | 포스트 부스트 |
| 👑 Legend | 100,000 | 수수료 50% 할인 |
| 💎 VIP | 500,000 | 모든 혜택 |

---

## 5. 추가 제안 기능

### 5.1 AI 기능 (OpenAI/Claude)
- 🎵 AI 플레이리스트: "비오는 날 감성 K-pop" 프롬프트 생성
- 📝 AI 번역: 팬↔팬 실시간 다국어 소통
- 🎤 AI 가사 해석: 가사 의미/배경 설명
- 💬 AI 챗봇: 아티스트 정보 Q&A

### 5.2 실시간 기능 (Supabase Realtime)
- 🔴 라이브 리스닝 파티: 팬들이 함께 음악 듣기
- 💬 실시간 채팅: 팬카페 채팅방
- 📊 실시간 차트: 순위 변동 애니메이션
- 🎉 실시간 축하: 1위 달성 이벤트

### 5.3 게임화
- 🏆 아티스트별 팬 랭킹 (슈퍼팬 인증)
- 🎯 일일/주간 미션
- 🎁 출석 체크 보상
- 🏅 수집형 배지

### 5.4 크리에이터 이코노미
- 💰 팬아트 NFT 마켓
- 🎨 디지털 굿즈 판매
- 📹 독점 콘텐츠 유료 구독
- 💸 팬→팬 선물하기

### 5.5 데이터 인사이트
- 📈 내 음악 취향 분석
- 🌍 글로벌 팬덤 지도
- 📊 아티스트 성장 그래프

---

## 6. 데이터베이스 스키마

### 핵심 테이블 (10개)

```sql
-- 1. 사용자
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar TEXT,
  language TEXT DEFAULT 'en',
  country TEXT DEFAULT 'US',
  currency TEXT DEFAULT 'USD',
  points INT DEFAULT 0,
  level TEXT DEFAULT 'newbie',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 아티스트 (가상회원)
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_i18n JSONB DEFAULT '{}',
  thumbnail TEXT,
  banner TEXT,
  subscribers TEXT,
  followers INT DEFAULT 0,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 캐시 (모든 ytmusicapi 데이터)
CREATE TABLE cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,  -- 'song', 'album', 'chart', 'search', 'lyrics'
  key TEXT NOT NULL,
  data JSONB NOT NULL,
  language TEXT DEFAULT 'en',
  country TEXT DEFAULT 'ZZ',
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(type, key, language, country)
);

-- 4. 포스트
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artists(id),
  type TEXT NOT NULL,  -- 'image', 'video', 'text', 'music', 'review'
  content TEXT,
  content_i18n JSONB DEFAULT '{}',
  media TEXT[],
  music_id TEXT,  -- videoId or browseId
  rating DECIMAL(2,1),
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 인터랙션 (좋아요/댓글/저장 통합)
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,  -- 'post', 'song', 'album', 'artist', 'product'
  target_id TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'like', 'comment', 'save', 'share'
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id, type)
);

-- 6. 팔로우
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_type TEXT NOT NULL,  -- 'user', 'artist'
  following_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_type, following_id)
);

-- 7. 플레이리스트
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_i18n JSONB DEFAULT '{}',
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  songs JSONB DEFAULT '[]',  -- [{videoId, title, artist, thumbnail}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 쇼핑몰
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_i18n JSONB DEFAULT '{}',
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  currencies TEXT[] DEFAULT ARRAY['USD'],
  artist_id UUID REFERENCES artists(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 상품
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_i18n JSONB DEFAULT '{}',
  description TEXT,
  images TEXT[],
  prices JSONB NOT NULL,  -- {"USD": 29.99, "KRW": 35000}
  stock INT DEFAULT 0,
  artist_id UUID REFERENCES artists(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. 주문
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  shop_id UUID REFERENCES shops(id),
  items JSONB NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 인덱스 (속도 최적화)

```sql
-- 캐시 조회 최적화
CREATE INDEX idx_cache_lookup ON cache(type, key, language, country);
CREATE INDEX idx_cache_expiry ON cache(expires_at) WHERE expires_at > NOW();

-- 포스트 피드 최적화
CREATE INDEX idx_posts_artist ON posts(artist_id, created_at DESC);
CREATE INDEX idx_posts_feed ON posts(created_at DESC);
CREATE INDEX idx_posts_user ON posts(user_id, created_at DESC);

-- 인터랙션 최적화
CREATE INDEX idx_interactions_target ON interactions(target_type, target_id, type);
CREATE INDEX idx_interactions_user ON interactions(user_id, type);

-- 팔로우 최적화
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_type, following_id);
```

---

## 7. 기술 스택

### Frontend
```
Next.js 14+ (App Router)
├── Partial Prerendering (PPR)
├── React Server Components
├── Streaming SSR
└── Edge Runtime

TypeScript
Tailwind CSS + shadcn/ui
Zustand (상태관리)
TanStack Query (데이터 페칭)
i18next (다국어)
Framer Motion (애니메이션)
YouTube IFrame API (플레이어)
```

### Backend
```
Cloudflare Workers (Edge Functions)
├── KV Storage (Edge Cache)
└── 전 세계 300+ PoP

Upstash Redis (Serverless)
├── 글로벌 리전
└── Edge 호환

Supabase
├── PostgreSQL (영구 저장)
├── Auth (소셜 로그인)
├── Storage (미디어)
└── Realtime (WebSocket)

FastAPI (Python)
└── ytmusicapi 래퍼
```

### 결제
```
Stripe Connect (글로벌)
PayPal
로컬 결제 (Toss, Alipay 등)
```

### 인프라
```
Vercel (Frontend)
Railway / Fly.io (Backend)
Cloudflare (CDN, WAF)
Sentry (에러 모니터링)
```

---

## 8. API 설계

### Music API
```
GET  /api/music/search?q={query}&filter={filter}&country={code}
GET  /api/music/suggestions?q={query}
GET  /api/music/artist/{channelId}
GET  /api/music/artist/{channelId}/albums
GET  /api/music/album/{browseId}
GET  /api/music/song/{videoId}
GET  /api/music/lyrics/{browseId}
GET  /api/music/charts/{country}
GET  /api/music/moods
GET  /api/music/moods/{params}/playlists
GET  /api/music/watch/{videoId}
```

### Social API
```
GET  /api/posts/feed
GET  /api/posts/explore
GET  /api/posts/artist/{artistId}
POST /api/posts
POST /api/posts/{id}/like
POST /api/posts/{id}/comment

GET  /api/users/{id}
POST /api/users/{id}/follow
GET  /api/users/{id}/posts
```

### Commerce API
```
GET  /api/shops/{slug}
POST /api/shops
GET  /api/products/{id}
POST /api/cart/items
POST /api/orders
POST /api/checkout/session
```

### Points API
```
GET  /api/points/balance
GET  /api/points/history
GET  /api/leaderboard/{type}
```

---

## 9. 화면 구성

### 메인 네비게이션
```
[홈] [탐색] [검색] [피드] [쇼핑] [내정보]
```

### 주요 화면
1. **홈** - 개인화 추천, 차트, 새 소식
2. **탐색** - 무드/장르, 신규 앨범, 팟캐스트
3. **검색** - 통합 검색, 자동완성
4. **피드** - 포스트 타임라인
5. **아티스트 팬카페** - 음악/영상/포스트/샵
6. **쇼핑몰** - 카테고리, 상품, 장바구니
7. **내 정보** - 프로필, 라이브러리, 설정

---

## 10. 수익 모델

| 모델 | 설명 | 예상 비율 |
|------|------|----------|
| 쇼핑몰 수수료 | 판매 금액의 10% | 40% |
| 프리미엄 구독 | 광고 제거, 추가 기능 | 30% |
| 광고 | 포스트 부스트, 배너 | 20% |
| 기업 계정 | 공식 아티스트 계정 | 10% |

---

## 11. 성공 지표

| 지표 | 목표 |
|------|------|
| LCP | < 2초 (전 세계) |
| Cache Hit Rate | > 95% |
| DAU/MAU | > 40% |
| 포스트/유저/월 | > 5개 |
| 평균 세션 | > 10분 |
| 재방문율 | > 60% |

---

## 12. 개발 일정

| Phase | 기간 | 내용 |
|-------|------|------|
| 1. 인프라 | 4주 | 프로젝트 세팅, DB, 캐싱, 다국어 |
| 2. 음악 | 4주 | 검색, 브라우징, 플레이어, 가사 |
| 3. 팬카페 | 3주 | 가상회원, 자동 생성, 테마 |
| 4. 소셜 | 4주 | 포스트, 피드, 팔로우, 알림 |
| 5. 커머스 | 4주 | 쇼핑몰, 상품, 결제, 정산 |
| 6. 보상 | 2주 | 포인트, 등급, 리더보드 |
| 7. 최적화 | 3주 | 성능, 보안, 테스트, 출시 |

**총 개발 기간: 24주 (6개월)**

---

## 13. 차별화 요약

| 기존 서비스 | VibeStation 차별점 |
|------------|-------------------|
| YouTube Music | 무료 + SNS 결합 |
| Instagram | 음악 팬덤 특화 |
| Weverse | 글로벌 + 개인 쇼핑몰 |
| 팬카페 | 자동 생성 + AI 기능 |

---

**작성일:** 2024년
**버전:** 1.0
