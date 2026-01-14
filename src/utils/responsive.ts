import { useEffect, useState } from 'react'

export const LAYOUT_TOKENS = {
  bottomNavHeight: 64,
  zIndex: {
    sheet: 250,
  },
} as const

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl'

function computeBreakpoint(width: number): Breakpoint {
  if (width < 768) return 'sm'
  if (width < 1024) return 'md'
  if (width < 1280) return 'lg'
  return 'xl'
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'lg'
    return computeBreakpoint(window.innerWidth)
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onResize = () => {
      setBp(computeBreakpoint(window.innerWidth))
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return bp
}
