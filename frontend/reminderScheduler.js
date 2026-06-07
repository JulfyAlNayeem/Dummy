/*
 * Reminder Scheduler Service (moved into frontend for Vite resolution)
 *
 * This service checks localStorage for reminders and triggers notifications.
 */

class ReminderScheduler {
  constructor() {
    this.checkInterval = null;
    this.isRunning = false;
    this.missedReminders = new Map();
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.checkAllReminders();
    this.checkInterval = setInterval(() => this.checkAllReminders(), 60000);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.isRunning = false;
    }
  }

  checkAllReminders() {
    const now = new Date();
    const keys = Object.keys(localStorage);
    const reminderKeys = keys.filter(k => k.startsWith('reminders_'));
    reminderKeys.forEach(key => {
      try {
        const reminders = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(reminders)) {
          this.checkConversationReminders(key, reminders, now);
        }
      } catch (e) {
        console.error('Error parsing reminders for', key, e);
      }
    });
  }

  checkConversationReminders(storageKey, reminders, now) {
    let needsUpdate = false;
    const updated = reminders.map(reminder => {
      if (reminder.notified) return reminder;
      const t = new Date(reminder.datetime);
      if (t <= now) {
        this.showNotification(reminder, storageKey.replace('reminders_', ''));
        const minutesPassed = (now - t) / (1000 * 60);
        if (minutesPassed > 5) this.storeMissedReminder(storageKey.replace('reminders_', ''), reminder, minutesPassed);
        needsUpdate = true;
        return { ...reminder, notified: true, notifiedAt: now.toISOString() };
      }
      return reminder;
    });
    if (needsUpdate) localStorage.setItem(storageKey, JSON.stringify(updated));
  }

  showNotification(reminder, conversationId) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`⏰ Reminder: ${reminder.title}`, {
          body: reminder.note || 'Time for your reminder!',
          tag: `reminder-${reminder._id}`,
          requireInteraction: true
        });
        notification.onclick = () => { window.focus(); notification.close(); };
        setTimeout(() => notification.close(), 10000);
      }
      window.dispatchEvent(new CustomEvent('reminder-triggered', { detail: { reminder, conversationId, timestamp: new Date().toISOString() } }));
    } catch (e) {
      console.error('Notification failed', e);
    }
  }

  storeMissedReminder(conversationId, reminder, minutesPassed) {
    const key = `missed_reminders_${conversationId}`;
    let missed = [];
    try { missed = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { missed = []; }
    if (!missed.find(m => m._id === reminder._id)) {
      missed.push({ ...reminder, missedBy: Math.floor(minutesPassed), missedAt: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(missed));
    }
  }

  getMissedReminders(conversationId) {
    try { return JSON.parse(localStorage.getItem(`missed_reminders_${conversationId}`) || '[]'); } catch (e) { return []; }
  }

  clearMissedReminders(conversationId) {
    localStorage.removeItem(`missed_reminders_${conversationId}`);
  }

  static async requestNotificationPermission() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        const p = await Notification.requestPermission();
        return p === 'granted';
      }
      return Notification.permission === 'granted';
    }
    return false;
  }

  getStats() {
    const keys = Object.keys(localStorage);
    const reminderKeys = keys.filter(k => k.startsWith('reminders_'));
    const missedKeys = keys.filter(k => k.startsWith('missed_reminders_'));
    let total = 0, active = 0, missed = 0;
    reminderKeys.forEach(k => {
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]');
        total += arr.length;
        active += arr.filter(r => !r.notified).length;
      } catch (e) {}
    });
    missedKeys.forEach(k => { try { missed += JSON.parse(localStorage.getItem(k) || '[]').length; } catch(e) {} });
    return { isRunning: this.isRunning, totalReminders: total, activeReminders: active, totalMissed: missed, conversations: reminderKeys.length };
  }
}

const reminderScheduler = new ReminderScheduler();
export default reminderScheduler;

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') reminderScheduler.start();
  else window.addEventListener('load', () => reminderScheduler.start());
  window.addEventListener('beforeunload', () => reminderScheduler.stop());
  window.reminderScheduler = reminderScheduler;
}
