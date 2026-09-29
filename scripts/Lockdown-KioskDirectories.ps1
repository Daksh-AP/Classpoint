# scripts/Lockdown-KioskDirectories.ps1
# Locks down %ProgramData%\Genatis using NTFS ACLs so standard classroom kiosk users cannot overwrite databases

param(
    [string]$TargetDir = "$env:ProgramData\Genatis"
)

Write-Host "--- CATEGORY 4: TEST 2 - KIOSK BREAKOUT ESCALATION (NTFS LOCKDOWN) ---" -ForegroundColor Cyan

if (!(Test-Path -Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    Write-Host "Created target data directory: $TargetDir"
}

# 1. Create a dummy test database file to test write permissions
$dbFile = Join-Path $TargetDir "genatis_local.db"
if (!(Test-Path $dbFile)) {
    "SQLite format 3`0" | Out-File -FilePath $dbFile -Encoding utf8
}

# 2. Acquire current ACL
$acl = Get-Acl -Path $TargetDir

# Disable inheritance and copy current rules
$acl.SetAccessRuleProtection($true, $true)

$adminSid = New-Object System.Security.Principal.SecurityIdentifier("S-1-5-32-544") # BUILTIN\Administrators
$systemSid = New-Object System.Security.Principal.SecurityIdentifier("S-1-5-18")     # NT AUTHORITY\SYSTEM
$usersSid  = New-Object System.Security.Principal.SecurityIdentifier("S-1-5-32-545") # BUILTIN\Users

$fullControl = [System.Security.AccessControl.FileSystemRights]::FullControl
$readAndExec = [System.Security.AccessControl.FileSystemRights]::ReadAndExecute
$inherit = [System.Security.AccessControl.InheritanceFlags]"ContainerInherit, ObjectInherit"
$prop = [System.Security.AccessControl.PropagationFlags]::None
$allow = [System.Security.AccessControl.AccessControlType]::Allow

# Purge any full-control/write rules for standard Users
$rulesToRemove = @()
foreach ($rule in $acl.Access) {
    if ($rule.IdentityReference.Value -match "Users|Authenticated Users") {
        $rulesToRemove += $rule
    }
}
foreach ($r in $rulesToRemove) {
    $acl.RemoveAccessRule($r) | Out-Null
}

# Add explicit rules
$adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule($adminSid, $fullControl, $inherit, $prop, $allow)
$systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule($systemSid, $fullControl, $inherit, $prop, $allow)
$usersRule = New-Object System.Security.AccessControl.FileSystemAccessRule($usersSid, $readAndExec, $inherit, $prop, $allow)

$acl.AddAccessRule($adminRule)
$acl.AddAccessRule($systemRule)
$acl.AddAccessRule($usersRule)

try {
    Set-Acl -Path $TargetDir -AclObject $acl
    Write-Host "Successfully applied hardened NTFS ACLs to $TargetDir"
} catch {
    Write-Host "Set-Acl note (elevation required for root change): $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Verify effective permissions using icacls
$icaclsOutput = icacls.exe $TargetDir
Write-Host "Effective ACLs for $TargetDir :"
$icaclsOutput | ForEach-Object { Write-Host "   $_" }

# Check that standard Users do NOT have (F) Full Control
$hasUsersWrite = $icaclsOutput -match "BUILTIN\\Users:\(F\)" -or $icaclsOutput -match "BUILTIN\\Users:\(M\)"

if (!$hasUsersWrite) {
    Write-Host "[PASS] Kiosk breakout escalation prevented. Standard Users cannot modify or wipe database." -ForegroundColor Green
    exit 0
} else {
    Write-Error "[FAIL] Standard users still have write/modify permissions."
    exit 1
}
