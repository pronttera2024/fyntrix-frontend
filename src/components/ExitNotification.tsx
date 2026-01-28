import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, X } from 'lucide-react'

interface ExitAlert {
  symbol: string
  exit_reason: string
  return_pct: number
  exit_price: number
  entry_price: number
  exit_time: string
}

interface ExitNotificationProps {
  exit: ExitAlert
  onClose: () => void
}

export const ExitNotification: React.FC<ExitNotificationProps> = ({ exit, onClose }) => {
  const isProfit = exit.return_pct >= 0
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setVisible(true), 10)

    // Auto-close after 10 seconds
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, 10000)

    return () => clearTimeout(timer)
  }, [onClose])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const exitReasonLabels: Record<string, string> = {
    'TARGET_HIT': '🎯 Target Hit',
    'STOP_LOSS': '🛡️ Stop Loss',
    'TIME_EXIT': '⏰ Time Exit',
    'TRAILING_STOP': '📈 Trailing Stop',
    'EOD_AUTO_EXIT': '🌆 EOD Auto-Exit'
  }

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className={`
      relative p-4 rounded-xl shadow-lg transition-all duration-300 ease-out
      min-w-[320px] max-w-[400px]
      ${visible ? 'translate-x-0 opacity-100' : 'translate-x-[420px] opacity-0'}
      ${isProfit 
        ? 'bg-green-50 border-2 border-green-300' 
        : 'bg-red-50 border-2 border-red-300'
      }
    `}
    style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 bg-transparent border-none cursor-pointer p-1 rounded flex items-center justify-center"
      >
        <X size={16} color="#64748b" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">⚡</span>
        <div>
          <div className="font-bold text-sm text-slate-900">
            Scalping Exit: {exit.symbol}
          </div>
          <div className="text-xs text-slate-500">
            {formatTime(exit.exit_time)}
          </div>
        </div>
      </div>

      {/* Exit reason */}
      <div className="text-xs mb-2 px-2.5 py-1.5 bg-white/70 rounded-md flex items-center gap-1.5">
        <span className="font-semibold">Reason:</span>
        <span>{exitReasonLabels[exit.exit_reason] || exit.exit_reason}</span>
      </div>

      {/* Return */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-slate-500">
          ₹{exit.entry_price.toFixed(2)} → ₹{exit.exit_price.toFixed(2)}
        </div>
        <div className={`
          text-xl font-bold flex items-center gap-1
          ${isProfit ? 'text-green-700' : 'text-red-600'}
        `}>
          {isProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          {isProfit ? '+' : ''}{exit.return_pct.toFixed(2)}%
        </div>
      </div>

      {/* Progress bar for visual feedback */}
      <div className="h-1 bg-slate-200 rounded-sm overflow-hidden mt-2">
        <div className={`
          h-full w-full
          ${isProfit ? 'bg-green-700' : 'bg-red-600'}
        `}
        style={{ animation: 'progressShrink 10s linear' }}
        />
      </div>

      <style>{`
        @keyframes progressShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

// Exit Notification Manager Component
interface ExitNotificationManagerProps {
  wsExits?: ExitAlert[]
}

export const ExitNotificationManager: React.FC<ExitNotificationManagerProps> = ({ wsExits }) => {
  const [notifications, setNotifications] = useState<ExitAlert[]>([])
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date())
  const [pendingNotifications, setPendingNotifications] = useState<ExitAlert[]>([])

  const mergeBySymbol = (current: ExitAlert[], incoming: ExitAlert[]): ExitAlert[] => {
    const all = [...current, ...incoming]
    const bySymbol = new Map<string, ExitAlert>()

    for (const e of all) {
      const existing = bySymbol.get(e.symbol)
      if (!existing) {
        bySymbol.set(e.symbol, e)
      } else {
        try {
          const existingTime = new Date(existing.exit_time).getTime()
          const newTime = new Date(e.exit_time).getTime()
          if (!Number.isNaN(newTime) && newTime > existingTime) {
            bySymbol.set(e.symbol, e)
          }
        } catch {
          // If parsing fails, keep existing
        }
      }
    }

    return Array.from(bySymbol.values())
  }

  useEffect(() => {
    // Check for new exits every minute
    const checkForNewExits = async () => {
      try {
        const response = await fetch('/v1/scalping/monitor?manual=false', {
          method: 'POST'
        })
        const data = await response.json()

        if (data.status === 'success' && data.exits_detected > 0) {
          // Add new exits to notifications
          const newExits = data.exits || []
          setNotifications(prev => mergeBySymbol(prev, newExits))
        }

        setLastCheckTime(new Date())
      } catch (error) {
        console.error('Failed to check for exits:', error)
      }
    }

    // Initial check
    checkForNewExits()

    // Check every 60 seconds
    const interval = setInterval(checkForNewExits, 60000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!wsExits || wsExits.length === 0) return
    const newExits = mergeBySymbol([], wsExits)
    setPendingNotifications(prev => mergeBySymbol(prev, newExits))
  }, [wsExits])

  // Stagger notification display to prevent them all appearing at once
  useEffect(() => {
    if (pendingNotifications.length === 0) return

    const timer = setTimeout(() => {
      const [next, ...rest] = pendingNotifications
      setNotifications(prev => {
        const updated = mergeBySymbol(prev, [next])
        // Keep only the latest 5 notifications to prevent screen clutter
        return updated.slice(-5)
      })
      setPendingNotifications(rest)
    }, 500) // 500ms delay between notifications

    return () => clearTimeout(timer)
  }, [pendingNotifications])

  const removeNotification = (symbol: string, exitTime: string) => {
    setNotifications(prev => prev.filter(n => !(n.symbol === symbol && n.exit_time === exitTime)))
  }

  return (
    <>
      {notifications.map((exit) => (
        <div
          key={`${exit.symbol}-${exit.exit_time}`}
          className="fixed right-5 z-50"
          style={{ top: `${80 + (notifications.indexOf(exit) * 120)}px` }}
        >
          <ExitNotification 
            exit={exit} 
            onClose={() => removeNotification(exit.symbol, exit.exit_time)} 
          />
        </div>
      ))}
    </>
  )
}
