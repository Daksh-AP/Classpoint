import { db, auth } from '../firebase';
import { doc, setDoc, getDoc, collection, writeBatch } from 'firebase/firestore';

export class StorageService {
  // --- Firestore-based Settings Management ---
  static async saveAllSettings(settings) {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const settingsRef = doc(db, 'user_settings', user.uid);
      await setDoc(settingsRef, settings, { merge: true });
    } catch (error) {
      console.error('🔥 Failed to save settings to Firestore:', error);
    }
  }

  static async getAllSettings() {
    const user = auth.currentUser;
    if (!user) return {};
    try {
      const settingsRef = doc(db, 'user_settings', user.uid);
      const docSnap = await getDoc(settingsRef);
      return docSnap.exists() ? docSnap.data() : {};
    } catch (error) {
      console.error('🔥 Failed to load settings from Firestore:', error);
      return {};
    }
  }

  // Section Management (Now with Firestore)
  static async saveSelectedSection(section) {
    await this.saveAllSettings({ selectedSection: section });
  }

  static async getSelectedSection() {
    const settings = await this.getAllSettings();
    return settings.selectedSection || null;
  }

  // Timetable Data Management (Now with Firestore)
  static async saveTimetableData(data) {
    const user = auth.currentUser;
    if (!user) {
      console.error("No user logged in, cannot save timetable to Firestore.");
      return;
    }
    try {
      const timetableRef = doc(db, 'timetables', user.uid);
      const dataToSave = {
        ...data,
        savedAt: new Date().toISOString(),
        ownerUid: user.uid,
      };
      await setDoc(timetableRef, dataToSave);
      console.log("✅ Timetable saved to Firestore");
    } catch (error) {
      console.error('🔥 Failed to save timetable data to Firestore:', error);
    }
  }

  static async getTimetableData() {
    const user = auth.currentUser;
    if (!user) {
      console.error("No user logged in, cannot fetch timetable from Firestore.");
      return null;
    }
    try {
      const timetableRef = doc(db, 'timetables', user.uid);
      const docSnap = await getDoc(timetableRef);
      if (docSnap.exists()) {
        console.log("📘 Timetable data fetched from Firestore");
        return docSnap.data();
      } else {
        console.warn("⚠️ No timetable data found in Firestore for this user.");
        return null;
      }
    } catch (error) {
      console.error('🔥 Failed to load timetable data from Firestore:', error);
      return null;
    }
  }

  // Widget Position Management (Now with Firestore)
  static async saveWidgetPosition(position) {
    await this.saveAllSettings({ widgetPosition: position });
  }

  static async getWidgetPosition() {
    const settings = await this.getAllSettings();
    return settings.widgetPosition || { x: 20, y: 20 };
  }

  // Widget Visibility (Now with Firestore)
  static async saveWidgetVisibility(visible) {
    await this.saveAllSettings({ widgetVisible: visible });
  }

  static async getWidgetVisibility() {
    const settings = await this.getAllSettings();
    return settings.widgetVisible || false;
  }

  // General Settings (Now with Firestore)
  static async saveSettings(settings) {
    await this.saveAllSettings({ settings });
  }

  // Synchronous version for initial state - returns defaults immediately
  static getSettings() {
    // Return default settings synchronously for initial state
    // The actual Firestore settings will be loaded via useEffect
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
    const settings = await this.getAllSettings();
    return settings.settings || {
      theme: 'light',
      notifications: true,
      reminderTime: 2,
      autoStartWidget: false,
      weatherLocation: 'Mumbai'
    };
  }

  // Widget Specific Settings (Now with Firestore)
  static async saveWidgetSettings(widgetSettings) {
    await this.saveAllSettings({ widgetSettings });
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
    const settings = await this.getAllSettings();
    return settings.widgetSettings || {
      fontSize: 'base',
      transparency: 100,
      width: 320,
      height: 400,
      theme: 'system',
    };
  }

  // Attendance Data Management (Now with Firestore)
  static async saveAttendanceData(sectionId, date, attendanceData) {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const attendanceRef = doc(db, 'users', user.uid, 'attendance', `${sectionId}_${date}`);
      await setDoc(attendanceRef, { attendanceData });
    } catch (error) {
      console.error('🔥 Failed to save attendance data to Firestore:', error);
    }
  }

  static async getAttendanceData(sectionId, date) {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      const attendanceRef = doc(db, 'users', user.uid, 'attendance', `${sectionId}_${date}`);
      const docSnap = await getDoc(attendanceRef);
      return docSnap.exists() ? docSnap.data().attendanceData : null;
    } catch (error) {
      console.error('🔥 Failed to load attendance data from Firestore:', error);
      return null;
    }
  }

  // Student Data Management (Now with Firestore)
  static async saveStudents(sectionId, students) {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const studentsRef = doc(db, 'users', user.uid, 'students', sectionId);
      await setDoc(studentsRef, { students });
    } catch (error) {
      console.error('🔥 Failed to save students data to Firestore:', error);
    }
  }

  static async getStudents(sectionId) {
    const user = auth.currentUser;
    if (!user) return [];
    try {
      const studentsRef = doc(db, 'users', user.uid, 'students', sectionId);
      const docSnap = await getDoc(studentsRef);
      return docSnap.exists() ? docSnap.data().students : [];
    } catch (error) {
      console.error('🔥 Failed to load students data from Firestore:', error);
      return [];
    }
  }

  // Clear all data
  static clearAllData() {
    try {
      Object.values(this.KEYS).forEach(key => {
        // Special handling for attendance and student data prefixes
        if (key.startsWith(this.KEYS.ATTENDANCE_DATA_PREFIX) || key.startsWith(this.KEYS.STUDENTS_PREFIX)) {
          // Iterate through all localStorage keys and remove matching data
          for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i);
            if (storageKey.startsWith(this.KEYS.ATTENDANCE_DATA_PREFIX) || storageKey.startsWith(this.KEYS.STUDENTS_PREFIX)) {
              localStorage.removeItem(storageKey);
            }
          }
        } else {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }

  // Export data for backup
  static exportData() {
    try {
      const data = {};
      Object.entries(this.KEYS).forEach(([name, key]) => {
        // Handle attendance and student data separately
        if (key.startsWith(this.KEYS.ATTENDANCE_DATA_PREFIX)) {
          const attendanceRecords = {};
          for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i);
            if (storageKey.startsWith(this.KEYS.ATTENDANCE_DATA_PREFIX)) {
              attendanceRecords[storageKey] = JSON.parse(localStorage.getItem(storageKey));
            }
          }
          data['ATTENDANCE_RECORDS'] = attendanceRecords; // Store all attendance records under a single key
        } else if (key.startsWith(this.KEYS.STUDENTS_PREFIX)) {
          const studentRecords = {};
          for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i);
            if (storageKey.startsWith(this.KEYS.STUDENTS_PREFIX)) {
              studentRecords[storageKey] = JSON.parse(localStorage.getItem(storageKey));
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
      console.error('Failed to export data:', error);
      return null;
    }
  }

  // Import data from backup
  static importData(data) {
    try {
      Object.entries(data).forEach(([name, value]) => {
        if (name === 'ATTENDANCE_RECORDS') {
          // Import all attendance records
          Object.entries(value).forEach(([attendanceKey, attendanceValue]) => {
            localStorage.setItem(attendanceKey, JSON.stringify(attendanceValue));
          });
        } else if (name === 'STUDENT_RECORDS') {
          // Import all student records
          Object.entries(value).forEach(([studentKey, studentValue]) => {
            localStorage.setItem(studentKey, JSON.stringify(studentValue));
          });
        } else {
          const key = this.KEYS[name];
          if (key) {
            localStorage.setItem(key, JSON.stringify(value));
          }
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}
