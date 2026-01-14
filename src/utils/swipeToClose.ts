import { useEffect, useRef } from 'react'

type SwipeToCloseOptions = {
  enabled: boolean
  onClose: () => void
  thresholdPx?: number
}

type SwipeHandlers = {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

export function useSwipeToClose(opts: SwipeToCloseOptions): SwipeHandlers {
  const startYRef = useRef<number | null>(null)
  const deltaYRef = useRef<number>(0)
  const activeRef = useRef<boolean>(false)

  const thresholdPx = typeof opts.thresholdPx === 'number' ? opts.thresholdPx : 80

  useEffect(() => {
    if (!opts.enabled) {
      startYRef.current = null
      deltaYRef.current = 0
      activeRef.current = false
    }
  }, [opts.enabled])

  const onTouchStart = (e: any) => {
    if (!opts.enabled) return
    try {
      const t = e.touches?.[0]
      if (!t) return
      startYRef.current = t.clientY
      deltaYRef.current = 0
      activeRef.current = true
    } catch {}
  }

  const onTouchMove = (e: any) => {
    if (!opts.enabled || !activeRef.current) return
    try {
      const t = e.touches?.[0]
      if (!t) return
      const startY = startYRef.current
      if (typeof startY !== 'number') return
      const dy = t.clientY - startY
      deltaYRef.current = dy
    } catch {}
  }

  const onTouchEnd = (_e: any) => {
    if (!opts.enabled) return
    try {
      const dy = deltaYRef.current
      startYRef.current = null
      deltaYRef.current = 0
      activeRef.current = false
      if (dy > thresholdPx) {
        opts.onClose()
      }
    } catch {}
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}
