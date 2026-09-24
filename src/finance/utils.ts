import type { Spending, Subscription } from './types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** True if the given YYYY-MM-DD date key falls within the month starting at monthStart. */
export function isInMonth(dateKey: string, monthStart: Date): boolean {
  const [y, m] = dateKey.split('-').map(Number);
  return y === monthStart.getFullYear() && m === monthStart.getMonth() + 1;
}

const MONTH_LABELS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatShortDate(dateKey: string): string {
  const [, m, d] = dateKey.split('-').map(Number);
  return `${MONTH_LABELS_SHORT[m - 1]} ${String(d).padStart(2, '0')}`;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export function groupByCategory(entries: Spending[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amount);
  }
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export interface UpcomingPayment {
  subscription: Subscription;
  date: Date;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Next occurrence of each active subscription's billing date, soonest first. */
export function getUpcomingPayments(subscriptions: Subscription[], from: Date, limit: number): UpcomingPayment[] {
  const today = startOfDay(from);
  const upcoming = subscriptions
    .filter((s) => s.active)
    .map((s) => {
      const day = Math.min(s.billingDate, daysInMonth(today.getFullYear(), today.getMonth()));
      let date = new Date(today.getFullYear(), today.getMonth(), day);
      if (date < today) {
        const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const nextDay = Math.min(s.billingDate, daysInMonth(nextMonthDate.getFullYear(), nextMonthDate.getMonth()));
        date = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), nextDay);
      }
      return { subscription: s, date };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return upcoming.slice(0, limit);
}
