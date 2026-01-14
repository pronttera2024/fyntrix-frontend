type ErrorContext = {
  feature?: string
  action?: string
  url?: string
  extra?: any
}

export function reportError(err: unknown, context?: ErrorContext) {
  try {
    const e = err instanceof Error ? err : new Error(String(err))
    // Keep this lightweight: console only for now
    console.error('[ARISE] Error', {
      message: e.message,
      stack: e.stack,
      context: context || {},
    })
  } catch {
    // never throw from error reporting
  }
}
