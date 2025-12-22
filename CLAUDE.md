# SORI Project - Claude Memory

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
