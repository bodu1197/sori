# Supabase Access Guide for SORI Project

이 문서는 SORI 프로젝트의 데이터베이스 관리 및 마이그레이션을 위한 Supabase 접속 방법을 설명합니다.

## 1. 프로젝트 정보

- **Project Name**: sori-frontend (or generated name)
- **Project ID**: `nrtkbulkzhhlstaomvas`
- **Dashboard URL**: [https://supabase.com/dashboard/project/nrtkbulkzhhlstaomvas](https://supabase.com/dashboard/project/nrtkbulkzhhlstaomvas)
- **API URL**: `https://nrtkbulkzhhlstaomvas.supabase.co`

## 2. API Key 및 Token 관리

데이터베이스 스키마 변경(SQL 실행) 등 관리자 작업은 **Personal Access Token**이 필요합니다.

###🔑 현재 사용 중인 토큰

- **Token**: `sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296` (2025-12-20 발급)
- **용도**: SQL Migration 스크립트 실행 (CI/CD 파이프라인 또는 로컬 스크립트)

### 토큰 갱신 방법

1. [Supabase Access Tokens](https://supabase.com/dashboard/account/tokens) 페이지 접속
2. "Generate new token" 클릭
3. 새 토큰 복사 후 이 문서 및 `frontend/scripts` 내 관련 스크립트 업데이트

## 3. 마이그레이션 실행 (Schema Update)

새로운 테이블을 추가하거나 변경할 때 사용합니다.

### 실행 방법

프로젝트 루트(`c:/Users/ohyus/sori`)에서 다음 명령어 실행:

```bash
node frontend/scripts/run_migration.cjs
```

이 스크립트는 `supabase/migrations/` 폴더 내의 최신 SQL 파일을 읽어 Supabase Management API를 통해 실행합니다.

## 4. 로컬 환경 변수 (.env)

프론트엔드 앱 실행을 위한 환경 변수는 `frontend/.env`에 위치합니다.

```env
VITE_SUPABASE_URL=https://nrtkbulkzhhlstaomvas.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_MMnpzJzpTHCy9vgYxyM6TA_Cv9qXtcv
```

_주의: ANON KEY는 공개되어도 안전하지만, SERVICE_ROLE_KEY는 절대 클라이언트에 노출하면 안 됩니다._

## 5. Google Login 설정 (필수)

현재 앱에는 "Google로 시작하기" 버튼이 추가되었습니다. 이 기능이 작동하려면 **Supabase Dashboard**에서 설정을 마쳐야 합니다.

### 설정 방법

1. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com/))

   - 새 프로젝트 생성 -> **APIs & Services** -> **OAuth Consent Screen** 설정 (External, Test users)
   - **Credentials** -> **Create Credentials** -> **OAuth Client ID** (Web application)
   - **Authorized JavaScript Origins**: `https://nrtkbulkzhhlstaomvas.supabase.co`
   - **Authorized Redirect URIs**: `https://nrtkbulkzhhlstaomvas.supabase.co/auth/v1/callback`
   - 생성된 **Client ID**와 **Client Secret** 복사

2. **Supabase Dashboard** ([Authentication > Providers](https://supabase.com/dashboard/project/nrtkbulkzhhlstaomvas/auth/providers))

   - **Google** 공급자 선택 및 'Enable' 체크
   - 복사한 **Client ID**와 **Client Secret** 붙여넣기
   - 'Save' 클릭

3. **URL Configuration** ([Authentication > URL Configuration](https://supabase.com/dashboard/project/nrtkbulkzhhlstaomvas/auth/url-configuration))
   - **Site URL**: `https://sori-frontend.vercel.app` (배포 주소) 로 변경
   - **Redirect URLs**: `https://sori-frontend.vercel.app/**`, `http://localhost:5173/**` 추가

설정이 완료되면 로그인 화면에서 구글 버튼을 눌러 회원가입 및 로그인이 가능합니다.
