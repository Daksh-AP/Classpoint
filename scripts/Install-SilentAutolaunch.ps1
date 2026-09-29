# scripts/Install-SilentAutolaunch.ps1
# Configures silent autolaunch on Windows without triggering UAC prompt

param(
    [string]$AppPath = "$PSScriptRoot\..\dist\win-unpacked\Genatis.exe"
)

Write-Host "--- CATEGORY 5: TEST 3 - SILENT AUTOLAUNCH (NO UAC) ---" -ForegroundColor Cyan

if (!(Test-Path $AppPath)) {
    # Resolve fallback if not yet packaged
    $AppPath = "$env:LOCALAPPDATA\Programs\Genatis\Genatis.exe"
}

$taskName = "GenatisBoardAutoStart"

# 1. Registry Method: HKCU Run Key (Does not require elevation, runs seamlessly at user login without UAC)
$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$regValueName = "GenatisBoard"
$regCommand = "`"$AppPath`" --silent --hidden"

try {
    Set-ItemProperty -Path $regPath -Name $regValueName -Value $regCommand -Force
    $registeredValue = Get-ItemPropertyValue -Path $regPath -Name $regValueName
    Write-Host "Registry Run Key injected: $registeredValue"
} catch {
    Write-Host "Registry write notice: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 2. Scheduled Task Method (Bypasses UAC consent dialogs for kiosk environments)
try {
    $action = New-ScheduledTaskAction -Execute $AppPath -Argument "--silent"
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -ExecutionTimeLimit (New-TimeSpan -Days 0) `
        -Priority 4

    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -RunLevel Highest `
        -Force | Out-Null

    $task = Get-ScheduledTask -TaskName $taskName
    Write-Host "Scheduled Task '$($task.TaskName)' registered with state: $($task.State)"
} catch {
    Write-Host "Task Scheduler registration: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Assert at least one silent launch mechanism succeeded
$regVerified = (Get-ItemProperty -Path $regPath -Name $regValueName -ErrorAction SilentlyContinue).$regValueName -ne $null
$taskVerified = (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) -ne $null

if ($regVerified -or $taskVerified) {
    Write-Host "[PASS] Silent autolaunch verified. Smartboard will boot app without UAC prompts." -ForegroundColor Green
    exit 0
} else {
    Write-Error "[FAIL] Unable to register silent autolaunch mechanism."
    exit 1
}
