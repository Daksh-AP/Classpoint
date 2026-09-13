export interface Section {
  id: string;
  name: string;
  grade: string;
  type: string;
  number: number;
}

/**
 * Resolves and standardizes the locked classroom section for an account.
 * If the account specifies an assigned section (board, teacher, or any account with section mapping),
 * returns the full Section object.
 * If the account does not specify a section (e.g. administrator), returns null.
 */
export function resolveAccountSection(user: any): Section | null {
  if (!user) return null;

  // If assignedSection is already a complete section object
  if (user.assignedSection && typeof user.assignedSection === 'object' && user.assignedSection.id) {
    const s = user.assignedSection;
    return {
      id: s.id,
      name: s.name || `Grade ${s.grade || ''} ${s.type || ''} ${s.number || ''}`.trim(),
      grade: s.grade ? (String(s.grade).startsWith('grade') ? String(s.grade) : `grade${s.grade}`) : 'grade9',
      type: s.type ? s.type.charAt(0).toUpperCase() + s.type.slice(1) : '',
      number: typeof s.number === 'number' ? s.number : parseInt(s.number, 10) || 1,
    };
  }

  // Find candidate raw section string
  let rawSection: string | null = null;

  if (Array.isArray(user.assignedSections) && user.assignedSections.length > 0) {
    rawSection = String(user.assignedSections[0]).trim();
  } else if (typeof user.assignedSection === 'string' && user.assignedSection.trim()) {
    rawSection = user.assignedSection.trim();
  } else if (typeof user.section === 'string' && user.section.trim()) {
    rawSection = user.section.trim();
  } else if (typeof user.sectionId === 'string' && user.sectionId.trim()) {
    rawSection = user.sectionId.trim();
  } else if (typeof user.email === 'string') {
    // Check email pattern like board_grade9_whiz1@... or teacher_grade9_whiz1@...
    const emailMatch = user.email.match(/(?:board|teacher)?[_-]?grade(\d+)[_-]([a-zA-Z]+)(\d+)/i);
    if (emailMatch && emailMatch[1] && emailMatch[2] && emailMatch[3]) {
      const g = emailMatch[1];
      const t = emailMatch[2].charAt(0).toUpperCase() + emailMatch[2].slice(1).toLowerCase();
      const n = parseInt(emailMatch[3], 10);
      return {
        id: `grade${g}-${t.toLowerCase()}${n}`,
        name: `Grade ${g} ${t} ${n}`,
        grade: `grade${g}`,
        type: t,
        number: n,
      };
    }
  }

  if (!rawSection) {
    return null;
  }

  // Attempt to extract grade from rawSection (e.g. "grade9-whiz1", "grade-9-whiz-1", "g9_whiz1")
  let grade: string | null = null;
  const fullGradeMatch = rawSection.match(/g(?:rade)?[_-]?(\d+)[_-]?([a-zA-Z]+)[_-]?(\d+)/i);
  if (fullGradeMatch && fullGradeMatch[1] && fullGradeMatch[2] && fullGradeMatch[3]) {
    grade = fullGradeMatch[1];
    const typeStr = fullGradeMatch[2];
    const typeCap = typeStr.charAt(0).toUpperCase() + typeStr.slice(1).toLowerCase();
    const num = parseInt(fullGradeMatch[3], 10);
    return {
      id: `grade${grade}-${typeCap.toLowerCase()}${num}`,
      name: `Grade ${grade} ${typeCap} ${num}`,
      grade: `grade${grade}`,
      type: typeCap,
      number: num,
    };
  }

  // Otherwise, extract grade from user object properties
  if (user.grade) {
    grade = String(user.grade).replace(/\D/g, '');
  } else if (user.gradeLevel) {
    grade = String(user.gradeLevel).replace(/\D/g, '');
  } else if (user.gradeNumber) {
    grade = String(user.gradeNumber).replace(/\D/g, '');
  } else if (typeof user.email === 'string') {
    const emailGradeMatch = user.email.match(/grade(\d+)/i);
    if (emailGradeMatch && emailGradeMatch[1]) {
      grade = emailGradeMatch[1];
    }
  }

  // Parse type and number from rawSection (e.g. "whiz1", "super2")
  const typeMatch = rawSection.match(/([a-zA-Z]+)[_-]?(\d+)/);
  if (typeMatch && typeMatch[1] && typeMatch[2]) {
    const typeStr = typeMatch[1];
    const typeCap = typeStr.charAt(0).toUpperCase() + typeStr.slice(1).toLowerCase();
    const num = parseInt(typeMatch[2], 10);
    const resolvedGrade = grade ? String(grade) : '9'; // fallback to grade if specified

    return {
      id: `grade${resolvedGrade}-${typeCap.toLowerCase()}${num}`,
      name: `Grade ${resolvedGrade} ${typeCap} ${num}`,
      grade: `grade${resolvedGrade}`,
      type: typeCap,
      number: num,
    };
  }

  // If rawSection is just a plain string without numbers (fallback)
  const resolvedGrade = grade ? String(grade) : '9';
  return {
    id: `grade${resolvedGrade}-${rawSection.toLowerCase()}`,
    name: `Grade ${resolvedGrade} ${rawSection}`,
    grade: `grade${resolvedGrade}`,
    type: rawSection.charAt(0).toUpperCase() + rawSection.slice(1).toLowerCase(),
    number: 1,
  };
}

/**
 * Checks if a class context / lesson entry document matches the target selected section and grade.
 * Resilient against all naming variations:
 * Grade: "9", "grade9", "Grade 9", 9
 * Section: "super1", "grade9-super1", "grade9_super1", "whiz1", etc.
 */
export function matchesSectionAndGrade(item: any, selectedSection: any): boolean {
  if (!selectedSection) return false;
  if (!item) return false;

  // 1. Grade matching
  const targetGradeNum = String(selectedSection.grade || selectedSection.gradeId || '').replace(/\D/g, '');
  const targetGradeClean = String(selectedSection.grade || selectedSection.gradeId || '').toLowerCase().replace(/\s+/g, '');
  
  const itemGradeNum = String(item.gradeId || item.grade || '').replace(/\D/g, '');
  const itemGradeClean = String(item.gradeId || item.grade || '').toLowerCase().replace(/\s+/g, '');

  const gradeMatches = 
    !itemGradeNum || // if item has no grade specified, don't reject
    (targetGradeNum && itemGradeNum && targetGradeNum === itemGradeNum) ||
    (targetGradeClean && itemGradeClean && targetGradeClean === itemGradeClean);

  if (!gradeMatches) return false;

  // 2. Section matching
  const targetSecRaw = String(selectedSection.id || selectedSection.sectionId || '').toLowerCase();
  const targetSecClean = targetSecRaw.replace(/^grade\d+[-_]?/i, '').replace(/[-_]/g, '');

  const targetSynth = (selectedSection.type && selectedSection.number)
    ? `${String(selectedSection.type).toLowerCase()}${selectedSection.number}`.replace(/[-_]/g, '')
    : '';

  const itemSecRaw = String(item.sectionId || item.section || '').toLowerCase();
  const itemSecClean = itemSecRaw.replace(/^grade\d+[-_]?/i, '').replace(/[-_]/g, '');

  const secMatches = 
    !targetSecRaw ||
    itemSecRaw === targetSecRaw ||
    (targetSecClean && itemSecClean && targetSecClean === itemSecClean) ||
    (targetSynth && (itemSecClean === targetSynth || itemSecRaw === targetSynth)) ||
    (item.id && (
      item.id.toLowerCase().includes(`_${targetSecClean}_`) ||
      item.id.toLowerCase().includes(`_${targetSecRaw}_`)
    ));

  return Boolean(secMatches);
}
