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

/**
 * Adds n days to a YYYY-MM-DD string and returns the result.
 */
export function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

/**
 * Adds n weeks (±7 days each) to a YYYY-MM-DD string.
 */
export function addWeeks(dateStr: string, n: number): string {
  return addDays(dateStr, n * 7)
}

/**
 * Adds n months to a YYYY-MM-DD string.
 */
export function addMonths(dateStr: string, n: number): string {
  const d = parseDate(dateStr)
  d.setMonth(d.getMonth() + n)
  return formatDate(d)
}

/**
 * Returns the Sunday (start of week) for the week containing dateStr.
 */
export function getWeekStart(dateStr: string): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() - d.getDay()) // go back to Sunday
  return formatDate(d)
}

/**
 * Returns the 7 YYYY-MM-DD dates for the week (Sun–Sat) containing anchorDate.
 */
export function getWeekDates(anchorDate: string): string[] {
  const start = getWeekStart(anchorDate)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/**
 * Returns true if both dates fall in the same Sun–Sat week.
 */
export function isSameWeek(a: string, b: string): boolean {
  return getWeekStart(a) === getWeekStart(b)
}

/**
 * Returns true if both dates are in the same calendar month and year.
 */
export function isSameMonth(dateStr: string, anchorDate: string): boolean {
  const d1 = parseDate(dateStr)
  const d2 = parseDate(anchorDate)
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()
}

/**
 * Returns 42 YYYY-MM-DD strings that fill a 6×7 calendar grid for the month
 * containing anchorDate, starting on the Sunday before (or on) the 1st.
 */
export function getMonthGrid(anchorDate: string): string[] {
  const d = parseDate(anchorDate)
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1)
  const gridStart = new Date(firstDay)
  gridStart.setDate(1 - firstDay.getDay()) // rewind to Sunday
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + i)
    return formatDate(day)
  })
}

/**
 * Formats a YYYY-MM-DD date as a human-readable day label in pt-BR.
 * e.g. "segunda-feira, 6 de abril de 2025"
 */
export function formatDayLabel(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Formats a week range as "6 de abr – 12 de abr" for a given anchor date.
 */
export function formatWeekLabel(anchorDate: string): string {
  const dates = getWeekDates(anchorDate)
  const start = parseDate(dates[0])
  const end   = parseDate(dates[6])
  const fmtStart = start.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  const fmtEnd   = end.toLocaleDateString('pt-BR',   { day: 'numeric', month: 'short' })
  return `${fmtStart} – ${fmtEnd}`
}

/**
 * Formats a month label as "abril de 2025" for a given anchor date.
 */
export function formatMonthLabel(anchorDate: string): string {
  return parseDate(anchorDate).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Short day name (3 chars) in pt-BR for a YYYY-MM-DD string.
 * e.g. "Seg", "Ter", …, "Dom"
 */
export function shortDayName(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('pt-BR', { weekday: 'short' })
}

/**
 * Short month+day display: "6 abr"
 */
export function shortDate(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
}
