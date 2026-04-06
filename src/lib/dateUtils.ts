// ─── Date Utilities ───────────────────────────────────────────────────────────
// Central helpers for date formatting and comparison throughout the app.

/**
 * Formats a Date (or timestamp-like value) to YYYY-MM-DD string.
 * Uses local time so that "today" reflects the user's timezone.
 */
export function formatDate(date: Date | string | number = new Date()): string {
  const d = date instanceof Date ? date : new Date(date)
  const year  = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day   = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Returns the YYYY-MM-DD string for today (local time).
 */
export function todayString(): string {
  return formatDate(new Date())
}

/**
 * Returns true if the given YYYY-MM-DD string is today.
 */
export function isToday(dateStr: string): boolean {
  return dateStr === todayString()
}

/**
 * Returns true if the given YYYY-MM-DD string is strictly in the past.
 */
export function isPast(dateStr: string): boolean {
  return dateStr < todayString()
}

/**
 * Returns true if the given YYYY-MM-DD string is in the future.
 */
export function isFuture(dateStr: string): boolean {
  return dateStr > todayString()
}

/**
 * Parses a YYYY-MM-DD string into a local-time Date (midnight).
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}
