export class NotificationService {
  static isSupported() {
    return 'Notification' in window;
  }

  static async requestPermission() {
    if (!this.isSupported()) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  static async showClassReminder(classInfo) {
    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    const notification = new Notification('Upcoming Class', {
      body: `${classInfo.subject} starts in 2 minutes\nLocation: ${classInfo.location || 'Classroom'}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'class-reminder',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Schedule'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);

    return true;
  }

  static async showScheduleUpdate(message) {
    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      return false;
    }

    const notification = new Notification('ClassPoint', {
      body: message,
      icon: '/favicon.ico',
      tag: 'schedule-update'
    });

    setTimeout(() => {
      notification.close();
    }, 5000);

    return true;
  }

  static playChime() {
    try {
      const audio = new Audio('/chime.mp3'); // Path to the chime.mp3 file
      audio.play().catch(error => {
        console.warn('Failed to play chime sound:', error);
        // Fallback to a silent notification or log the issue if sound is critical
      });
      return true;
    } catch (error) {
      console.error('Error playing chime:', error);
      return false;
    }
  }

  static async showReminderWithChime(classInfo) {
    // Play chime first
    this.playChime();
    
    // Then show notification
    return await this.showClassReminder(classInfo);
  }
}
