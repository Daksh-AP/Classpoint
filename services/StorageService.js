export class StorageService {
  static KEYS = {
    SELECTED_SECTION: 'classpoint_selected_section',
    TIMETABLE_DATA: 'classpoint_timetable_data',
    WIDGET_POSITION: 'classpoint_widget_position',
    WIDGET_VISIBLE: 'classpoint_widget_visible',
    SETTINGS: 'classpoint_settings'
  };

  // Section Management
  static saveSelectedSection(section) {
    try {
      localStorage.setItem(this.KEYS.SELECTED_SECTION, JSON.stringify(section));
    } catch (error) {
      console.error('Failed to save selected section:', error);
    }
  }

  static getSelectedSection() {
    try {
      const saved = localStorage.getItem(this.KEYS.SELECTED_SECTION);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load selected section:', error);
      return null;
    }
  }

  // Timetable Data Management
  static saveTimetableData(data) {
    try {
      const dataToSave = {
        ...data,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.KEYS.TIMETABLE_DATA, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save timetable data:', error);
    }
  }

  static getTimetableData() {
    try {
      const saved = localStorage.getItem(this.KEYS.TIMETABLE_DATA);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load timetable data:', error);
      return null;
    }
  }

  // Widget Position Management
  static saveWidgetPosition(position) {
    try {
      localStorage.setItem(this.KEYS.WIDGET_POSITION, JSON.stringify(position));
    } catch (error) {
      console.error('Failed to save widget position:', error);
    }
  }

  static getWidgetPosition() {
    try {
      const saved = localStorage.getItem(this.KEYS.WIDGET_POSITION);
      return saved ? JSON.parse(saved) : { x: 20, y: 20 };
    } catch (error) {
      console.error('Failed to load widget position:', error);
      return { x: 20, y: 20 };
    }
  }

  // Widget Visibility
  static saveWidgetVisibility(visible) {
    try {
      localStorage.setItem(this.KEYS.WIDGET_VISIBLE, JSON.stringify(visible));
    } catch (error) {
      console.error('Failed to save widget visibility:', error);
    }
  }

  static getWidgetVisibility() {
    try {
      const saved = localStorage.getItem(this.KEYS.WIDGET_VISIBLE);
      return saved ? JSON.parse(saved) : false;
    } catch (error) {
      console.error('Failed to load widget visibility:', error);
      return false;
    }
  }

  // General Settings
  static saveSettings(settings) {
    try {
      const currentSettings = this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  static getSettings() {
    try {
      const saved = localStorage.getItem(this.KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : {
        theme: 'light',
        notifications: true,
        reminderTime: 2, // minutes
        autoStartWidget: false
      };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {
        theme: 'light',
        notifications: true,
        reminderTime: 2,
        autoStartWidget: false
      };
    }
  }

  // Clear all data
  static clearAllData() {
    try {
      Object.values(this.KEYS).forEach(key => {
        localStorage.removeItem(key);
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
        const value = localStorage.getItem(key);
        if (value) {
          data[name] = JSON.parse(value);
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
        const key = this.KEYS[name];
        if (key) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      });
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}