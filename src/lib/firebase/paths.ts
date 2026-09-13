/**
 * Firestore Path Builder — Single source of truth for all collection/document paths.
 * Multi-tenant architecture: all school collections are rooted at `schools/${schoolId}/...`.
 */

export const getSchoolId = (): string => {
    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('schoolId') || 'default_school';
    }
    return 'default_school';
};

const normalizeGrade = (gradeNum: any) => {
    const clean = String(gradeNum || '').toLowerCase().replace(/\s+/g, '');
    return clean.startsWith('grade') ? clean : `grade${clean}`;
};

// ── Root Collections (Dynamic Multi-Tenant Getters) ──
export const COLLECTIONS = {
    get USERS() { return `schools/${getSchoolId()}/users`; },
    get USER_SETTINGS() { return `schools/${getSchoolId()}/user_settings`; },
    get TIMETABLES() { return `schools/${getSchoolId()}/timetables`; },
    get SMARTBOARDS() { return `schools/${getSchoolId()}/smartboards`; },
    get ANNOUNCEMENTS() { return `schools/${getSchoolId()}/announcements`; },
    get ONE_TIME_PINS() { return `schools/${getSchoolId()}/one_time_pins`; },
    get SHARED_FILES() { return `schools/${getSchoolId()}/shared_files`; },
    get AUDIT_LOGS() { return `schools/${getSchoolId()}/audit_logs`; },
    get SCHOOL_STATS() { return `schools/${getSchoolId()}/schoolStats`; },
    get ABSENCE_IMPACT_EVENTS() { return `schools/${getSchoolId()}/AbsenceImpactEvents`; },
    get SESSION_SUMMARIES() { return `schools/${getSchoolId()}/SessionSummaries`; },
    get CURRICULUM_NODES() { return `schools/${getSchoolId()}/CurriculumNodes`; },
};

// ── Nested Paths ──
export const paths = {
    // Users
    user: (uid: any) => `users/${uid}`,
    userSettings: (uid: any, schoolId?: string) => `schools/${schoolId || getSchoolId()}/user_settings/${uid}`,

    // School Data — Grade hierarchy
    gradesList: (schoolId?: string) => `schools/${schoolId || getSchoolId()}/grades`,
    gradeDoc: (gradeNum: any, schoolId?: string) => `schools/${schoolId || getSchoolId()}/grades/${normalizeGrade(gradeNum)}`,
    sections: (gradeNum: any, schoolId?: string) =>
        `schools/${schoolId || getSchoolId()}/grades/${normalizeGrade(gradeNum)}/sections`,
    section: (gradeNum: any, sectionId: any, schoolId?: string) =>
        `schools/${schoolId || getSchoolId()}/grades/${normalizeGrade(gradeNum)}/sections/${sectionId}`,
    
    // Students subcollection
    students: (gradeNum: any, sectionId: any, schoolId?: string) =>
        `schools/${schoolId || getSchoolId()}/grades/${normalizeGrade(gradeNum)}/sections/${sectionId}/students`,
    student: (gradeNum: any, sectionId: any, studentId: any, schoolId?: string) =>
        `schools/${schoolId || getSchoolId()}/grades/${normalizeGrade(gradeNum)}/sections/${sectionId}/students/${studentId}`,

    // Attendance subcollection
    attendance: (gradeNum: any, sectionId: any, schoolId?: string) =>
        `schools/${schoolId || getSchoolId()}/grades/${normalizeGrade(gradeNum)}/sections/${sectionId}/attendance`,
    attendanceDoc: (gradeNum: any, sectionId: any, dateKey: any, schoolId?: string) =>
        `schools/${schoolId || getSchoolId()}/grades/${normalizeGrade(gradeNum)}/sections/${sectionId}/attendance/${dateKey}`,

    // Class Context
    lessonEntries: (schoolId?: string) => `schools/${schoolId || getSchoolId()}/lessonEntries`,
    subjectStates: (schoolId?: string) => `schools/${schoolId || getSchoolId()}/subjectStates`,
    subjectState: (gradeId: any, sectionId: any, subject: any, schoolId?: string) =>
        `schools/${schoolId || getSchoolId()}/subjectStates/${normalizeGrade(gradeId)}_${sectionId}_${String(subject || '').replace(/\s+/g, '_')}`,

    // Parent Portal
    parentChats: (schoolId?: string) => `schools/${schoolId || getSchoolId()}/parentChats`,
    parentChat: (chatId: any, schoolId?: string) => `schools/${schoolId || getSchoolId()}/parentChats/${chatId}`,
    chatMessages: (chatId: any, schoolId?: string) => `schools/${schoolId || getSchoolId()}/parentChats/${chatId}/messages`,

    // School Stats
    dailyStats: (dateKey: any, schoolId?: string) => `schools/${schoolId || getSchoolId()}/schoolStats/daily_${dateKey}`,

    // Timetables
    timetable: (uid: any, schoolId?: string) => `schools/${schoolId || getSchoolId()}/timetables/${uid}`,

    // Smartboards
    smartboards: (schoolId?: string) => `schools/${schoolId || getSchoolId()}/smartboards`,
    smartboard: (boardId: any, schoolId?: string) => `schools/${schoolId || getSchoolId()}/smartboards/${boardId}`,
};
