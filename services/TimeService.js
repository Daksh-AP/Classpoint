export class TimeService {
  // Get current day's schedule for a specific section
  static getTodaySchedule(timetableData, sectionId) {
    if (!timetableData || !timetableData.sections || !timetableData.sections[sectionId]) {
      return [];
    }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return timetableData.sections[sectionId][today] || [];
  }

  // Get the current class (if any)
  static getCurrentClass(schedule) {
    return schedule.find(classItem => 
      this.isCurrentTime(classItem.startTime, classItem.endTime)
    ) || null;
  }

  // Get the next class
  static getNextClass(schedule) {
    const now = new Date();
    const currentTime = this.formatTime(now);

    // Find classes that haven't started yet
    const upcomingClasses = schedule.filter(classItem => 
      this.timeToMinutes(classItem.startTime) > this.timeToMinutes(currentTime)
    );

    // Sort by start time and return the first one
    upcomingClasses.sort((a, b) => 
      this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime)
    );

    return upcomingClasses[0] || null;
  }

  // Check if current time is within a class period
  static isCurrentTime(startTime, endTime) {
    const now = new Date();
    const currentMinutes = this.timeToMinutes(this.formatTime(now));
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  // Check if a class is upcoming (within next 30 minutes)
  static isUpcoming(startTime) {
    const now = new Date();
    const currentMinutes = this.timeToMinutes(this.formatTime(now));
    const startMinutes = this.timeToMinutes(startTime);

    return startMinutes > currentMinutes && startMinutes <= currentMinutes + 30;
  }

  // Check if a class is in the past
  static isPast(endTime) {
    const now = new Date();
    const currentMinutes = this.timeToMinutes(this.formatTime(now));
    const endMinutes = this.timeToMinutes(endTime);

    return currentMinutes >= endMinutes;
  }

  // Check if within reminder time (default 2 minutes)
  static isWithinReminderTime(startTime, reminderMinutes = 2) {
    const now = new Date();
    const currentMinutes = this.timeToMinutes(this.formatTime(now));
    const startMinutes = this.timeToMinutes(startTime);
    const timeDiff = startMinutes - currentMinutes;

    return timeDiff > 0 && timeDiff <= reminderMinutes;
  }

  // Get time remaining in current class
  static getTimeRemaining(endTime) {
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
  static getTimeUntil(startTime) {
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
  static timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Convert minutes since midnight to time string (HH:MM)
  static minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Format Date object to HH:MM string
  static formatTime(date) {
    return date.toTimeString().slice(0, 5);
  }

  // Get all classes for a specific day
  static getDaySchedule(timetableData, sectionId, dayName) {
    if (!timetableData || !timetableData.sections || !timetableData.sections[sectionId]) {
      return [];
    }

    return timetableData.sections[sectionId][dayName] || [];
  }

  // Get week schedule for a section
  static getWeekSchedule(timetableData, sectionId) {
    if (!timetableData || !timetableData.sections || !timetableData.sections[sectionId]) {
      return {};
    }

    return timetableData.sections[sectionId];
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
  static getScheduleStats(timetableData, sectionId) {
    const weekSchedule = this.getWeekSchedule(timetableData, sectionId);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    let totalClasses = 0;
    let totalHours = 0;
    const subjectCount = {};

    days.forEach(day => {
      const daySchedule = weekSchedule[day] || [];
      totalClasses += daySchedule.length;
      
      daySchedule.forEach(classItem => {
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
  static createClassNotification(classItem, minutesUntil) {
    return {
      title: 'Upcoming Class',
      message: `${classItem.subject} starts in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`,
      location: classItem.location,
      time: classItem.startTime,
      type: 'reminder'
    };
  }

  // Check for conflicts in schedule
  static findScheduleConflicts(schedule) {
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