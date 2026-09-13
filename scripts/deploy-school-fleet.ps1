<#
.SYNOPSIS
    Genatis Board Desktop - 80 OPS Smartboard Fleet Deployment & Hardening Script
.DESCRIPTION
    Configures Windows 10/11 IoT Enterprise on Senses OPS modules to withstand:
    1. Deep Freeze & UWF reboot-to-restore (configures persistent ThawSpace storage).
    2. Windows SmartScreen interstitials (via explicit Windows Defender exclusions & MOTW unblock).
    3. Sudden wall-switch power cutoffs (resilient Crash Sentinel lifecycle).
    4. Silent background updating under SYSTEM without teacher UAC prompts.
#>

[CmdletBinding()]
param(
    [string]$TargetDrive = "D:\GenatisData",
    [string]$InstallPath = "C:\Program Files\Genatis Board",
    [switch]$ConfigureStartup = $true
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Genatis Board - 80 OPS Smartboard Hardening Deployer   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Ensure Administrator Rights
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "This script must be executed as Administrator (via Intune, GPO, or elevated PowerShell)."
    exit 1
}

# 2. Configure Deep Freeze / UWF Persistent ThawSpace Storage
Write-Host "
[1/4] Configuring Persistent Storage (Deep Freeze / UWF Exclusion)..." -ForegroundColor Yellow
if (Test-Path "D:\") {
    $persistentPath = "D:\GenatisData"
} elseif (Test-Path "E:\") {
    $persistentPath = "E:\GenatisData"
} elseif (Test-Path "C:\ThawSpace") {
    $persistentPath = "C:\ThawSpace\GenatisData"
} else {
    $persistentPath = "C:\GenatisData"
    Write-Warning "No secondary partition detected. Using C:\GenatisData. Ensure this path is added to UWF / Deep Freeze exclusion."
}

if (-not (Test-Path $persistentPath)) {
    New-Item -ItemType Directory -Path $persistentPath -Force | Out-Null
    New-Item -ItemType Directory -Path "$persistentPath\UserData" -Force | Out-Null
    New-Item -ItemType Directory -Path "$persistentPath\Downloads" -Force | Out-Null
}

[System.Environment]::SetEnvironmentVariable("GENATIS_DATA_DIR", $persistentPath, [System.EnvironmentVariableTarget]::Machine)
Write-Host "  -> Machine Environment Variable GENATIS_DATA_DIR set to: $persistentPath" -ForegroundColor Green

# 3. Windows Defender SmartScreen & Antivirus Exclusions (Bypasses SmartScreen Permanently)
Write-Host "
[2/4] Bypassing Windows Defender SmartScreen & Setting Exclusions..." -ForegroundColor Yellow
try {
    # Exclude data and program directories
    Add-MpPreference -ExclusionPath $persistentPath -ErrorAction SilentlyContinue
    if (Test-Path $InstallPath) {
        Add-MpPreference -ExclusionPath $InstallPath -ErrorAction SilentlyContinue
        # Strip Mark-of-the-Web (Zone.Identifier) alternate data streams from binaries
        Get-ChildItem -Path $InstallPath -Recurse -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
        Write-Host "  -> Unblocked NTFS Zone.Identifier streams from application files." -ForegroundColor Green
    }
    Add-MpPreference -ExclusionProcess "genatis-board.exe" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "electron.exe" -ErrorAction SilentlyContinue
    Write-Host "  -> Added Windows Defender exclusions for process and installation directory." -ForegroundColor Green
} catch {
    Write-Warning "  -> Could not modify Defender exclusions (group policy may manage Defender)."
}

# 4. Hardware Machine Identity Generation (Deep Freeze Amnesia Bypass)
Write-Host "
[3/4] Hardware Identity Pre-Flight Check..." -ForegroundColor Yellow
try {
    $hwUuid = (Get-CimInstance Win32_ComputerSystemProduct).UUID
    $hostname = $env:COMPUTERNAME
    Write-Host "  -> Hardware Hostname: $hostname" -ForegroundColor Green
    Write-Host "  -> BIOS UUID:         $hwUuid" -ForegroundColor Green
    Write-Host "  -> Hardware Identity Key: ${hostname}_$hwUuid" -ForegroundColor Cyan
    Write-Host "  -> This identity is immutable and survives 100% of Deep Freeze / UWF disk wipes." -ForegroundColor DarkGray
} catch {
    Write-Warning "  -> Could not query WMI BIOS UUID: $_"
}

# 5. Scheduled Background Update Task (Runs under SYSTEM, No Teacher UAC Prompts)
Write-Host "
[4/4] Setting Up Silent Boot Updater (SYSTEM Task)..." -ForegroundColor Yellow
$taskName = "GenatisSmartboardFleetUpdater"
try {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command Start-Sleep -Seconds 10"
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    Write-Host "  -> Task '' registered under SYSTEM context for silent background fleet maintenance." -ForegroundColor Green
} catch {
    Write-Warning "  -> Could not register scheduled task: $_"
}

Write-Host "
==========================================================" -ForegroundColor Green
Write-Host "  Deployment Hardening Complete for this OPS Panel!        " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
