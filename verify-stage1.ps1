# Stage 1 verification script — run from the repository root in PowerShell.
# Usage:  powershell -ExecutionPolicy Bypass -File .\verify-stage1.ps1
# All output is mirrored to verify-stage1.log so failures can be inspected.
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

$log = Join-Path $PSScriptRoot "verify-stage1.log"
if (Test-Path $log) { Remove-Item $log -Force }
Start-Transcript -Path $log -Force | Out-Null

function Step($name, $script) {
  Write-Host "`n== $name ==" -ForegroundColor Cyan
  & $script
  $code = $LASTEXITCODE
  Write-Host "[$name exit code: $code]"
  if ($code -ne 0) {
    Write-Host "STEP FAILED: $name (exit $code)" -ForegroundColor Red
    Stop-Transcript | Out-Null
    exit $code
  }
}

Write-Host "Node: $(node --version)   npm: $(npm --version)"

Step "Remove superseded vanilla JS files" {
  $old = @("src\main.js", "src\styles.css", "src\i18n\index.js", "src\game\engine.js", "src\game\engine.test.js")
  foreach ($f in $old) { if (Test-Path $f) { Remove-Item $f -Force; Write-Host "  removed $f" } }
  if (Test-Path "src\game") { Remove-Item "src\game" -Recurse -Force; Write-Host "  removed src\game" }
}

Step "npm install" { npm install }

Step "npm test (Vitest)" { npm test }

Step "npm run build (tsc + vite)" { npm run build }

Step "npm run simulate (scoring report)" { npm run simulate }

Step "npx playwright install chromium" { npx playwright install chromium }

Step "npm run test:e2e (Playwright)" { npm run test:e2e }

Write-Host "`nAll Stage 1 checks passed." -ForegroundColor Green
Stop-Transcript | Out-Null
