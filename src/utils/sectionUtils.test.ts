import { describe, it, expect } from 'vitest';
import { resolveAccountSection, matchesSectionAndGrade } from './sectionUtils';

describe('resolveAccountSection', () => {
  it('returns null if user is null or undefined', () => {
    expect(resolveAccountSection(null)).toBeNull();
    expect(resolveAccountSection(undefined)).toBeNull();
  });

  it('returns null if user has no assigned sections or grade (e.g. admin)', () => {
    const adminUser = {
      uid: 'admin_123',
      role: 'admin',
      email: 'admin@school.com',
    };
    expect(resolveAccountSection(adminUser)).toBeNull();
  });

  it('correctly resolves a board account with assignedSections and grade', () => {
    const boardUser = {
      uid: 'board_g9_whiz1',
      role: 'board',
      grade: '9',
      assignedSections: ['whiz1'],
      email: 'board_grade9_whiz1@genatis.com',
    };
    const section = resolveAccountSection(boardUser);
    expect(section).toEqual({
      id: 'grade9-whiz1',
      name: 'Grade 9 Whiz 1',
      grade: 'grade9',
      type: 'Whiz',
      number: 1,
    });
  });

  it('resolves board account with super section', () => {
    const boardUser = {
      uid: 'board_g10_super2',
      role: 'board',
      grade: 10,
      assignedSections: ['super2'],
    };
    const section = resolveAccountSection(boardUser);
    expect(section).toEqual({
      id: 'grade10-super2',
      name: 'Grade 10 Super 2',
      grade: 'grade10',
      type: 'Super',
      number: 2,
    });
  });

  it('resolves account where assignedSections has full id like grade9-whiz1', () => {
    const user = {
      uid: 'teacher_1',
      assignedSections: ['grade9-whiz1'],
    };
    const section = resolveAccountSection(user);
    expect(section).toEqual({
      id: 'grade9-whiz1',
      name: 'Grade 9 Whiz 1',
      grade: 'grade9',
      type: 'Whiz',
      number: 1,
    });
  });

  it('resolves account from email pattern if assignedSections is empty', () => {
    const user = {
      uid: 'board_g9_whiz1',
      email: 'board_grade9_whiz1@genatis.com',
    };
    const section = resolveAccountSection(user);
    expect(section).toEqual({
      id: 'grade9-whiz1',
      name: 'Grade 9 Whiz 1',
      grade: 'grade9',
      type: 'Whiz',
      number: 1,
    });
  });

  it('normalizes already-formed assignedSection object', () => {
    const user = {
      assignedSection: {
        id: 'grade9-whiz1',
        name: 'Grade 9 Whiz 1',
        grade: '9',
        type: 'whiz',
        number: '1',
      },
    };
    const section = resolveAccountSection(user);
    expect(section).toEqual({
      id: 'grade9-whiz1',
      name: 'Grade 9 Whiz 1',
      grade: 'grade9',
      type: 'Whiz',
      number: 1,
    });
  });
});

describe('matchesSectionAndGrade', () => {
  const desktopSection = {
    id: 'grade9-whiz1',
    name: 'Grade 9 Whiz 1',
    grade: 'grade9',
    type: 'Whiz',
    number: 1,
  };

  it('matches mobile-submitted context with numeric grade and raw section ID', () => {
    const mobileDoc = {
      id: '9_whiz1_Math',
      gradeId: '9',
      sectionId: 'whiz1',
      subject: 'Math',
    };
    expect(matchesSectionAndGrade(mobileDoc, desktopSection)).toBe(true);
  });

  it('matches mobile-submitted context with grade9_whiz1 underscore format', () => {
    const mobileDoc = {
      id: 'grade9_whiz1_Physics',
      gradeId: '9',
      sectionId: 'grade9_whiz1',
      subject: 'Physics',
    };
    expect(matchesSectionAndGrade(mobileDoc, desktopSection)).toBe(true);
  });

  it('matches desktop-submitted context with exact matches', () => {
    const desktopDoc = {
      id: 'grade9_grade9-whiz1_Chemistry',
      gradeId: 'grade9',
      sectionId: 'grade9-whiz1',
      subject: 'Chemistry',
    };
    expect(matchesSectionAndGrade(desktopDoc, desktopSection)).toBe(true);
  });

  it('does not match a different section in the same grade', () => {
    const otherSectionDoc = {
      id: '9_super1_Math',
      gradeId: '9',
      sectionId: 'super1',
      subject: 'Math',
    };
    expect(matchesSectionAndGrade(otherSectionDoc, desktopSection)).toBe(false);
  });

  it('does not match a different grade with same section type/number', () => {
    const otherGradeDoc = {
      id: '10_whiz1_Math',
      gradeId: '10',
      sectionId: 'whiz1',
      subject: 'Math',
    };
    expect(matchesSectionAndGrade(otherGradeDoc, desktopSection)).toBe(false);
  });

  it('returns false for null item or null section', () => {
    expect(matchesSectionAndGrade(null, desktopSection)).toBe(false);
    expect(matchesSectionAndGrade({ gradeId: '9' }, null)).toBe(false);
  });
});
