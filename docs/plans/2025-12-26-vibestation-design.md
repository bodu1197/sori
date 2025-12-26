# VibeStation 설계 문서

**작성일:** 2025-12-26
**버전:** 3.0 (최종)

---

## 1. 프로젝트 개요

### 정의
> **"글로벌 음악 팬덤 SNS + YouTube Music Lite + 팬 쇼핑몰"**

### 핵심 가치 (우선순위)
1. **속도** - 전 세계 1초 이내 로딩
2. **글로벌** - 76개 언어, 다통화 지원
3. **소셜** - 팬덤 커뮤니티/포스팅
4. **음악** - 무료 YouTube Music Lite
5. **커머스** - 개인 쇼핑몰

### 기술 스택
| 영역 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router, RSC, PPR) |
| 스타일 | Tailwind CSS + shadcn/ui |
| 상태관리 | Zustand + TanStack Query |
| DB/Auth | Supabase |
| 음악 API | Python + ytmusicapi |
| 결제 | Stripe Connect |
| 다국어 | next-intl |

---

## 2. 프로젝트 구조

```
vibestation/
├── app/
│   ├── [locale]/                 # 다국어 라우팅
│   │   ├── (auth)/               # 인증 (로그인, 회원가입)
│   │   ├── (main)/               # 메인 레이아웃
│   │   │   ├── page.tsx          # 홈
│   │   │   ├── explore/          # 탐색
│   │   │   ├── search/           # 검색
│   │   │   ├── feed/             # 소셜 피드
│   │   │   ├── artist/[id]/      # 아티스트 팬카페
│   │   │   ├── album/[id]/       # 앨범 상세
│   │   │   ├── song/[id]/        # 곡 상세
│   │   │   ├── shop/             # 쇼핑몰
│   │   │   ├── profile/[id]/     # 프로필
│   │   │   └── settings/         # 설정
│   │   ├── (admin)/              # 관리자 페이지
│   │   ├── (ads)/                # 광고주 대시보드
│   │   └── (creator)/            # 크리에이터 대시보드
│   └── api/                      # API Routes
├── api/                          # Python 서버리스 (ytmusicapi)
├── components/                   # React 컴포넌트
├── lib/                          # 유틸리티
├── stores/                       # Zustand
├── i18n/                         # 다국어 (76개 언어)
└── types/                        # TypeScript 타입
```

---

## 3. 다국어 시스템 (76개 언어)

### 지원 언어
| 지역 | 언어 |
|------|------|
| 동아시아 | ko, ja, zh-CN, zh-TW, mn |
| 동남아시아 | th, vi, id, ms, fil, my, km, lo |
| 남아시아 | hi, bn, ta, te, mr, gu, kn, ml, pa, ur, ne, si |
| 중동 | ar, he, fa, tr |
| 유럽 서부 | en, es, fr, de, it, pt, nl, be |
| 유럽 북부 | sv, no, da, fi, is |
| 유럽 동부 | ru, pl, uk, cs, sk, hu, ro, bg, sr, hr, sl, bs, mk, sq, lt, lv, et |
| 유럽 남부 | el, ca, eu, gl, mt |
| 아프리카 | sw, am, zu, af, ha, yo, ig |
| 오세아니아 | mi, sm |
| 아메리카 | es-419, pt-BR, fr-CA |

### RTL 언어
ar, he, fa, ur

### 번역 전략
- Tier 1 (10개): 전문 번역
- Tier 2 (20개): AI 번역 + 검수
- Tier 3 (46개): AI 자동 번역

---

## 4. 관리자 시스템

### 페이지 구조
```
app/(admin)/
├── dashboard/          # 대시보드 (KPI, 실시간 통계)
├── users/              # 사용자 관리
├── artists/            # 아티스트/가상회원 관리
├── posts/              # 콘텐츠 모더레이션
├── shops/              # 쇼핑몰 관리
├── products/           # 상품 관리
├── orders/             # 주문 관리
├── reports/            # 신고 관리
├── ads/                # 광고 관리
├── creators/           # 크리에이터 관리
├── points/             # 포인트 관리
├── cache/              # 캐시 관리
├── translations/       # 번역 관리
└── settings/           # 시스템 설정
```

### 권한 체계
| 역할 | 권한 |
|------|------|
| user | 일반 사용자 |
| moderator | 콘텐츠 모더레이션 |
| admin | 대부분 관리 기능 |
| superadmin | 전체 권한 |

---

## 5. 광고 시스템 (포스트형)

### 광고 유형
- **스폰서드 포스트**: 광고주가 새로 만드는 광고 포스트
- **부스트**: 기존 포스트를 홍보

### 피드 노출
- 5개 포스트마다 1개 광고 삽입
- 타겟팅 기반 매칭

### 광고주 대시보드
```
app/(ads)/
├── page.tsx            # 광고 현황
├── create/             # 새 광고 생성
├── boost/[postId]/     # 포스트 부스트
├── stats/              # 성과 통계
└── billing/            # 결제/충전
```

---

## 6. 크리에이터 수익 시스템

### 수익 창출 방법
| 유형 | 수익 기준 |
|------|----------|
| 재생 수익 | 1,000회당 $0.5~2 (티어별) |
| 광고 배분 | 광고 수익의 50~70% |
| 팁/후원 | 100% (수수료 제외) |
| 유료 구독 | 월 구독료의 70% |
| 쇼핑몰 판매 | 판매가의 90~97% |

### 크리에이터 티어
| 티어 | 조건 | RPM |
|------|------|-----|
| 브론즈 | 가입 | $0.5 |
| 실버 | 월 10만 조회 | $0.8 |
| 골드 | 월 100만 조회 | $1.2 |
| 플래티넘 | 월 1000만 조회 | $1.5 |
| 다이아몬드 | 월 1억 조회 | $2.0 |

### 가입 조건
- 팔로워 1,000명 이상
- 최근 90일 포스트 10개 이상
- 최근 90일 조회수 10,000회 이상

---

## 7. 캐싱 시스템

### 3단계 캐싱
```
요청 → [Edge Cache] → [Supabase Cache] → [ytmusicapi]
          (10ms)          (50ms)           (500ms+)
```

### TTL 설정
| 데이터 | TTL |
|--------|-----|
| 아티스트 기본정보 | 7일 |
| 앨범/곡 정보 | 30일 |
| 가사 | 영구 |
| 차트 | 1시간 |
| 검색 결과 | 6시간 |

---

## 8. 데이터베이스 스키마

### 핵심 테이블
1. **users** - 사용자 (role 포함)
2. **artists** - 아티스트/가상회원
3. **posts** - 포스트 (is_ad, ad_data 포함)
4. **advertisers** - 광고주
5. **ad_events** - 광고 이벤트 로그
6. **creators** - 크리에이터 프로그램
7. **earnings** - 수익 내역
8. **payouts** - 정산 내역
9. **tips** - 후원 내역
10. **subscriptions** - 구독
11. **interactions** - 좋아요/댓글/저장
12. **follows** - 팔로우
13. **playlists** - 플레이리스트
14. **shops** - 쇼핑몰
15. **products** - 상품
16. **orders** - 주문
17. **point_transactions** - 포인트 내역
18. **notifications** - 알림
19. **cache** - 캐시 데이터

---

## 9. 개발 순서

1. Next.js 프로젝트 생성
2. Supabase 스키마 적용
3. 기본 레이아웃 및 네비게이션
4. 인증 시스템
5. 음악 API (ytmusicapi)
6. 소셜 기능 (포스트, 피드)
7. 관리자 페이지
8. 광고 시스템
9. 크리에이터 수익 시스템
10. 커머스 기능
11. 다국어 시스템 (76개)
12. 최적화 및 테스트

---

**문서 버전:** 3.0
**승인일:** 2025-12-26
