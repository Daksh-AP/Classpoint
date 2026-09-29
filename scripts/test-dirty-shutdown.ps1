# scripts/test-dirty-shutdown.ps1
# Simulates dirty shutdown / power cut mid-write and validates SQLite WAL recovery

param(
    [string]$DbPath = "$env:TEMP\genatis_wal_test.db"
)

Write-Host "--- CATEGORY 5: TEST 1 - DIRTY SHUTDOWN WAL RECOVERY ---" -ForegroundColor Cyan

# Remove old test DB if present
Remove-Item "$DbPath*" -Force -ErrorAction SilentlyContinue

# 1. Initialize SQLite Database in WAL mode via Python sqlite3
python -c @"
import sqlite3
con = sqlite3.connect(r'$DbPath')
con.execute('PRAGMA journal_mode=WAL;')
con.execute('PRAGMA synchronous=NORMAL;')
con.execute('CREATE TABLE IF NOT EXISTS AttendanceLedger (id TEXT PRIMARY KEY, studentId TEXT, status TEXT, timestamp TEXT);')
con.commit()
con.close()
"@

Write-Host "Initialized SQLite database with PRAGMA journal_mode=WAL."

# 2. Launch background process executing intensive continuous transactions
$workerScript = @"
import sqlite3, uuid, time
con = sqlite3.connect(r'$DbPath')
con.execute('PRAGMA journal_mode=WAL;')
for i in range(100000):
    uid = str(uuid.uuid4())
    con.execute('INSERT INTO AttendanceLedger VALUES (?, ?, ?, ?)', (uid, f'STU-{i}', 'PRESENT', str(time.time())))
    if i % 50 == 0:
        con.commit()
con.close()
"@

$workerProcess = Start-Process -FilePath "python" -ArgumentList "-c `"$workerScript`"" -PassThru

# Let write transactions saturate the WAL journal
Start-Sleep -Milliseconds 600

# 3. Force-kill the writing process (simulating brownout / dirty shutdown)
Write-Host "Forcefully terminating process PID $($workerProcess.Id) during active WAL commit..." -ForegroundColor Yellow
Stop-Process -Id $workerProcess.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

# 4. Perform SQLite integrity checks
$checkScript = @"
import sqlite3
try:
    con = sqlite3.connect(r'$DbPath')
    cur = con.cursor()
    cur.execute('PRAGMA integrity_check;')
    integrity = cur.fetchone()[0]
    cur.execute('PRAGMA quick_check;')
    quick = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM AttendanceLedger;')
    row_count = cur.fetchone()[0]
    con.close()
    print(f'INTEGRITY={integrity};QUICK={quick};ROWS={row_count}')
except Exception as e:
    print(f'ERROR={e}')
"@

$result = python -c "$checkScript"
Write-Host "Integrity Check Output: $result"

if ($result -match "INTEGRITY=ok;QUICK=ok" -and $result -match "ROWS=\d+") {
    Write-Host "[PASS] SQLite WAL journal recovered cleanly from dirty shutdown with zero corruption." -ForegroundColor Green
    # Clean up
    Remove-Item "$DbPath*" -Force -ErrorAction SilentlyContinue
    exit 0
} else {
    Write-Error "[FAIL] SQLite database corruption detected after dirty shutdown."
    exit 1
}
