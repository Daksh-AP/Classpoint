<div align="center">

# Classora
### Ambient Classroom Intelligence & Smartboard Operating System

<img src="https://img.shields.io/badge/status-active-success?style=for-the-badge&logo=electron&logoColor=white" alt="Status">
<img src="https://img.shields.io/badge/platform-Windows%20Smartboard-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Platform">
<img src="https://img.shields.io/badge/security-Enterprise%20Multi--Tenant-blueviolet?style=for-the-badge&logo=shield" alt="Security">

<br />
<br />

> **Classora** is an ambient operating system designed specifically for school interactive smartboards and classroom displays. It bridges real-time lesson continuity, automatic schedule intelligence, and instant teacher-student context synchronization across rotating periods.

</div>

<br />

---

## 🌟 The Classora Ecosystem

Classora connects every layer of the school day into a single unified continuity graph:

```
                  ┌──────────────────────────────┐
                  │    Classora Admin Console    │
                  │ (Fleet, Rosters & Governance)│
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Classora Board  │    │  Classora Staff  │    │ Classora Parent  │
│(Smartboard OS)  │◄──►│  (Teacher Mobile)│    │ (Parent Portal)  │
└─────────────────┘    └──────────────────┘    └──────────────────┘
         ▲                                               ▲
         └───────────────────────┴───────────────────────┘
                     Real-Time Classroom Graph
```

* **Classora Board (Desktop)**: The central classroom hub running on classroom smartboards, managing daily timetables, pinned classroom sections, live open loops, and contextual handovers.
* **Classora Staff (Teacher Mobile)**: Instant period-by-period mobile command for teachers to log lesson progress, flag student confusions, record attendance, and hand over class context.
* **Classora Parent Portal**: Real-time transparency for families, providing daily subject coverage, student attendance records, school announcements, and targeted support.
* **Classora Admin Portal**: Institutional fleet administration, multi-grade timetable scheduling, roster synchronization, substitute delegation, and emergency broadcasts.

<br />

---

## ⚡ Core Capabilities

### 1. Subject Continuity & Live Context Handovers
Eliminate the 10-minute transition loss when teachers swap classrooms. As soon as a teacher steps into the room, Classora automatically loads:
* **Last Topic Covered**: Exact chapter, theorem, or unit completed in the prior session.
* **Open Loops & Student Confusions**: Unresolved questions or misconceptions flagged by the previous teacher for immediate follow-up.
* **Next Session Objectives**: Transparent roadmap for the incoming educator.

### 2. Student Absence Impact Intelligence
Absences are no longer a black box. When a teacher marks a student absent, Classora matches attendance with the specific lesson topic taught during that exact period. Incoming teachers and parents receive targeted impact notifications highlighting concepts the student missed.

### 3. Room-Locked Display Security
Smartboards are physically assigned to designated classrooms (e.g., *Grade 9 Whiz 1*). Classora enforces strict section-locking on board accounts:
* Prevents students or unintended users from altering room configurations or switching classroom streams.
* Administrative PIN-scrambled authentication protects sensitive settings, timetable edits, and contextual records.

### 4. Ambient Schedule Automation & Class Transitions
* **Real-Time Countdown & Indicator**: Subtle, non-intrusive indicators inform teachers and students of period progress, recess, and period ends.
* **Automated Audio Chimes**: Smooth ambient period alerts designed for modern learning environments.
* **Smart Dock**: Quick-access tools auto-hide during instruction to keep the board clean, reappearing intuitively when needed.

### 5. Unified Classroom Workspace
* **Interactive Whiteboard**: Touch-optimized multi-tool digital canvas for diagrams, annotations, and quick illustrations.
* **Integrated Resource Hub**: Instant access to curriculum files, PDF readers, educational videos, and shared documents.
* **In-Class Timer & Focus Tools**: High-contrast, presentation-ready timers and stopwatches for exams, group activities, and discussions.

<br />

---

## 🔒 Enterprise & Multi-Tenant Architecture

* **Tenant Isolation**: High-security, multi-tenant cloud infrastructure partitioned by school IDs (`schools/{schoolId}/...`).
* **Real-Time Synchronization**: Instant bidirectional updates between Smartboard displays and mobile teacher devices.
* **Offline Resilience**: Offline caching ensures classrooms stay operational even through unstable campus network connectivity.
* **Role-Based Access Control**: Strict permissions separate student viewers, teachers, grade heads, and school principals.

<br />

---

<div align="center">
    <p><b>Classora</b> — Engineered for seamless learning continuity.</p>
</div>