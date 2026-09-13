// @ts-nocheck
export class TimeService {
  // Resolves section schedule matching both exact and clean normalized keys
  static getSectionSchedule(timetableData: any, sectionId: string) {
    if (!timetableData || !timetableData.sections) return null;
    if (timetableData.sections[sectionId]) return timetableData.sections[sectionId];
    const cleanId = (sectionId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchKey = Object.keys(timetableData.sections).find(
      k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanId
    );
    return matchKey ? timetableData.sections[matchKey] : null;
  }

  // Get current day's schedule for a specific section
  static getTodaySchedule(timetableData: any, sectionId: string) {
    const sec = this.getSectionSchedule(timetableData, sectionId);
    if (!sec) return [];
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return sec[today] || [];
  }

  // Get the current class (if any)
  static getCurrentClass(schedule: any[]) {
    return schedule.find((classItem: any) =>
      this.isCurrentTime(classItem.startTime, classItem.endTime)
    ) || null;
  }

  // Get the next class
  static getNextClass(schedule: any) {
    const now = new Date();
    const currentTime = this.formatTime(now);

    // Find classes that haven't started yet
    const upcomingClasses = schedule.filter((classItem: any) =>
      this.timeToMinutes(classItem.startTime) > this.timeToMinutes(currentTime)
    );

    // Sort by start time and return the first one
    upcomingClasses.sort((a: any, b: any) =>
      this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );

    return upcomingClasses[0] || null;
  }

  // Get all classes that are yet to happen today
  static getRemainingClasses(schedule: any) {
    const now = new Date();
    const currentTime = this.formatTime(now);

    const remaining = schedule.filter((classItem: any) =>
      this.timeToMinutes(classItem.startTime) > this.timeToMinutes(currentTime)
    );

    remaining.sort((a: any, b: any) =>
      this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );

    return remaining;
  }

  // Check if current time is within a class period
  static isCurrentTime(startTime: any, endTime: any) {
    const now = new Date();
    const currentMinutes = this.timeToMinutes(this.formatTime(now));
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  // Check if a class is upcoming (within next 30 minutes)
  static isUpcoming(startTime: any) {
    const now = new Date();
    const currentMinutes = this.timeToMinutes(this.formatTime(now));
    const startMinutes = this.timeToMinutes(startTime);

    return startMinutes > currentMinutes && startMinutes <= currentMinutes + 30;
  }

  // Check if a class is in the past
  static isPast(endTime: any) {
    const now = new Date();
    const currentMinutes = this.timeToMinutes(this.formatTime(now));
    const endMinutes = this.timeToMinutes(endTime);

    return currentMinutes >= endMinutes;
  }

  // Check if within reminder time (default 2 minutes)
  static isWithinReminderTime(startTime: any, reminderMinutes = 2) {
    const now = new Date();
    const currentMinutes = this.timeToMinutes(this.formatTime(now));
    const startMinutes = this.timeToMinutes(startTime);
    const timeDiff = startMinutes - currentMinutes;

    return timeDiff > 0 && timeDiff <= reminderMinutes;
  }

  // Get time remaining in current class
  static getTimeRemaining(endTime: any) {
    const now = new Date();
    const currentMinutes = this.timeToMinutes(this.formatTime(now));
    const endMinutes = this.timeToMinutes(endTime);
    const remaining = endMinutes - currentMinutes;

    if (remaining <= 0) return '0 min';

    const hours = Math.floor(remaining / 60);
    const minutes = remaining % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  }

  // Get time until next class
  static getTimeUntil(startTime: any) {
    const now = new Date();
    const currentMinutes = this.timeToMinutes(this.formatTime(now));
    const startMinutes = this.timeToMinutes(startTime);
    const until = startMinutes - currentMinutes;

    if (until <= 0) return '0 min';

    const hours = Math.floor(until / 60);
    const minutes = until % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  }

  // Convert time string (HH:MM) to minutes since midnight
  static timeToMinutes(timeString: any) {
    if (!timeString || typeof timeString !== 'string') return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Convert minutes since midnight to time string (HH:MM)
  static minutesToTime(minutes: any) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Format Date object to HH:MM string
  static formatTime(date: any) {
    return date.toTimeString().slice(0, 5);
  }

  // Parse time string (HH:MM) to a Date object for today
  static parseTime(timeString: any) {
    if (!timeString) return new Date();
    const now = new Date();
    let hours = 0;
    let minutes = 0;

    // Handle am/pm if present just in case
    if (timeString.toLowerCase().includes('am') || timeString.toLowerCase().includes('pm')) {
      const match = timeString.match(/(\d+):(\d+)\s*(am|pm)/i);
      if (match) {
        hours = parseInt(match[1]);
        minutes = parseInt(match[2]);
        const modifier = match[3].toLowerCase();
        if (modifier === 'pm' && hours < 12) hours += 12;
        if (!modifier.includes('pm') && hours === 12) hours = 0;
      }
    } else {
      [hours, minutes] = timeString.split(':').map(Number);
    }

    now.setHours(hours, minutes, 0, 0);
    return now;
  }

  // Get all classes for a specific day
  static getDaySchedule(timetableData: any, sectionId: string, dayName: any) {
    const sec = this.getSectionSchedule(timetableData, sectionId);
    if (!sec) return [];
    return sec[dayName] || [];
  }

  // Get week schedule for a section
  static getWeekSchedule(timetableData: any, sectionId: string) {
    return this.getSectionSchedule(timetableData, sectionId) || {};
  }

  // Check if it's a school day (Monday to Friday)
  static isSchoolDay(date = new Date()) {
    const day = date.getDay();
    return day >= 1 && day <= 5; // Monday = 1, Friday = 5
  }

  // Get next school day
  static getNextSchoolDay(date = new Date()) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    while (!this.isSchoolDay(nextDay)) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    return nextDay;
  }

  // Get schedule statistics
  static getScheduleStats(timetableData: any, sectionId: string) {
    const weekSchedule = this.getWeekSchedule(timetableData, sectionId);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    let totalClasses = 0;
    let totalHours = 0;
    const subjectCount: any = {};

    days.forEach((day: any) => {
      const daySchedule = weekSchedule[day] || [];
      totalClasses += daySchedule.length;

      daySchedule.forEach((classItem: any) => {
        const duration = this.timeToMinutes(classItem.endTime) - this.timeToMinutes(classItem.startTime);
        totalHours += duration / 60;

        subjectCount[classItem.subject] = (subjectCount[classItem.subject] || 0) + 1;
      });
    });

    return {
      totalClasses,
      totalHours: Math.round(totalHours * 10) / 10,
      averageClassesPerDay: Math.round((totalClasses / 5) * 10) / 10,
      subjectDistribution: subjectCount
    };
  }

  // Create a notification for upcoming class
  static createClassNotification(classItem: any, minutesUntil: any) {
    return {
      title: 'Upcoming Class',
      message: `${classItem.subject} starts in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`,
      location: classItem.location,
      time: classItem.startTime,
      type: 'reminder'
    };
  }

  // Check for conflicts in schedule
  static findScheduleConflicts(schedule: any) {
    const conflicts = [];

    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        const class1 = schedule[i];
        const class2 = schedule[j];

        const start1 = this.timeToMinutes(class1.startTime);
        const end1 = this.timeToMinutes(class1.endTime);
        const start2 = this.timeToMinutes(class2.startTime);
        const end2 = this.timeToMinutes(class2.endTime);

        // Check for overlap
        if ((start1 < end2 && end1 > start2)) {
          conflicts.push({
            class1: class1,
            class2: class2,
            type: 'time_overlap'
          });
        }
      }
    }

    return conflicts;
  }
}
