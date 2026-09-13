/**
 * Timetable and Schedule Normalizer
 * Recognizes school section acronyms (W1 -> Whiz 1, S1 -> Super 1),
 * expands teacher code acronyms (Saur -> Saurabh, IR -> Innareddy, etc.),
 * maps subject codes (Lang -> 2nd Language, 3RD LANG -> 3rd Language),
 * and handles multi-group rotational Set schedules.
 */

export const STREAM_PREFIX_MAP: Record<string, string> = {
  w: 'Whiz',
  s: 'Super',
  a: 'Alpha',
  b: 'Beta',
  d: 'Delta',
  g: 'Gamma',
};

export const COMMON_SECTION_ACRONYMS: Record<string, string> = {
  w1: 'Whiz 1',
  w2: 'Whiz 2',
  w3: 'Whiz 3',
  w4: 'Whiz 4',
  s1: 'Super 1',
  s2: 'Super 2',
  s3: 'Super 3',
  s4: 'Super 4',
  a1: 'Alpha 1',
  a2: 'Alpha 2',
  b1: 'Beta 1',
  b2: 'Beta 2',
  d1: 'Delta 1',
  d2: 'Delta 2',
};

export const TEACHER_NAME_MAP: Record<string, string> = {
  saur: 'Saurabh',
  saurabh: 'Saurabh',
  ir: 'Innareddy',
  innareddy: 'Innareddy',
  ar: 'Archana',
  archana: 'Archana',
  pr: 'Prashant',
  prashant: 'Prashant',
  son: 'Sonali',
  sonali: 'Sonali',
  sh: 'Shailaja',
  shailaja: 'Shailaja',
  sup: 'Supratim',
  supr: 'Supratim',
  supratim: 'Supratim',
  mdv: 'Madhavi',
  madh: 'Madhavi',
  m: 'Madhavi',
  madhavi: 'Madhavi',
  sn: 'Sneha',
  sneha: 'Sneha',
  prasad: 'Prasad',
  avi: 'Avinash',
  avinash: 'Avinash',
  prut: 'Pruthvi',
  pruth: 'Pruthvi',
  prud: 'Pruthvi',
  pruthvi: 'Pruthvi',
  nee: 'Neelima',
  neelima: 'Neelima',
  swr: 'Swarna',
  swar: 'Swarna',
  swarna: 'Swarna',
  kiran: 'Kiran',
  kir: 'Kiran',
  neha: 'Neha',
  abd: 'Abdul',
  abdul: 'Abdul',
  sandy: 'Sandy',
  sanc: 'Sanchita',
  sanchita: 'Sanchita',
  latika: 'Latika',
  pawan: 'Pawan',
  kalpa: 'Kalpana',
  kalpana: 'Kalpana',
  indu: 'Indu',
  sandeep: 'Sandeep',
};

export const SET_ROTATION_NOTICES: Record<string, string> = {
  // Sports Set A (Cricket, Table Tennis, Carroms, Chess, Archery)
  'sports (set a)': 'Sports: Cricket, Table Tennis, Carroms, Chess, Archery | Academic Rotation: Group A: 3rd Language (Innareddy / Prashant) | Group B: English Grammar (Sonali & Latika) | Group C: Math Practice (Madhavi / Sneha or Prasad)',
  'sports - set a': 'Sports: Cricket, Table Tennis, Carroms, Chess, Archery | Academic Rotation: Group A: 3rd Language (Innareddy / Prashant) | Group B: English Grammar (Sonali & Latika) | Group C: Math Practice (Madhavi / Sneha or Prasad)',
  'set a': 'Sports: Cricket, Table Tennis, Carroms, Chess, Archery | Academic Rotation: Group A: 3rd Language (Innareddy / Prashant) | Group B: English Grammar (Sonali & Latika) | Group C: Math Practice (Madhavi / Sneha or Prasad)',
  'set - a': 'Sports: Cricket, Table Tennis, Carroms, Chess, Archery | Academic Rotation: Group A: 3rd Language (Innareddy / Prashant) | Group B: English Grammar (Sonali & Latika) | Group C: Math Practice (Madhavi / Sneha or Prasad)',

  // Sports Set B (Football, Kho Kho, Volleyball, Handball)
  'sports (set b)': 'Sports: Football, Kho Kho, Volleyball, Handball | Academic Rotation: Group A: Math Practice (Madhavi / Sneha or Prasad) | Group B: 3rd Language (Innareddy / Prashant) | Group C: English Grammar (Sonali & Latika)',
  'sports - set b': 'Sports: Football, Kho Kho, Volleyball, Handball | Academic Rotation: Group A: Math Practice (Madhavi / Sneha or Prasad) | Group B: 3rd Language (Innareddy / Prashant) | Group C: English Grammar (Sonali & Latika)',
  'set b': 'Sports: Football, Kho Kho, Volleyball, Handball | Academic Rotation: Group A: Math Practice (Madhavi / Sneha or Prasad) | Group B: 3rd Language (Innareddy / Prashant) | Group C: English Grammar (Sonali & Latika)',
  'set - b': 'Sports: Football, Kho Kho, Volleyball, Handball | Academic Rotation: Group A: Math Practice (Madhavi / Sneha or Prasad) | Group B: 3rd Language (Innareddy / Prashant) | Group C: English Grammar (Sonali & Latika)',

  // Sports Set C (Basketball, Hockey, Athletics, Karate)
  'sports (set c)': 'Sports: Basketball, Hockey, Athletics, Karate | Academic Rotation: Group A: English Grammar (Sonali & Latika) | Group B: Math Practice (Madhavi / Sneha or Prasad) | Group C: 3rd Language (Innareddy / Prashant)',
  'sports - set c': 'Sports: Basketball, Hockey, Athletics, Karate | Academic Rotation: Group A: English Grammar (Sonali & Latika) | Group B: Math Practice (Madhavi / Sneha or Prasad) | Group C: 3rd Language (Innareddy / Prashant)',
  'set c': 'Sports: Basketball, Hockey, Athletics, Karate | Academic Rotation: Group A: English Grammar (Sonali & Latika) | Group B: Math Practice (Madhavi / Sneha or Prasad) | Group C: 3rd Language (Innareddy / Prashant)',
  'set - c': 'Sports: Basketball, Hockey, Athletics, Karate | Academic Rotation: Group A: English Grammar (Sonali & Latika) | Group B: Math Practice (Madhavi / Sneha or Prasad) | Group C: 3rd Language (Innareddy / Prashant)',

  // Performing Activity & Co-Curricular (Quiz / Movie Time / Journal Writing)
  'performing activity': 'Boys: Performing Activity | Girls: Quiz / Movie Time / Journal Writing (Rotates: Girls: Performing Activity | Boys: Quiz / Movie Time)',
  'performing': 'Boys: Performing Activity | Girls: Quiz / Movie Time / Journal Writing (Rotates: Girls: Performing Activity | Boys: Quiz / Movie Time)',
  'quiz': 'Boys: Performing Activity | Girls: Quiz / Movie Time / Journal Writing (Rotates: Girls: Performing Activity | Boys: Quiz / Movie Time)',
  'movie time': 'Boys: Performing Activity | Girls: Quiz / Movie Time / Journal Writing (Rotates: Girls: Performing Activity | Boys: Quiz / Movie Time)',
};

/**
 * Expands individual or slash/ampersand separated teacher codes
 * e.g. "SAUR/IR" -> "Saurabh / Innareddy", "SON/SH" -> "Sonali / Shailaja"
 */
export function normalizeTeacherName(input?: string): string {
  if (!input) return 'Staff';
  const trimmed = input.trim();
  if (!trimmed) return 'Staff';

  // Handle slashes e.g. "SAUR/IR", "AR/PR", "Sandy/Sh"
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').map(p => p.trim());
    const expanded = parts.map(p => {
      const lower = p.toLowerCase();
      return TEACHER_NAME_MAP[lower] || p;
    });
    return expanded.join(' / ');
  }

  // Handle ampersands e.g. "Sonali & Latika"
  if (trimmed.includes('&')) {
    const parts = trimmed.split('&').map(p => p.trim());
    const expanded = parts.map(p => {
      const lower = p.toLowerCase();
      return TEACHER_NAME_MAP[lower] || p;
    });
    return expanded.join(' & ');
  }

  // Handle single tokens e.g. "Avi", "PRUT", "Nee"
  const lower = trimmed.toLowerCase();
  if (TEACHER_NAME_MAP[lower]) {
    return TEACHER_NAME_MAP[lower]!;
  }

  return trimmed;
}

/**
 * Returns the assigned group rotation notice for Sports Sets or Performing/Quiz
 */
export function getSetRotationNotice(subject?: string): string | null {
  if (!subject) return null;
  const lower = subject.trim().toLowerCase();

  // Check Sports / Sets
  if (lower.includes('set a') || lower.includes('set - a')) {
    return SET_ROTATION_NOTICES['sports (set a)']!;
  }
  if (lower.includes('set b') || lower.includes('set - b')) {
    return SET_ROTATION_NOTICES['sports (set b)']!;
  }
  if (lower.includes('set c') || lower.includes('set - c')) {
    return SET_ROTATION_NOTICES['sports (set c)']!;
  }

  // Check Performing / Quiz rotation
  if (lower.includes('performing') || lower.includes('quiz') || lower.includes('movie time')) {
    return SET_ROTATION_NOTICES['performing activity']!;
  }

  return null;
}

/**
 * Normalizes section abbreviations (e.g. "W1" -> "Whiz 1", "S1" -> "Super 1")
 */
export function normalizeSectionName(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const lowerKey = trimmed.toLowerCase().replace(/[-_ ]/g, '');

  if (COMMON_SECTION_ACRONYMS[lowerKey]) {
    return COMMON_SECTION_ACRONYMS[lowerKey]!;
  }

  // Regex pattern for W1, S2, A3, etc.
  const match = trimmed.match(/^([wsabdgWSABDG])[-_ ]?(\d+)$/);
  if (match && match[1] && match[2]) {
    const prefix = match[1].toLowerCase();
    const num = match[2];
    const stream = STREAM_PREFIX_MAP[prefix];
    if (stream) {
      return stream + ' ' + num;
    }
  }

  // If already full form like "whiz 1", capitalize properly
  const streamMatch = trimmed.match(/^(whiz|super|alpha|beta|delta|gamma)[-_ ]?(\d+)$/i);
  if (streamMatch && streamMatch[1] && streamMatch[2]) {
    const stream = streamMatch[1].charAt(0).toUpperCase() + streamMatch[1].slice(1).toLowerCase();
    return stream + ' ' + streamMatch[2];
  }

  return trimmed;
}

/**
 * Derives section ID from grade and section name (e.g. 9, "Whiz 1" -> "grade9-whiz1")
 */
export function toSectionId(grade: string | number, sectionName: string): string {
  const cleanGrade = String(grade).replace(/\D/g, '') || '9';
  const normSection = normalizeSectionName(sectionName);
  const cleanSection = normSection.toLowerCase().replace(/[^a-z0-9]/g, '');
  return 'grade' + cleanGrade + '-' + cleanSection;
}

/**
 * Normalizes subject names based on the school's exact rules
 */
export function normalizeSubject(input: string): { subject: string; inferredTeacher?: string } {
  if (!input || !input.trim()) return { subject: '' };
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Sets: Specify it is Sports (Set A, Set B, Set C)
  if (lower.includes('set - a') || lower.includes('set a')) {
    return { subject: 'Sports (Set A)' };
  }
  if (lower.includes('set - b') || lower.includes('set b')) {
    return { subject: 'Sports (Set B)' };
  }
  if (lower.includes('set - c') || lower.includes('set c')) {
    return { subject: 'Sports (Set C)' };
  }

  // Slashed / Combined Subject Rules:
  // 1) CHEM Nee/Eco wr or CHEM Nee/Eco Sh -> Just leave as Chemistry
  if (lower.includes('chem') && lower.includes('eco')) {
    return { subject: 'Chemistry', inferredTeacher: 'Neelima' };
  }
  // 2) BIO KIR/Eco -> Biology
  if (lower.includes('bio') && lower.includes('eco')) {
    return { subject: 'Biology', inferredTeacher: 'Kiran' };
  }
  // PHY PRUTH/ ECO -> Physics
  if (lower.includes('phy') && lower.includes('eco')) {
    return { subject: 'Physics', inferredTeacher: 'Pruthvi' };
  }
  // 3) MATH MADH/ EVS -> Mathematics
  if (lower.includes('math') && lower.includes('evs')) {
    return { subject: 'Mathematics', inferredTeacher: 'Madhavi' };
  }

  // 1) Lang -> 2nd Language & 3RD LANG -> 3rd Language
  if (lower === '3rd lang' || lower.startsWith('3rd lang')) {
    return { subject: '3rd Language' };
  }
  if (lower === 'lang' || lower.startsWith('lang ') || lower.startsWith('lang/')) {
    return { subject: '2nd Language' };
  }

  // 2) Eng gr -> English Grammar
  if (lower === 'eng gr' || lower.startsWith('eng gr')) {
    return { subject: 'English Grammar' };
  }

  // 3) Math pr -> Math Practice
  if (lower === 'math pr' || lower.startsWith('math pr')) {
    return { subject: 'Math Practice' };
  }

  // 4) Concept Check -> Just leave as N/A
  if (lower.includes('concept check')) {
    return { subject: 'N/A' };
  }

  // 5) Performing / Quiz -> Performing Activity
  if (lower.includes('performing') || lower.includes('quiz') || lower.includes('movie time')) {
    return { subject: 'Performing Activity' };
  }

  // 6) SM Collaborative Interactions -> Collaboration
  if (lower.includes('collab') || lower.includes('collaborative')) {
    return { subject: 'Collaboration' };
  }

  // 7) Assembly / SLC / Cabinet
  if (lower.includes('cabinet') || lower.includes('slc')) {
    return { subject: 'SLC / Cabinet Meet' };
  }
  if (lower.includes('music assembly') || lower.includes('debate')) {
    return { subject: 'Music Assembly / Debate' };
  }

  // 8) PT -> keep as PT
  if (lower === 'pt' || lower.startsWith('pt ')) {
    return { subject: 'PT' };
  }

  // Standard subjects
  if (lower === 'mth' || lower === 'math' || lower === 'maths') return { subject: 'Mathematics' };
  if (lower === 'sci' || lower === 'science') return { subject: 'Science' };
  if (lower === 'phy' || lower === 'physics') return { subject: 'Physics' };
  if (lower === 'chem' || lower === 'chemistry') return { subject: 'Chemistry' };
  if (lower === 'bio' || lower === 'biology') return { subject: 'Biology' };
  if (lower === 'eng' || lower === 'english') return { subject: 'English' };
  if (lower === 'hist' || lower === 'his' || lower === 'history') return { subject: 'History' };
  if (lower === 'geo' || lower === 'geog' || lower === 'geography') return { subject: 'Geography' };
  if (lower === 'comp' || lower === 'cs') return { subject: 'Computer' };
  if (lower === 'elective') return { subject: 'Elective' };
  if (lower.includes('journal writing')) return { subject: 'Journal Writing' };

  // If compound format e.g. "MATH MADH", "PHY Avi", "BIO Kiran", "GEO Abd", "HIST Sandy", "MATH Sn", "CHEM SWAR"
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    const firstWord = words[0]!.toLowerCase();
    const rest = words.slice(1).join(' ');
    if (['math', 'mth', 'maths', 'phy', 'bio', 'chem', 'geo', 'hist', 'his', 'eng', 'lang'].includes(firstWord)) {
      const baseSubj = normalizeSubject(firstWord).subject;
      const teacher = normalizeTeacherName(rest);
      return { subject: baseSubj, inferredTeacher: teacher };
    }
  }

  return { subject: trimmed };
}

/**
 * Normalizes time string to 24-hour "HH:MM" format
 */
export function normalizeTime(input: string): string {
  if (!input) return '08:00';
  let t = input.trim().toUpperCase().replace(/\./g, ':');

  // If a range string was passed into normalizeTime, extract the start time
  if (/[-–—]|\bto\b/i.test(t)) {
    const parts = t.split(/\s*[-–—]\s*|\s+to\s+/i).map(s => s.trim()).filter(Boolean);
    if (parts[0]) t = parts[0];
  }

  // Match 12-hour format e.g. "8:30 AM", "01:15 PM", "9 AM"
  const ampmMatch = t.match(/^(\d{1,2})\s*(?::\s*(\d{2}))?\s*(AM|PM)$/);
  if (ampmMatch && ampmMatch[1]) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const isPM = ampmMatch[3] === 'PM';

    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;

    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  }

  // Match period formats like "9:10", "09:10", "9:40:00"
  const standardMatch = t.match(/^(\d{1,2})\s*:\s*(\d{2})(?::\d{2})?$/);
  if (standardMatch && standardMatch[1] && standardMatch[2]) {
    const hours = parseInt(standardMatch[1], 10);
    const minutes = parseInt(standardMatch[2], 10);
    // If afternoon hours are written as 1:20 or 2:20, convert to 13:20 / 14:20
    let adjustedHours = hours;
    if (hours >= 1 && hours <= 5) {
      adjustedHours += 12;
    }
    return String(adjustedHours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  }

  const rawNum = parseInt(t, 10);
  if (!isNaN(rawNum) && rawNum >= 0 && rawNum <= 24) {
    const adjusted = (rawNum >= 1 && rawNum <= 5) ? rawNum + 12 : rawNum;
    return String(adjusted).padStart(2, '0') + ':00';
  }

  return '08:00';
}

export interface TimetableClassEntry {
  subject: string;
  teacher?: string;
  location?: string;
  startTime: string;
  endTime: string;
  setNotice?: string;
}

/**
 * Cleans and validates the entire weekly schedule structure
 */
export function normalizeSchedule(
  rawSchedule: Record<string, any[]>,
  fallbackSectionName = 'Whiz 1'
): { sections: Record<string, Record<string, TimetableClassEntry[]>> } {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const cleanedDaySchedule: Record<string, TimetableClassEntry[]> = {};

  DAYS.forEach(day => {
    const rawClasses = rawSchedule[day] || rawSchedule[day.toLowerCase()] || [];
    if (!Array.isArray(rawClasses)) {
      cleanedDaySchedule[day] = [];
      return;
    }

    const validClasses: TimetableClassEntry[] = rawClasses
      .filter(item => item && (item.subject || item.name))
      .map(item => {
        const rawSubject = item.subject || item.name || 'General';
        const normalizedSubj = normalizeSubject(rawSubject);

        let rawStart = item.startTime || item.start;
        let rawEnd = item.endTime || item.end;
        const timeField = item.time || item.timing || item.slot || item.periodTime || item.hours;

        // If rawStart contains a range (e.g. "09:10 - 09:40") and no rawEnd is present
        if (typeof rawStart === 'string' && /[-–—]|\bto\b/i.test(rawStart) && !rawEnd) {
          const parts = rawStart.split(/\s*[-–—]\s*|\s+to\s+/i).map(s => s.trim()).filter(Boolean);
          if (parts[0]) rawStart = parts[0];
          if (parts[1]) rawEnd = parts[1];
        }

        // If timeField has the range (e.g. "09:10 - 09:40")
        if ((!rawStart || !rawEnd) && timeField) {
          const parts = String(timeField).split(/\s*[-–—]\s*|\s+to\s+/i).map(s => s.trim()).filter(Boolean);
          if (parts[0] && !rawStart) rawStart = parts[0];
          if (parts[1] && !rawEnd) rawEnd = parts[1];
        }

        const start = normalizeTime(rawStart || '08:00');
        let end = normalizeTime(rawEnd || '08:45');

        // Ensure end time is strictly after start time
        const startParts = start.split(':');
        const endParts = end.split(':');
        const startM = parseInt(startParts[0] || '8', 10) * 60 + parseInt(startParts[1] || '0', 10);
        const endM = parseInt(endParts[0] || '8', 10) * 60 + parseInt(endParts[1] || '45', 10);
        if (endM <= startM) {
          const newEndM = startM + 45;
          const h = Math.floor(newEndM / 60) % 24;
          const m = newEndM % 60;
          end = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        }

        const teacher = normalizeTeacherName(normalizedSubj.inferredTeacher || item.teacher || item.instructor);
        const notice = getSetRotationNotice(normalizedSubj.subject);

        const entry: TimetableClassEntry = {
          subject: normalizedSubj.subject,
          teacher,
          location: item.location || item.room || 'Classroom',
          startTime: start,
          endTime: end,
        };

        if (notice) {
          entry.setNotice = notice;
        }

        return entry;
      });

    // Sort by startTime
    validClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
    cleanedDaySchedule[day] = validClasses;
  });

  const sectionId = toSectionId('9', fallbackSectionName);
  return {
    sections: {
      [sectionId]: cleanedDaySchedule,
    },
  };
}
