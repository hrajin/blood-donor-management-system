import { bangladeshTimeZone } from '../../shared/bangladesh-time.ts';

// Calendar dates (`YYYY-MM-DD`) and months (`YYYY-MM`) carry no time of day,
// so they are read as UTC midnight and formatted in UTC to keep the same day.
const dayFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const monthFormat = new Intl.DateTimeFormat('en', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});

function utcDate(value: string): Date {
  const [year, month, day = 1] = value.split('-').map(Number);
  if (year === undefined || month === undefined) throw new Error(`Not a date: ${value}`);
  return new Date(Date.UTC(year, month - 1, day));
}

/** `2025-01-15` → `15 Jan 2025` */
export function formatDay(date: string): string {
  return dayFormat.format(utcDate(date));
}

/** `2025-01` → `Jan 25` */
export function formatMonth(month: string): string {
  return monthFormat.format(utcDate(month));
}

const instantFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: bangladeshTimeZone,
});

/** An ISO timestamp in Bangladesh time, e.g. `15 Nov 2026, 2:30 pm`. */
export function formatInstant(iso: string): string {
  return instantFormat.format(new Date(iso));
}

const dayMs = 24 * 60 * 60 * 1000;

/** `date` relative to `today` (both `YYYY-MM-DD`): `Today`, `Tomorrow`, `In 3 days`, `2 days ago`. */
export function relativeDay(date: string, today: string): string {
  // UTC midnights of two calendar dates are whole days apart.
  const days = Math.round((Date.parse(date) - Date.parse(today)) / dayMs);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}
