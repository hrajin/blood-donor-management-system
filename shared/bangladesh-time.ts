// All donors are in Bangladesh, so calendar dates and months are counted in Bangladesh time.
export const bangladeshTimeZone = 'Asia/Dhaka';

const dateFormat = new Intl.DateTimeFormat('en', {
  timeZone: bangladeshTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar date of `instant` in Bangladesh, as `YYYY-MM-DD`. */
export function bangladeshDate(instant: Date): string {
  const parts = dateFormat.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((found) => found.type === type)?.value;
    if (!value) throw new Error(`Could not read the ${type} of ${instant.toISOString()}`);
    return value;
  };
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** `date` (`YYYY-MM-DD`) moved by whole calendar years; 29 February stays as written. */
export function shiftYears(date: string, years: number): string {
  const year = Number(date.slice(0, 4));
  return `${String(year + years).padStart(4, '0')}${date.slice(4)}`;
}

/** Whole years from `from` to `to` (both `YYYY-MM-DD`), e.g. an age on a given day. */
export function completedYears(from: string, to: string): number {
  const years = Number(to.slice(0, 4)) - Number(from.slice(0, 4));
  return to.slice(5) < from.slice(5) ? years - 1 : years;
}

const dayMs = 24 * 60 * 60 * 1000;

/** `date` (`YYYY-MM-DD`) moved by whole days. */
export function addDays(date: string, days: number): string {
  // Calendar dates are read and written as UTC midnight, so no time zone shifts the day.
  return new Date(Date.parse(date) + days * dayMs).toISOString().slice(0, 10);
}
