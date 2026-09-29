import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import {
  solveTeacherAbsenceMatrix,
  allocateSingleProxy,
  Section,
  Teacher,
  AbsenceRequest,
  SectionPeriod
} from './proxySolver';

describe('Category 2 - Constraint-Solver & Algorithmic Stress', () => {
  // Test 1: Extreme Absence Cascade
  it('Test 1: Extreme Absence Cascade - resolves 25% absence across 35 sections in < 15ms', () => {
    // Generate 35 Sections, 8 periods each = 280 slots
    const sections: Section[] = Array.from({ length: 35 }, (_, sIndex) => ({
      id: `sec-${sIndex + 1}`,
      name: `Class-${sIndex + 1}`,
      periods: Array.from({ length: 8 }, (_, pIndex) => ({
        sectionId: `sec-${sIndex + 1}`,
        periodNumber: pIndex + 1,
        startTime: `${8 + pIndex}:00`,
        endTime: `${8 + pIndex}:45`,
        subject: ['Math', 'Physics', 'Chemistry', 'English', 'Biology'][pIndex % 5],
        assignedTeacherId: `teacher-${((sIndex * 8 + pIndex) % 40) + 1}`
      }))
    }));

    // Pool of 40 teachers
    const teachers: Teacher[] = Array.from({ length: 40 }, (_, tIndex) => ({
      id: `teacher-${tIndex + 1}`,
      name: `Teacher ${tIndex + 1}`,
      historicalProxyCount: (tIndex * 3) % 15,
      qualifiedSubjects: ['Math', 'Physics', 'Chemistry', 'English', 'Biology'],
      maxDailyPeriods: 8,
      currentDailyLoad: 2
    }));

    // 25% faculty absent = 10 teachers
    const absentTeacherIds = Array.from({ length: 10 }, (_, i) => `teacher-${i + 1}`);
    const absencePayload: AbsenceRequest = {
      date: '2026-09-30',
      absentTeacherIds
    };

    const tStart = performance.now();
    const resolution = solveTeacherAbsenceMatrix(sections, teachers, absencePayload);
    const duration = performance.now() - tStart;

    // SLA: Execution time must be < 15ms
    expect(duration).toBeLessThan(15.0);

    // Validation: slots handled cleanly
    expect(resolution.totalUncoveredSlots).toBeGreaterThan(0);
    expect(resolution.assignments.length).toBe(resolution.resolvedCount);
    for (const assignment of resolution.assignments) {
      expect(absentTeacherIds).not.toContain(assignment.substituteTeacherId);
      expect(assignment.substituteTeacherId).toBeTruthy();
    }
  });

  // Test 2: Deterministic Fuzzing
  it('Test 2: Deterministic Fuzzing - guarantees identical output across 5,000 runs using SHA-256', () => {
    const fixedSections: Section[] = Array.from({ length: 10 }, (_, s) => ({
      id: `sec-${s}`,
      name: `Grade-${s}`,
      periods: Array.from({ length: 6 }, (_, p) => ({
        sectionId: `sec-${s}`,
        periodNumber: p + 1,
        startTime: `0${8 + p}:00`,
        endTime: `0${8 + p}:45`,
        subject: p % 2 === 0 ? 'Mathematics' : 'Science',
        assignedTeacherId: `T-${(s + p) % 12}`
      }))
    }));

    const fixedTeachers: Teacher[] = Array.from({ length: 12 }, (_, t) => ({
      id: `T-${t}`,
      name: `Faculty-${t}`,
      historicalProxyCount: t % 4,
      qualifiedSubjects: ['Mathematics', 'Science'],
      maxDailyPeriods: 6,
      currentDailyLoad: 2
    }));

    const fixedAbsence: AbsenceRequest = {
      date: '2026-10-01',
      absentTeacherIds: ['T-0', 'T-2', 'T-5']
    };

    const hashSet = new Set<string>();

    for (let i = 0; i < 5000; i++) {
      const result = solveTeacherAbsenceMatrix(fixedSections, fixedTeachers, fixedAbsence);
      const serialized = JSON.stringify(result.assignments);
      const hash = createHash('sha256').update(serialized).digest('hex');
      hashSet.add(hash);
    }

    // Must be 100% deterministic: precisely 1 unique SHA-256 hash across 5,000 executions
    expect(hashSet.size).toBe(1);
  });

  // Test 3: The Fairness Ledger Attack
  it('Test 3: The Fairness Ledger Attack - mathematically forces allocation to least-burdened Teacher B', () => {
    const periodToCover: SectionPeriod = {
      sectionId: 'sec-10A',
      periodNumber: 3,
      startTime: '10:00',
      endTime: '10:45',
      subject: 'History',
      assignedTeacherId: 'T-ABSENT'
    };

    const teacherA: Teacher = {
      id: 'T-A',
      name: 'Teacher A',
      historicalProxyCount: 14, // heavily burdened
      qualifiedSubjects: ['History'],
      maxDailyPeriods: 6,
      currentDailyLoad: 2
    };

    const teacherB: Teacher = {
      id: 'T-B',
      name: 'Teacher B',
      historicalProxyCount: 2, // low burden
      qualifiedSubjects: ['History'],
      maxDailyPeriods: 6,
      currentDailyLoad: 2
    };

    const candidatePool = [teacherA, teacherB];
    const assignedSubstitute = allocateSingleProxy(periodToCover, candidatePool);

    // Assert strictly assigned to Teacher B
    expect(assignedSubstitute.id).toBe('T-B');
    expect(assignedSubstitute.id).not.toBe('T-A');
  });
});
