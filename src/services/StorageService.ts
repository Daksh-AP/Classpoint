import { db, auth } from '../firebase';
import { doc, setDoc, getDoc, collection, writeBatch } from 'firebase/firestore';
import { getSchoolId } from '../lib/firebase/paths';

export class StorageService {
  // --- Firestore-based Settings Management (Refactored to split documents) ---
  static async saveSettingCategory(category: any, data: any) {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const settingsRef = doc(db, 'schools', getSchoolId(), 'users', user.uid, 'settings', category);
      await setDoc(settingsRef, data, { merge: true });
    } catch (error) {
// /* console.error */ (`🔥 Failed to save ${category} settings to Firestore:`, error);
    }
  }

  static async getSettingCategory(category: any) {
    const user = auth.currentUser;
    if (!user) return {};
    try {
      const settingsRef = doc(db, 'schools', getSchoolId(), 'users', user.uid, 'settings', category);
      const docSnap = await getDoc(settingsRef);
      return docSnap.exists() ? docSnap.data() : {};
    } catch (error) {
// /* console.error */ (`🔥 Failed to load ${category} settings from Firestore:`, error);
      return {};
    }
  }

  // Section Management (Now with Firestore sub-documents)
  static async saveSelectedSection(section: any) {
    await this.saveSettingCategory('app_state', { selectedSection: section });
  }

  static async getSelectedSection() {
    const state = await this.getSettingCategory('app_state');
    return state.selectedSection || null;
  }

  // Timetable Data Management (Now with Firestore)
  static async saveTimetableData(data: any) {
    const user = auth.currentUser;
    if (!user) {
// /* console.error */ ("No user logged in, cannot save timetable to Firestore.");
      return;
    }
    try {
      const timetableRef = doc(db, 'schools', getSchoolId(), 'timetables', user.uid);
      const dataToSave = {
        ...data,
        savedAt: new Date().toISOString(),
        ownerUid: user.uid,
      };
      await setDoc(timetableRef, dataToSave);
// /* console.log */ ("✅ Timetable saved to Firestore");
    } catch (error) {
// /* console.error */ ('🔥 Failed to save timetable data to Firestore:', error);
    }
  }

  static async getTimetableData() {
    const user = auth.currentUser;
    if (!user) {
// /* console.error */ ("No user logged in, cannot fetch timetable from Firestore.");
      return null;
    }
    try {
      const timetableRef = doc(db, 'schools', getSchoolId(), 'timetables', user.uid);
      const docSnap = await getDoc(timetableRef);
      if (docSnap.exists()) {
// /* console.log */ ("📘 Timetable data fetched from Firestore");
        return docSnap.data();
      } else {
// /* console.warn */ ("⚠️ No timetable data found in Firestore for this user.");
        return null;
      }
    } catch (error) {
// /* console.error */ ('🔥 Failed to load timetable data from Firestore:', error);
      return null;
    }
  }

  // In-Memory Fallback Mirror for sudden wall-switch / LevelDB corruption resilience
  private static memoryFallback = new Map<string, string>();

  static safeGetItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch (e) {
      // LevelDB lock / corruption / quota error
    }
    return this.memoryFallback.get(key) ?? null;
  }

  static safeSetItem(key: string, value: string): void {
    this.memoryFallback.set(key, value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('[StorageService] LocalStorage set failed, maintained in memory fallback:', e);
    }
  }

  static safeRemoveItem(key: string): void {
    this.memoryFallback.delete(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      // Ignore
    }
  }

  // Widget Position Management (LocalStorage + Firestore sync)
  static async saveWidgetPosition(position: any) {
    this.safeSetItem(this.KEYS.WIDGET_POSITION, JSON.stringify(position));
    await this.saveSettingCategory('widget', { widgetPosition: position });
  }

  static async getWidgetPosition() {
    const cached = this.safeGetItem(this.KEYS.WIDGET_POSITION);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    const state = await this.getSettingCategory('widget');
    return state.widgetPosition || { x: 20, y: 20 };
  }

  // Widget Visibility (LocalStorage + Firestore sync)
  static async saveWidgetVisibility(visible: any) {
    this.safeSetItem(this.KEYS.WIDGET_VISIBILITY, JSON.stringify(visible));
    await this.saveSettingCategory('widget', { widgetVisible: visible });
  }

  static async getWidgetVisibility() {
    const cached = this.safeGetItem(this.KEYS.WIDGET_VISIBILITY);
    if (cached !== null) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    const state = await this.getSettingCategory('widget');
    return state.widgetVisible || false;
  }

  static SETTINGS_KEY = 'Genatis Board_general_settings';

  static KEYS = {
    SETTINGS_KEY: 'Genatis Board_general_settings',
    ATTENDANCE_DATA_PREFIX: 'Genatis Board_attendance_',
    STUDENTS_PREFIX: 'Genatis Board_students_',
    APP_STATE: 'Genatis Board_app_state',
    TIMETABLE: 'Genatis Board_timetable',
    WIDGET_POSITION: 'Genatis Board_widget_pos',
    WIDGET_VISIBILITY: 'Genatis Board_widget_vis',
    WIDGET_SETTINGS: 'Genatis Board_widget_settings'
  } as const;

  // General Settings (Now with Firestore + LocalStorage fallback)
  static async saveSettings(settings: any) {
    // 1. Save to LocalStorage / in-memory fallback for instant access on next launch
    this.safeSetItem(this.SETTINGS_KEY, JSON.stringify(settings));

    // 2. Save to Firestore for cross-device sync
    await this.saveSettingCategory('general', { settings });
  }

  // Synchronous version for initial state - returns cached or defaults immediately
  static getSettings() {
    const cached = this.safeGetItem(this.SETTINGS_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    return {
      theme: 'light',
      notifications: true,
      reminderTime: 2,
      autoStartWidget: false,
      weatherLocation: 'Mumbai'
    };
  }

  // Async version for loading from Firestore
  static async getSettingsAsync() {
    const state = await this.getSettingCategory('general');
    return state.settings || {
      theme: 'light',
      notifications: true,
      reminderTime: 2,
      autoStartWidget: false,
      weatherLocation: 'Mumbai'
    };
  }

  // Widget Specific Settings (Now with Firestore sub-documents)
  static async saveWidgetSettings(widgetSettings: any) {
    await this.saveSettingCategory('widget', { widgetSettings });
  }

  // Synchronous version for initial state
  static getWidgetSettings() {
    return {
      fontSize: 'base',
      transparency: 100,
      width: 320,
      height: 400,
      theme: 'system',
    };
  }

  // Async version for loading from Firestore
  static async getWidgetSettingsAsync() {
    const state = await this.getSettingCategory('widget');
    return state.widgetSettings || {
      fontSize: 'base',
      transparency: 100,
      width: 320,
      height: 400,
      theme: 'system',
    };
  }

  // Attendance Data Management (Now with Firestore)
  static async saveAttendanceData(sectionId: string, date: any, attendanceData: any) {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const attendanceRef = doc(db, 'schools', getSchoolId(), 'users', user.uid, 'attendance', `${sectionId}_${date}`);
      await setDoc(attendanceRef, { attendanceData });
    } catch (error) {
// /* console.error */ ('🔥 Failed to save attendance data to Firestore:', error);
    }
  }

  static async getAttendanceData(sectionId: string, date: any) {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      const attendanceRef = doc(db, 'schools', getSchoolId(), 'users', user.uid, 'attendance', `${sectionId}_${date}`);
      const docSnap = await getDoc(attendanceRef);
      return docSnap.exists() ? docSnap.data().attendanceData : null;
    } catch (error) {
// /* console.error */ ('🔥 Failed to load attendance data from Firestore:', error);
      return null;
    }
  }

  // Student Data Management (Now with Firestore)
  static async saveStudents(sectionId: string, students: any) {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const studentsRef = doc(db, 'schools', getSchoolId(), 'users', user.uid, 'students', sectionId);
      await setDoc(studentsRef, { students });
    } catch (error) {
// /* console.error */ ('🔥 Failed to save students data to Firestore:', error);
    }
  }

  // Old method (User-specific)
  static async getStudents(sectionId: string) {
    const user = auth.currentUser;
    if (!user) return [];
    try {
      const studentsRef = doc(db, 'schools', getSchoolId(), 'users', user.uid, 'students', sectionId);
      const docSnap = await getDoc(studentsRef);
      return docSnap.exists() ? docSnap.data().students : [];
    } catch (error) {
// /* console.error */ ('🔥 Failed to load students data from Firestore:', error);
      return [];
    }
  }

  // New method (School-wide / Attendance Logger specific)
  static async getSchoolStudents(section: any) {
    if (!section || !section.grade || !section.id) return [];
    const { collection, query, orderBy, getDocs } = await import('firebase/firestore');

    try {
      const gradeKey = String(section.grade).startsWith('grade') ? section.grade : `grade${section.grade}`;
      const studentsPath = `schools/${getSchoolId()}/grades/${gradeKey}/sections/${section.id}/students`;
      const studentsRef = collection(db, studentsPath);
      const q = query(studentsRef, orderBy('name'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.filter((doc: any) => !doc.data().isDeleted).map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
// /* console.error */ ('🔥 Failed to load school students from Firestore:', error);
      return [];
    }
  }



  // Clear all data
  static clearAllData() {
    try {
      Object.values(this.KEYS).forEach((key: string) => {
        // Special handling for attendance and student data prefixes
        if (key.startsWith(this.KEYS.ATTENDANCE_DATA_PREFIX) || key.startsWith(this.KEYS.STUDENTS_PREFIX)) {
          // Iterate through all localStorage keys and remove matching data
          for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i);
            if (storageKey && (storageKey.startsWith(this.KEYS.ATTENDANCE_DATA_PREFIX) || storageKey.startsWith(this.KEYS.STUDENTS_PREFIX))) {
              localStorage.removeItem(storageKey);
            }
          }
        } else {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
// /* console.error */ ('Failed to clear data:', error);
    }
  }

  // Export data for backup
  static exportData() {
    try {
      const data: any= {};
      Object.entries(this.KEYS).forEach(([name, key]: [string, string]) => {
        // Handle attendance and student data separately
        if (key.startsWith(this.KEYS.ATTENDANCE_DATA_PREFIX)) {
          const attendanceRecords: any= {};
          for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i);
            if (storageKey && storageKey.startsWith(this.KEYS.ATTENDANCE_DATA_PREFIX)) {
              const item = localStorage.getItem(storageKey);
              if (item) attendanceRecords[storageKey] = JSON.parse(item);
            }
          }
          data['ATTENDANCE_RECORDS'] = attendanceRecords; // Store all attendance records under a single key
        } else if (key.startsWith(this.KEYS.STUDENTS_PREFIX)) {
          const studentRecords: any= {};
          for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i);
            if (storageKey && storageKey.startsWith(this.KEYS.STUDENTS_PREFIX)) {
              const item = localStorage.getItem(storageKey);
              if (item) studentRecords[storageKey] = JSON.parse(item);
            }
          }
          data['STUDENT_RECORDS'] = studentRecords; // Store all student records under a single key
        } else {
          const value = localStorage.getItem(key);
          if (value) {
            data[name] = JSON.parse(value);
          }
        }
      });
      return data;
    } catch (error) {
// /* console.error */ ('Failed to export data:', error);
      return null;
    }
  }

  // Import data from backup
  static importData(data: any) {
    try {
      Object.entries(data).forEach(([name, value]: [string, any]) => {
        if (name === 'ATTENDANCE_RECORDS') {
          // Import all attendance records
          Object.entries(value).forEach(([attendanceKey, attendanceValue]: [string, any]) => {
            localStorage.setItem(attendanceKey, JSON.stringify(attendanceValue));
          });
        } else if (name === 'STUDENT_RECORDS') {
          // Import all student records
          Object.entries(value).forEach(([studentKey, studentValue]: [string, any]) => {
            localStorage.setItem(studentKey, JSON.stringify(studentValue));
          });
        } else {
          const key = this.KEYS[name as keyof typeof this.KEYS];
          if (key) {
            localStorage.setItem(key, JSON.stringify(value));
          }
        }
      });
      return true;
    } catch (error) {
// /* console.error */ ('Failed to import data:', error);
      return false;
    }
  }
}


