// Shared helper utilities for reminders
export function formatDateTime(datetime: any): string {
  const date = new Date(datetime);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatTimeOnly(datetime: any): string {
  const date = new Date(datetime);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')}${ampm}`;
}

export function getRepeatLabel(repeat: any): string {
  const labels = {
    'one-time': 'Once',
    'daily': 'Every day',
    'weekly': 'Every week',
    'monthly': 'Every month'
  };
  return labels[repeat] || 'Once';
}

export function formatTimeLabel(hhmm: any): string {
  if (!hhmm) return '';
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function generateTimeOptions(step: number = 15): any[] {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return times;
}

export function getDefaultTime(step: number = 15): string {
  const now = new Date();
  const minutes = now.getMinutes();
  const remainder = minutes % step;
  const add = remainder === 0 ? 0 : (step - remainder);
  const dt = new Date(now.getTime() + add * 60000);
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function isReminderPast(datetime: any): boolean {
  return new Date(datetime) < new Date();
}
