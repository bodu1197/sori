# =============================================================================
# SORI Project - Quality Check Script (PowerShell for Windows)
# Run before pushing: .\scripts\quality-check.ps1
# =============================================================================

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  SORI Pre-Push Quality Check (PowerShell)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

$ErrorsFound = $false
$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $RepoRoot) { $RepoRoot = Get-Location }

# =============================================================================
# Step 1: Frontend ESLint Check
# =============================================================================
Write-Host "[1/4] Running ESLint on Frontend..." -ForegroundColor Yellow

Push-Location "$RepoRoot\frontend"

if (Test-Path "package.json") {
    Write-Host "  - Auto-fixing ESLint issues..." -ForegroundColor Gray
    npm run lint -- --fix 2>$null

    Write-Host "  - Checking for remaining errors..." -ForegroundColor Gray
    $EslintResult = npm run lint 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] ESLint found errors:" -ForegroundColor Red
        $EslintResult | Select-Object -First 30 | ForEach-Object { Write-Host "    $_" }
        $ErrorsFound = $true
    } else {
        Write-Host "  [PASS] ESLint check passed" -ForegroundColor Green
    }
} else {
    Write-Host "  [SKIP] No package.json found" -ForegroundColor Yellow
}

Pop-Location

# =============================================================================
# Step 2: TypeScript Type Check
# =============================================================================
Write-Host ""
Write-Host "[2/4] Running TypeScript Type Check..." -ForegroundColor Yellow

Push-Location "$RepoRoot\frontend"

if (Test-Path "tsconfig.json") {
    $TscResult = npx tsc --noEmit 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] TypeScript found type errors:" -ForegroundColor Red
        $TscResult | Select-Object -First 20 | ForEach-Object { Write-Host "    $_" }
        $ErrorsFound = $true
    } else {
        Write-Host "  [PASS] TypeScript check passed" -ForegroundColor Green
    }
} else {
    Write-Host "  [SKIP] No tsconfig.json found" -ForegroundColor Yellow
}

Pop-Location

# =============================================================================
# Step 3: Python Lint Check (Backend)
# =============================================================================
Write-Host ""
Write-Host "[3/4] Running Python Lint Check..." -ForegroundColor Yellow

Push-Location "$RepoRoot\backend"

if (Test-Path "main.py") {
    # Try ruff first, then flake8
    $RuffExists = Get-Command ruff -ErrorAction SilentlyContinue
    $Flake8Exists = Get-Command flake8 -ErrorAction SilentlyContinue

    if ($RuffExists) {
        $PythonResult = ruff check . 2>&1
        $PythonExit = $LASTEXITCODE
    } elseif ($Flake8Exists) {
        $PythonResult = flake8 --max-line-length=120 --ignore=E501,W503 . 2>&1
        $PythonExit = $LASTEXITCODE
    } else {
        Write-Host "  [SKIP] No Python linter (ruff/flake8) found" -ForegroundColor Yellow
        $PythonExit = 0
    }

    if ($PythonExit -ne 0 -and $PythonResult) {
        Write-Host "  [WARN] Python lint warnings:" -ForegroundColor Yellow
        $PythonResult | Select-Object -First 15 | ForEach-Object { Write-Host "    $_" }
        # Python warnings don't block by default
    } else {
        Write-Host "  [PASS] Python check passed" -ForegroundColor Green
    }
} else {
    Write-Host "  [SKIP] No main.py found" -ForegroundColor Yellow
}

Pop-Location

# =============================================================================
# Step 4: SonarCloud Analysis (Optional - requires token)
# =============================================================================
Write-Host ""
Write-Host "[4/4] SonarCloud Status Check..." -ForegroundColor Yellow

$SonarToken = $env:SONAR_TOKEN

if ($SonarToken) {
    Write-Host "  - Fetching SonarCloud project status..." -ForegroundColor Gray
    try {
        $Headers = @{ Authorization = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${SonarToken}:")))" }
        $Response = Invoke-RestMethod -Uri "https://sonarcloud.io/api/qualitygates/project_status?projectKey=bodu1197_sori" -Headers $Headers

        if ($Response.projectStatus.status -eq "OK") {
            Write-Host "  [PASS] SonarCloud Quality Gate: PASSED" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] SonarCloud Quality Gate: $($Response.projectStatus.status)" -ForegroundColor Yellow
            # Show conditions that failed
            $Response.projectStatus.conditions | Where-Object { $_.status -ne "OK" } | ForEach-Object {
                Write-Host "    - $($_.metricKey): $($_.actualValue) (threshold: $($_.errorThreshold))" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "  [SKIP] Could not fetch SonarCloud status" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [SKIP] SONAR_TOKEN not set (set with `$env:SONAR_TOKEN=...)" -ForegroundColor Yellow
}

# =============================================================================
# Final Result
# =============================================================================
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan

if ($ErrorsFound) {
    Write-Host "  ERRORS FOUND - Fix before pushing!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  After fixing, run this script again:" -ForegroundColor White
    Write-Host "    .\scripts\quality-check.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "==============================================" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host "  All checks passed! Ready to push." -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}
