// Dates are stored as plain YYYY-MM-DD strings and handled in the user's local time zone.

// The interface is in English, so dates are too, whatever the browser's language.
export const DATE_LOCALE = 'en-GB'

const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toKey(new Date())
}

export function daysUntil(key: string): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((fromKey(key).getTime() - today.getTime()) / 86_400_000)
}

export function formatShort(key: string): string {
  return fromKey(key).toLocaleDateString(DATE_LOCALE, { month: 'short', day: 'numeric' })
}

export function formatLong(key: string): string {
  return fromKey(key).toLocaleDateString(DATE_LOCALE, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function relativeDue(key: string): { text: string; tone: 'overdue' | 'soon' | 'later' } {
  const d = daysUntil(key)
  if (d < 0) return { text: `Overdue · ${formatShort(key)}`, tone: 'overdue' }
  if (d === 0) return { text: 'Due today', tone: 'soon' }
  if (d === 1) return { text: 'Due tomorrow', tone: 'soon' }
  if (d <= 7) return { text: `Due in ${d} days`, tone: 'soon' }
  return { text: `Due ${formatShort(key)}`, tone: 'later' }
}
