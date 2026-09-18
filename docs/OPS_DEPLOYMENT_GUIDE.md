# 80-Smartboard OPS Deployment & Morning Boot Hardening Guide

## Overview
In an 80-section school deployment, all 80 smartboards power on simultaneously between 7:50 AM and 8:05 AM. Without proper hardware and network safeguards, this creates severe contention:
1. **Local Wi-Fi Congestion**: 80 simultaneous DHCP, DNS, and TLS handshakes exhaust router tables and drop packets.
2. **Backend Storms**: 80 instances querying Firestore at the exact same millisecond cause throttled queries and billing surges.
3. **Windows Cold-Boot Hogging**: Windows Defender scans (`MsMpEng.exe`) and Windows Update Orchestrator consume 100% CPU on budget OPS modules right as teachers walk in.

This document outlines the architectural safeguards built into ClassPoint / Genatis Board and instructions for school IT administrators.

---

## 1. Zero-Network Stale-While-Revalidate Boot (<500ms)
- **Local Cache First**: The application initializes state from local storage (`cached_genatis_user`, `timetableData`, `school_students_${sectionId}`) synchronously on line 1.
- **Immediate Paint**: If cached data is present, the splash screen (`GenatisSpark`) exits within 200ms, rendering the teacher's schedule, tools, and student roster in under 500ms even if Wi-Fi is completely down.
- **Silent Background Revalidation**: Network queries run asynchronously in the background. If cloud data has changed, the UI updates smoothly without blocking user interaction or throwing error modals.

---

## 2. Randomized Startup Jitter (5s – 35s)
- **Problem**: When 80 panels boot at 7:55 AM, immediate heartbeats and cloud syncs create a "Thundering Herd" DDoS attack against the school's access points.
- **Solution**: 
  - The initial device heartbeat write to Firestore is delayed by a randomized jitter:
    $$\text{Jitter} = \text{random}(5000\text{ms}, 35000\text{ms})$$
  - The 80 boards smooth their network handshakes into a gentle trickle across 30 seconds rather than an instantaneous spike.
  - Recurring heartbeats follow every 2 minutes thereafter.

---

## 3. Local Hardware-Bound Room Identity
- **Offline Resolution**: Smartboards can resolve their room identity (Grade & Section) completely offline without asking Firebase Auth or Firestore.
- **Supported Methods**:
  1. **Hostname Pattern**: Naming the Windows OPS box following patterns like `FKS-ROOM-9-WHIZ1`, `ROOM-6A`, or `BOARD-G9-WHIZ1`.
  2. **Local Configuration File**: Placing a `board-config.json` in `C:\GenatisData\board-config.json` (or `D:\GenatisData\board-config.json` on Deep Freeze ThawSpaces):
     ```json
     {
       "sectionId": "grade9-whiz1",
       "name": "Grade 9 Whiz 1",
       "grade": "grade9",
       "schoolId": "fks_main"
     }
     ```

---

## 4. Exponential Backoff with Retry Jitter
- **Network Resilience**: TanStack Query is configured with exponential backoff and randomized retry jitter:
  $$\text{Retry Delay} = \min(2^{\text{attempt}} \times 1000\text{ms} + \text{random}(0, 2000\text{ms}), 30000\text{ms})$$
- **Silent Error Handling**: Temporary Wi-Fi disconnects and DNS drops do NOT trigger alarming red error toasts or popups. Attendance records and settings changes are written immediately to the local Firestore multi-tab IndexedDB cache and sync when connectivity returns.

---

## 5. Windows Background Task & CPU Hogging Prevention
To ensure OPS modules (typically Intel i3/Celeron with 8GB RAM) boot smoothly without CPU pegging:

### A. 10-Second Post-Boot Delayed Launch
Do NOT use the standard Windows Registry Run key (`openAtLogin`). Use the provided automated installer:
1. Open PowerShell as Administrator in `apps/desktop/scripts`.
2. Run:
   ```cmd
   .\install-ops-autostart.bat
   ```
   *Or via elevated PowerShell:*
   ```powershell
   .\deploy-school-fleet.ps1
   ```
   This registers a Windows Scheduled Task (`ClassPointSmartboardDelayedLaunch`) that delays app launch by **10 seconds post-logon**, giving Windows Wi-Fi drivers, 802.1x enterprise certificates, and display scaling services time to settle.

### B. Windows Update Active Hours (Group Policy)
Configure Group Policy or Registry to restrict Windows Updates to evening hours:
```powershell
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "SetActiveHours" -Value 1 -Type DWord
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "ActiveHoursStart" -Value 8 -Type DWord  # 8:00 AM
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "ActiveHoursEnd" -Value 17 -Type DWord   # 5:00 PM
```

### C. Windows Defender Exclusions
Exclude application and data directories from real-time scanning to reduce cold-boot disk contention:
```powershell
Add-MpPreference -ExclusionPath "C:\GenatisData", "D:\GenatisData", "C:\Program Files\Genatis Board"
Add-MpPreference -ExclusionProcess "ClassPoint.exe", "genatis-board.exe"
```
