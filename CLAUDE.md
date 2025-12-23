# SORI Project - Claude Memory

## ⚠️ MANDATORY: Supabase SQL Execution

**항상 이 방법으로 SQL 실행할 것. 다른 방법 시도 금지!**

### Supabase Management API로 SQL 실행

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/nrtkbulkzhhlstaomvas/database/query" \
  -H "Authorization: Bearer sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR_SQL_HERE"}'
```

### 예시

```bash
# 테이블 생성
curl -s -X POST "https://api.supabase.com/v1/projects/nrtkbulkzhhlstaomvas/database/query" \
  -H "Authorization: Bearer sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296" \
  -H "Content-Type: application/json" \
  -d '{"query": "CREATE TABLE IF NOT EXISTS my_table (id UUID PRIMARY KEY DEFAULT gen_random_uuid());"}'

# RLS 활성화
curl -s -X POST "https://api.supabase.com/v1/projects/nrtkbulkzhhlstaomvas/database/query" \
  -H "Authorization: Bearer sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296" \
  -H "Content-Type: application/json" \
  -d '{"query": "ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;"}'

# 함수 생성
curl -s -X POST "https://api.supabase.com/v1/projects/nrtkbulkzhhlstaomvas/database/query" \
  -H "Authorization: Bearer sbp_753b67c2411cad6320ef44d6626ac13ee2ba6296" \
  -H "Content-Type: application/json" \
  -d '{"query": "CREATE OR REPLACE FUNCTION my_func() RETURNS void LANGUAGE plpgsql AS $$ BEGIN END; $$;"}'
```

### 주의사항

- `supabase db push` 사용 금지 (migration 충돌 발생)
- 여러 SQL문은 각각 별도 API 호출로 실행
- 응답이 `[]`이면 성공

---

## SonarCloud Configuration

- **Project Key**: `bodu1197_sori`
- **Organization**: `bodu1197`
- **Host URL**: https://sonarcloud.io
- **Token**: Stored in GitHub Secrets (`SONAR_TOKEN`)

### Local Scan Command

```powershell
# Token must be set as environment variable (do not commit tokens!)
$env:SONAR_TOKEN="<your-token-from-github-secrets>"
npx sonar-scanner -Dsonar.host.url=https://sonarcloud.io
```

### GitHub Actions

- Workflow file: `.github/workflows/sonarcloud.yml`
- Token stored in: GitHub Secrets (`SONAR_TOKEN`)
- Triggers: push to main, pull requests, manual dispatch

## Project Structure

- **Frontend**: `frontend/` - Vite + React + TypeScript + TailwindCSS
- **Backend**: `backend/` - Python FastAPI
- **Database**: Supabase

## Vercel Deployment

- **Frontend URL**: https://sori-frontend.vercel.app
- **Root Directory**: `frontend`
- **Framework**: Vite

## SonarCloud Analysis Results (2024-12-22)

> ⚠️ **Note**: Automatic Analysis is enabled. Manual/CI scans will conflict.
> Dashboard: https://sonarcloud.io/project/overview?id=bodu1197_sori

### Summary

| Metric                | Value  | Rating        |
| --------------------- | ------ | ------------- |
| **Lines of Code**     | 23,395 | -             |
| **Bugs**              | 28     | C (Medium)    |
| **Vulnerabilities**   | 2      | E (Critical)  |
| **Security Hotspots** | 257    | Review needed |
| **Code Smells**       | 167    | A (Good)      |
| **Duplicated Lines**  | 25.4%  | High          |

### Priority Issues to Fix

1. **🔴 Security (E Rating)**: 2 vulnerabilities - CRITICAL, fix immediately
2. **🟡 Reliability (C Rating)**: 28 bugs - review and fix
3. **🟠 Security Hotspots**: 257 items need security review
4. **🟡 Duplication**: 25.4% - consider refactoring duplicated code

---

## Quality Gate Enforcement (Pre-Push Hooks)

### Automatic Checks Before Push

The project enforces code quality via Husky git hooks:

| Hook | Checks | Blocks Push |
|------|--------|-------------|
| **pre-commit** | ESLint + Prettier (auto-fix) | Yes |
| **pre-push** | TypeScript + ESLint + Build | Yes |

### What Gets Checked

1. **TypeScript**: `npx tsc --noEmit` - All type errors must be fixed
2. **ESLint**: `npm run lint --fix` - Lint errors block push (auto-fix attempted)
3. **Build**: `npm run build` - Build must succeed

### Manual Quality Check (PowerShell)

```powershell
.\scripts\quality-check.ps1
```

### Bypass (NOT Recommended)

```bash
git push --no-verify
```

### Hook Files Location

- `frontend/.husky/pre-commit` - Lint-staged on commit
- `frontend/.husky/pre-push` - Full quality check on push
- `.git/hooks/pre-push` - Backup hook (if husky fails)

---

## Virtual Member System (2024-12-23)

### Database Schema

```sql
-- profiles table additions
member_type TEXT DEFAULT 'user'  -- 'user' | 'artist'
artist_browse_id TEXT UNIQUE     -- YouTube Music browse_id
is_verified BOOLEAN DEFAULT false
ai_persona JSONB                 -- Gemini-generated persona
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/virtual-members/create` | POST | Create virtual member from artist |
| `/api/virtual-members/migrate-all` | POST | Migrate all artists to virtual members |
| `/api/virtual-members/list` | GET | List all virtual members |
| `/api/cron/artist-activity` | POST | AI auto-posting, likes, comments |
| `/api/cron/artist-dm` | POST | AI welcome DMs to new followers |
| `/api/cron/test-activity` | GET | Test single AI post generation |
