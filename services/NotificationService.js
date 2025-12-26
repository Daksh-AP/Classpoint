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
    // Try to play a subtle chime sound
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      return true;
    } catch (error) {
      console.log('Could not play chime:', error);
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