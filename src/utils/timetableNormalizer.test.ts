import { describe, it, expect } from 'vitest';
import {
  normalizeSectionName,
  toSectionId,
  normalizeSubject,
  normalizeTeacherName,
  getSetRotationNotice,
  normalizeTime,
  normalizeSchedule
} from './timetableNormalizer';

describe('timetableNormalizer dictionary', () => {
  describe('Teacher Names', () => {
    it('expands all teacher abbreviations accurately', () => {
      expect(normalizeTeacherName('Saur')).toBe('Saurabh');
      expect(normalizeTeacherName('IR')).toBe('Innareddy');
      expect(normalizeTeacherName('AR')).toBe('Archana');
      expect(normalizeTeacherName('PR')).toBe('Prashant');
      expect(normalizeTeacherName('SON')).toBe('Sonali');
      expect(normalizeTeacherName('SH')).toBe('Shailaja');
      expect(normalizeTeacherName('SUP')).toBe('Supratim');
      expect(normalizeTeacherName('SUPR')).toBe('Supratim');
      expect(normalizeTeacherName('Mdv')).toBe('Madhavi');
      expect(normalizeTeacherName('MADH')).toBe('Madhavi');
      expect(normalizeTeacherName('M')).toBe('Madhavi');
      expect(normalizeTeacherName('Sn')).toBe('Sneha');
      expect(normalizeTeacherName('Prasad')).toBe('Prasad');
      expect(normalizeTeacherName('Avi')).toBe('Avinash');
      expect(normalizeTeacherName('PRUT')).toBe('Pruthvi');
      expect(normalizeTeacherName('PRUTH')).toBe('Pruthvi');
      expect(normalizeTeacherName('Prud')).toBe('Pruthvi');
      expect(normalizeTeacherName('Nee')).toBe('Neelima');
      expect(normalizeTeacherName('SWR')).toBe('Swarna');
      expect(normalizeTeacherName('SWAR')).toBe('Swarna');
      expect(normalizeTeacherName('Kiran')).toBe('Kiran');
      expect(normalizeTeacherName('NEHA')).toBe('Neha');
      expect(normalizeTeacherName('Abd')).toBe('Abdul');
      expect(normalizeTeacherName('Sandy')).toBe('Sandy');
      expect(normalizeTeacherName('Sanc')).toBe('Sanchita');
      expect(normalizeTeacherName('Shailaja')).toBe('Shailaja');
    });

    it('expands slash combined teacher codes', () => {
      expect(normalizeTeacherName('SAUR/IR')).toBe('Saurabh / Innareddy');
      expect(normalizeTeacherName('AR/PR')).toBe('Archana / Prashant');
      expect(normalizeTeacherName('SON/SH')).toBe('Sonali / Shailaja');
      expect(normalizeTeacherName('Sandy/Sh')).toBe('Sandy / Shailaja');
      expect(normalizeTeacherName('Sanc/Sh')).toBe('Sanchita / Shailaja');
    });
  });

  describe('Subject & Activity Rules', () => {
    it('returns empty subject for empty or whitespace input without forcing Period', () => {
      expect(normalizeSubject('').subject).toBe('');
      expect(normalizeSubject('   ').subject).toBe('');
    });

    it('expands language and grammar rules', () => {
      expect(normalizeSubject('Lang').subject).toBe('2nd Language');
      expect(normalizeSubject('3RD LANG').subject).toBe('3rd Language');
      expect(normalizeSubject('Eng gr').subject).toBe('English Grammar');
      expect(normalizeSubject('Math pr').subject).toBe('Math Practice');
      expect(normalizeSubject('Concept Check Kalpa').subject).toBe('N/A');
      expect(normalizeSubject('Performing').subject).toBe('Performing Activity');
      expect(normalizeSubject('SM COLLABORATIVE INTERACTIONS').subject).toBe('Collaboration');
      expect(normalizeSubject('PT').subject).toBe('PT');
    });

    it('handles slashed / combined subject rules', () => {
      const chemRes = normalizeSubject('CHEM Nee/Eco wr');
      expect(chemRes.subject).toBe('Chemistry');
      expect(chemRes.inferredTeacher).toBe('Neelima');

      const bioRes = normalizeSubject('BIO KIR/Eco');
      expect(bioRes.subject).toBe('Biology');
      expect(bioRes.inferredTeacher).toBe('Kiran');

      const phyRes = normalizeSubject('PHY PRUTH/ ECO');
      expect(phyRes.subject).toBe('Physics');
      expect(phyRes.inferredTeacher).toBe('Pruthvi');

      const mathRes = normalizeSubject('MATH MADH/ EVS');
      expect(mathRes.subject).toBe('Mathematics');
      expect(mathRes.inferredTeacher).toBe('Madhavi');
    });

    it('handles Sports Sets, Performing/Quiz activities and their notices', () => {
      expect(normalizeSubject('SET - A (BOYS)').subject).toBe('Sports (Set A)');
      expect(normalizeSubject('SET - B').subject).toBe('Sports (Set B)');
      expect(normalizeSubject('SET - C (BOYS)').subject).toBe('Sports (Set C)');
      expect(normalizeSubject('Performing').subject).toBe('Performing Activity');
      expect(normalizeSubject('Quiz / Movie Time').subject).toBe('Performing Activity');

      const setANotice = getSetRotationNotice('Sports (Set A)');
      expect(setANotice).toContain('Sports: Cricket, Table Tennis, Carroms, Chess, Archery');
      expect(setANotice).toContain('Group A: 3rd Language');
      expect(setANotice).toContain('Group B: English Grammar');
      expect(setANotice).toContain('Group C: Math Practice');

      const setBNotice = getSetRotationNotice('Sports (Set B)');
      expect(setBNotice).toContain('Sports: Football, Kho Kho, Volleyball, Handball');
      expect(setBNotice).toContain('Group A: Math Practice');
      expect(setBNotice).toContain('Group B: 3rd Language');
      expect(setBNotice).toContain('Group C: English Grammar');

      const setCNotice = getSetRotationNotice('Sports (Set C)');
      expect(setCNotice).toContain('Sports: Basketball, Hockey, Athletics, Karate');
      expect(setCNotice).toContain('Group A: English Grammar');
      expect(setCNotice).toContain('Group B: Math Practice');
      expect(setCNotice).toContain('Group C: 3rd Language');

      const performingNotice = getSetRotationNotice('Performing Activity');
      expect(performingNotice).toBeDefined();
      expect(performingNotice).toContain('Boys: Performing Activity');
      expect(performingNotice).toContain('Girls: Quiz / Movie Time / Journal Writing');
    });
  });

  describe('normalizeTime', () => {
    it('normalizes dot and colon morning times', () => {
      expect(normalizeTime('09:10')).toBe('09:10');
      expect(normalizeTime('9:40')).toBe('09:40');
      expect(normalizeTime('9.10')).toBe('09:10');
      expect(normalizeTime('9.40')).toBe('09:40');
      expect(normalizeTime('10.15')).toBe('10:15');
      expect(normalizeTime('11:55')).toBe('11:55');
    });

    it('converts afternoon school hours to 24h format', () => {
      expect(normalizeTime('12:30')).toBe('12:30');
      expect(normalizeTime('1:15')).toBe('13:15');
      expect(normalizeTime('01:15')).toBe('13:15');
      expect(normalizeTime('1.20')).toBe('13:20');
      expect(normalizeTime('2.05')).toBe('14:05');
      expect(normalizeTime('02:05')).toBe('14:05');
    });

    it('handles explicit AM/PM tags', () => {
      expect(normalizeTime('9:10 AM')).toBe('09:10');
      expect(normalizeTime('12:30 PM')).toBe('12:30');
      expect(normalizeTime('1:15 PM')).toBe('13:15');
      expect(normalizeTime('2:05 PM')).toBe('14:05');
    });

    it('extracts start time if a range string is passed directly', () => {
      expect(normalizeTime('09:10 - 09:40')).toBe('09:10');
      expect(normalizeTime('10:15 to 10:50')).toBe('10:15');
    });
  });

  describe('normalizeSchedule with set notices and extracted timings', () => {
    it('attaches setNotice to Sports Sets and Performing Activity in schedule', () => {
      const raw = {
        Tuesday: [
          { subject: 'SET - C (BOYS)', startTime: '9.10', endTime: '10.10' },
          { subject: 'MATH MADH', startTime: '11.25', endTime: '12.25' }
        ],
        Wednesday: [
          { subject: 'Performing', startTime: '9.40', endTime: '10.10' }
        ]
      };
      const result = normalizeSchedule(raw, 'W1');
      const tuesday = result.sections['grade9-whiz1']?.Tuesday;
      expect(tuesday).toBeDefined();
      expect(tuesday?.[0]?.subject).toBe('Sports (Set C)');
      expect(tuesday?.[0]?.setNotice).toBeDefined();
      expect(tuesday?.[0]?.setNotice).toContain('Sports: Basketball, Hockey, Athletics, Karate');
      expect(tuesday?.[0]?.setNotice).toContain('Group A: English Grammar');
      expect(tuesday?.[1]?.subject).toBe('Mathematics');
      expect(tuesday?.[1]?.teacher).toBe('Madhavi');

      const wednesday = result.sections['grade9-whiz1']?.Wednesday;
      expect(wednesday).toBeDefined();
      expect(wednesday?.[0]?.subject).toBe('Performing Activity');
      expect(wednesday?.[0]?.setNotice).toBeDefined();
      expect(wednesday?.[0]?.setNotice).toContain('Boys: Performing Activity');
      expect(wednesday?.[0]?.setNotice).toContain('Girls: Quiz / Movie Time / Journal Writing');
    });

    it('extracts startTime and endTime from period time range strings (OCR output)', () => {
      const raw = {
        Monday: [
          { period: 2, time: '09:40 - 10:10', subject: 'PHY Avi' },
          { period: 1, time: '09:10 - 09:40', subject: 'PHY Avi' },
          { period: 3, time: '10:15 - 10:50', subject: 'Elective' },
          { period: 6, time: '12:30 - 1:15', subject: 'ENG Latika' },
          { period: 7, time: '1:20 to 2:05', subject: 'CHEM Nee' }
        ]
      };
      const result = normalizeSchedule(raw, 'Whiz 1');
      const monday = result.sections['grade9-whiz1']?.Monday;
      expect(monday).toBeDefined();
      expect(monday).toHaveLength(5);

      // Period 1 should be first after chronological sort
      expect(monday?.[0]?.startTime).toBe('09:10');
      expect(monday?.[0]?.endTime).toBe('09:40');
      expect(monday?.[0]?.subject).toBe('Physics');
      expect(monday?.[0]?.teacher).toBe('Avinash');

      // Period 2
      expect(monday?.[1]?.startTime).toBe('09:40');
      expect(monday?.[1]?.endTime).toBe('10:10');

      // Period 3
      expect(monday?.[2]?.startTime).toBe('10:15');
      expect(monday?.[2]?.endTime).toBe('10:50');

      // Period 6: 12:30 - 13:15
      expect(monday?.[3]?.startTime).toBe('12:30');
      expect(monday?.[3]?.endTime).toBe('13:15');
      expect(monday?.[3]?.teacher).toBe('Latika');

      // Period 7: 13:20 - 14:05
      expect(monday?.[4]?.startTime).toBe('13:20');
      expect(monday?.[4]?.endTime).toBe('14:05');
      expect(monday?.[4]?.teacher).toBe('Neelima');
    });
  });
});
