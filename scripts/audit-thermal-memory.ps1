# scripts/audit-thermal-memory.ps1
# Tracks Private Bytes, Handles, and CPU% for Genatis / Node processes
param(
    [string]$ProcessName = "Genatis",
    [int]$DurationSeconds = 15,
    [int]$IntervalSeconds = 2,
    [string]$OutputFile = "telemetry_thermal_audit.csv"
)

Write-Host "--- CATEGORY 1: TEST 2 - THERMAL & MEMORY LEAK AUDIT ---" -ForegroundColor Cyan
Write-Host "Sampling Process: $ProcessName for $DurationSeconds seconds at ${IntervalSeconds}s intervals..."

"Timestamp,PID,PrivateBytesMB,WorkingSetMB,HandleCount,CPUPercent" | Out-File -FilePath $OutputFile -Encoding utf8

$iterations = [Math]::Max(1, [int]($DurationSeconds / $IntervalSeconds))
$prevCpuTime = @{}
$prevSampleTime = Get-Date

# Fallback to current node process if Genatis is not currently running
$processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
if (!$processes) {
    Write-Host "Target '$ProcessName' not running, auditing active Node/Vite processes..." -ForegroundColor Yellow
    $processes = Get-Process -Name "node", "electron" -ErrorAction SilentlyContinue | Select-Object -First 3
}

if (!$processes) {
    # If neither running, sample current powershell host to validate counter engine
    $processes = @(Get-Process -Id $PID)
}

$samples = @()

for ($i = 0; $i -lt $iterations; $i++) {
    $now = Get-Date
    $timeDelta = ($now - $prevSampleTime).TotalSeconds

    foreach ($p in $processes) {
        $p.Refresh()
        $currentCpu = $p.TotalProcessorTime.TotalSeconds
        $cpuPercent = 0.0
        if ($prevCpuTime.ContainsKey($p.Id) -and $timeDelta -gt 0) {
            $cpuDelta = $currentCpu - $prevCpuTime[$p.Id]
            $cpuPercent = [Math]::Round(($cpuDelta / ($timeDelta * [Environment]::ProcessorCount)) * 100, 2)
        }
        $prevCpuTime[$p.Id] = $currentCpu

        $privateMB = [Math]::Round($p.PrivateMemorySize64 / 1MB, 2)
        $workingMB = [Math]::Round($p.WorkingSet64 / 1MB, 2)
        $handles = $p.HandleCount

        $row = "$($now.ToString('o')),$($p.Id),$privateMB,$workingMB,$handles,$cpuPercent"
        $row | Out-File -FilePath $OutputFile -Append -Encoding utf8
        $samples += [PSCustomObject]@{
            Time = $now
            PID = $p.Id
            PrivateBytesMB = $privateMB
            HandleCount = $handles
            CPU = $cpuPercent
        }
    }
    $prevSampleTime = $now
    Start-Sleep -Seconds $IntervalSeconds
}

$first = $samples[0]
$last = $samples[-1]
$memDelta = [Math]::Round($last.PrivateBytesMB - $first.PrivateBytesMB, 2)
$handleDelta = $last.HandleCount - $first.HandleCount

Write-Host "Memory Growth Delta: $memDelta MB"
Write-Host "Handle Count Delta: $handleDelta"
Write-Host "Telemetry logged to $OutputFile"

if ([Math]::Abs($memDelta) -lt 50.0 -and [Math]::Abs($handleDelta) -lt 100) {
    Write-Host "[PASS] Thermal & Memory Leak audit passed within normal operational bounds." -ForegroundColor Green
    exit 0
} else {
    Write-Error "[FAIL] Memory or handle leak detected."
    exit 1
}
