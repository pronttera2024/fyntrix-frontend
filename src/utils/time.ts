type DateInput = Date | string | number | null | undefined

type FormatIstDateOptions = {
  weekday?: 'short' | 'long'
}

function toDate(v: DateInput): Date | null {
  if (!v) return null
  try {
    const d = v instanceof Date ? v : new Date(v)
    if (Number.isNaN(d.getTime())) return null
    return d
  } catch {
    return null
  }
}

function istDateKey(d: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d)

    const y = parts.find((p) => p.type === 'year')?.value
    const m = parts.find((p) => p.type === 'month')?.value
    const day = parts.find((p) => p.type === 'day')?.value
    return `${y}-${m}-${day}`
  } catch {
    const offsetMs = 5.5 * 60 * 60 * 1000
    const dt = new Date(d.getTime() + offsetMs)
    const y = dt.getUTCFullYear()
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const day = String(dt.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
}

function istMinutes(d: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d)

    const h = Number(parts.find((p) => p.type === 'hour')?.value || '0')
    const m = Number(parts.find((p) => p.type === 'minute')?.value || '0')
    return h * 60 + m
  } catch {
    const offsetMs = 5.5 * 60 * 60 * 1000
    const dt = new Date(d.getTime() + offsetMs)
    return dt.getUTCHours() * 60 + dt.getUTCMinutes()
  }
}

function previousIstDateKey(now: Date): string {
  const offsetMs = 5.5 * 60 * 60 * 1000
  let t = now.getTime()
  for (let i = 0; i < 10; i++) {
    t -= 24 * 60 * 60 * 1000
    const dt = new Date(t + offsetMs)
    const dow = dt.getUTCDay() // 0 Sun ... 6 Sat
    if (dow >= 1 && dow <= 5) {
      const y = dt.getUTCFullYear()
      const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
      const day = String(dt.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  }
  return istDateKey(now)
}

export function formatIstDate(input: DateInput, opts?: FormatIstDateOptions): string {
  const d = toDate(input)
  if (!d) return ''
  try {
    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: '2-digit',
      ...(opts?.weekday ? { weekday: opts.weekday } : {}),
    })
  } catch {
    return d.toDateString()
  }
}

export function formatIstTime(input: DateInput): string {
  const d = toDate(input)
  if (!d) return ''
  try {
    return d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return ''
  }
}

export function isWithinTodayIst(input: DateInput): boolean {
  const d = toDate(input)
  if (!d) return false
  const now = new Date()
  return istDateKey(d) === istDateKey(now)
}

export function isWithinLastTradingSessionIst(input: DateInput): boolean {
  const d = toDate(input)
  if (!d) return false

  const now = new Date()
  const nowKey = istDateKey(now)

  // Determine if today is a trading day in IST
  const offsetMs = 5.5 * 60 * 60 * 1000
  const nowIst = new Date(now.getTime() + offsetMs)
  const dow = nowIst.getUTCDay()
  const isWeekday = dow >= 1 && dow <= 5

  // Market hours: 9:15 - 15:30 IST
  const minutes = istMinutes(now)
  const marketOpen = 9 * 60 + 15

  let sessionKey: string
  if (!isWeekday) {
    sessionKey = previousIstDateKey(now)
  } else if (minutes < marketOpen) {
    sessionKey = previousIstDateKey(now)
  } else {
    sessionKey = nowKey
  }

  return istDateKey(d) === sessionKey
}
