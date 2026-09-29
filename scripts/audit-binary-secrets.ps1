# scripts/audit-binary-secrets.ps1
# Audits compiled bundle assets and unpacked binary for hardcoded API keys and secrets

Write-Host "--- CATEGORY 4: TEST 1 - BINARY SECRET EXTRACTION AUDIT ---" -ForegroundColor Cyan

$targetDirs = @("build/assets", "dist/win-unpacked")
$secretPatterns = @(
    "(?i)(sk-[A-Za-z0-9]{32,})",
    "(?i)(ghp_[A-Za-z0-9]{36})",
    "-----BEGIN (RSA |EC )?PRIVATE KEY-----",
    "AQ\.Ab8RN6JK" # Previously leaked key
)

$violations = @()

foreach ($dir in $targetDirs) {
    if (Test-Path $dir) {
        Write-Host "Scanning directory: $dir ..."
        foreach ($pattern in $secretPatterns) {
            $matches = Get-ChildItem -Path $dir -Recurse -File -Include *.js, *.html, *.json, *.exe, *.dll -ErrorAction SilentlyContinue | 
                Select-String -Pattern $pattern -ErrorAction SilentlyContinue

            if ($matches) {
                foreach ($m in $matches) {
                    $violations += "Found leaked secret pattern '$pattern' in $($m.Path):$($m.LineNumber)"
                }
            }
        }
    }
}

if ($violations.Count -eq 0) {
    Write-Host "[PASS] Zero high-entropy LLM API keys or private credentials detected in compiled assets." -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAIL] Secret leak detected:" -ForegroundColor Red
    $violations | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    exit 1
}
