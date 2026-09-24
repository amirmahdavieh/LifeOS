import { useEffect } from 'react';

const REMINDER_HOUR = 18; // 6 PM
const CHECK_INTERVAL_MS = 30_000;
const STORAGE_KEY = 'lifeos:lastSpendingReminderDate';

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Shows an OS notification once a day, during the 6 PM hour, reminding the
 * user to log today's spending. Only fires while the app is open — there's
 * no background/OS-level scheduling, just a timer for as long as this
 * component tree is mounted.
 */
export function useDailySpendingReminder() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    function checkAndNotify() {
      if (Notification.permission !== 'granted') return;
      if (new Date().getHours() !== REMINDER_HOUR) return;

      let lastNotified: string | null = null;
      try {
        lastNotified = localStorage.getItem(STORAGE_KEY);
      } catch {
        // Storage unavailable (private mode, etc.) — fall through and notify anyway.
      }
      if (lastNotified === todayKey()) return;

      const notification = new Notification('LifeOS', {
        body: "Don't forget to log today's spending.",
      });
      notification.onclick = () => window.focus();

      try {
        localStorage.setItem(STORAGE_KEY, todayKey());
      } catch {
        // ignore
      }
    }

    checkAndNotify();
    const interval = setInterval(checkAndNotify, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
