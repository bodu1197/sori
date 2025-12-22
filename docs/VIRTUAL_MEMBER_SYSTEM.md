# 🤖 가상 회원 시스템 (Virtual Member System)

## 개요

음악 아티스트(IU, BTS 등)를 플랫폼의 "가상 회원"으로 취급하여,
진짜 회원과 동일하게 행동하도록 만드는 AI 기반 시스템.

---

## 핵심 기능

### 1. 자동 포스팅 (Automated Posting)

- **신곡/앨범 홍보**: YouTube Music API로 신규 릴리즈 감지 → 자동 포스팅
- **일상 소식**: AI(Gemini)가 아티스트 스타일로 글 생성
- **랜덤 타이밍**: 실제 사람처럼 불규칙한 시간에 포스팅 (간헐적, 랜덤, 정기적)
- **국가별 맞춤**: 사용자 국가에 따라 언어/콘텐츠 최적화

### 2. 양방향 DM (Two-way Messaging)

- **먼저 연락**: 팔로워에게 "새 앨범 들어봤어?" 같은 메시지 발송
- **답장**: 팬이 보낸 메시지에 AI로 응답 (현재 구현됨: AIChatDrawer)
- **리액션**: 메시지에 하트/이모지 반응

### 3. 참여 활동 (Engagement)

- **좋아요 반응**: 팬이 좋아요 누르면 감사 메시지 or 리액션
- **댓글 달기**: 팬 포스팅에 아티스트가 댓글
- **팔로우백**: 팔로우한 팬에게 가끔 팔로우백

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────┐
│              Cloud Scheduler (Cron)              │
│         매시간/매일 주기적 트리거                  │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│           AI Activity Engine (Backend)           │
│  - 신규 릴리즈 감지 (ytmusicapi)                  │
│  - 포스트 생성 (Gemini AI)                       │
│  - DM 발송/응답                                  │
│  - 좋아요/댓글 시뮬레이션                         │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                   Supabase DB                    │
│  - artist_posts (아티스트 포스팅)                 │
│  - artist_messages (DM 내역)                     │
│  - artist_activities (활동 로그)                  │
│  - artist_follows (팔로우 관계)                   │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                    Frontend                      │
│  - 피드에 아티스트 포스팅 표시                     │
│  - 알림: "IU님이 새 글을 올렸습니다"               │
│  - DM 알림                                       │
└─────────────────────────────────────────────────┘
```

---

## 구현 현황

| 기능                   | 상태      | 관련 파일                                                            |
| ---------------------- | --------- | -------------------------------------------------------------------- |
| 아티스트 프로필 페이지 | ✅ 완료   | `frontend/src/pages/ArtistProfilePage.tsx`                           |
| AI 채팅 (DM 응답)      | ✅ 완료   | `frontend/src/components/ai/AIChatDrawer.tsx`, `backend/ai_agent.py` |
| 검색 → 프로필 이동     | ✅ 완료   | `frontend/src/pages/SearchPage.tsx`                                  |
| 홈 스토리바 노출       | ✅ 완료   | `frontend/src/components/stories/StoriesBar.tsx`                     |
| 프로필 이미지 저장     | ✅ 완료   | `backend/main.py` - `db_save_artist()`, `thumbnail_url` 필드         |
| 팔로우 기능 DB 연동    | ❌ 미구현 | -                                                                    |
| 자동 포스팅 시스템     | ❌ 미구현 | -                                                                    |
| 먼저 DM 보내기         | ❌ 미구현 | -                                                                    |
| 좋아요 반응            | ❌ 미구현 | -                                                                    |

---

## 구현 우선순위

### Phase 1: 자동 포스팅 시스템

1. `artist_posts` 테이블 생성
2. Cloud Scheduler로 주기적 트리거
3. 신규 릴리즈 감지 로직 (ytmusicapi)
4. AI 포스트 생성 (Gemini)
5. 피드에 아티스트 포스팅 표시

### Phase 2: 양방향 DM

1. 아티스트가 먼저 메시지 발송 로직
2. DM 알림 시스템
3. 메시지 리액션

### Phase 3: 참여 활동

1. 좋아요 감지 → 감사 메시지
2. 댓글 자동 생성
3. 팔로우백 로직

---

## 데이터베이스 스키마 (예정)

### artist_posts

```sql
CREATE TABLE artist_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_browse_id TEXT REFERENCES music_artists(browse_id),
  content TEXT NOT NULL,
  media_urls JSONB,
  post_type TEXT, -- 'album_promo', 'daily', 'announcement'
  target_countries TEXT[], -- NULL이면 전체
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

### artist_messages (DM)

```sql
CREATE TABLE artist_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_browse_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  direction TEXT, -- 'to_user', 'from_user'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### artist_activities (활동 로그)

```sql
CREATE TABLE artist_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_browse_id TEXT,
  activity_type TEXT, -- 'post', 'dm', 'like', 'comment', 'follow'
  target_user_id UUID,
  target_post_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 관련 API 엔드포인트 (예정)

- `POST /api/cron/artist-activity` - 스케줄러가 호출하는 활동 생성 엔드포인트
- `GET /api/feed/artist-posts` - 아티스트 포스팅 조회
- `POST /api/artist/dm/send` - 아티스트가 DM 발송
- `GET /api/artist/dm/history/:userId` - DM 내역 조회

---

## 환경 변수

- `GOOGLE_API_KEY` - Gemini AI API 키 (이미 설정됨)
- `CRON_SECRET` - 스케줄러 인증용 시크릿

---

## 참고 사항

- 아티스트 데이터는 `music_artists` 테이블에 저장됨
- `browse_id`는 YouTube Music 채널 ID (아티스트 고유 식별자)
- 검색 시 자동으로 DB에 저장됨 (`/api/search/quick`)

---

**마지막 업데이트**: 2024-12-23
