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
    <div style={{
      background: isProfit ? '#f0fdf4' : '#fef2f2',
      border: `2px solid ${isProfit ? '#86efac' : '#fca5a5'}`,
      borderRadius: 12,
      padding: 16,
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
      transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
      minWidth: 320,
      maxWidth: 400,
      transform: visible ? 'translateX(0)' : 'translateX(420px)',
      opacity: visible ? 1 : 0
    }}>
      {/* Close button */}
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <X size={16} color="#64748b" />
      </button>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8
      }}>
        <span style={{ fontSize: 20 }}>⚡</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
            Scalping Exit: {exit.symbol}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {formatTime(exit.exit_time)}
          </div>
        </div>
      </div>

      {/* Exit reason */}
      <div style={{
        fontSize: 12,
        marginBottom: 8,
        padding: '6px 10px',
        background: 'rgba(255,255,255,0.7)',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        <span style={{ fontWeight: 600 }}>Reason:</span>
        <span>{exitReasonLabels[exit.exit_reason] || exit.exit_reason}</span>
      </div>

      {/* Return */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
      }}>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          ₹{exit.entry_price.toFixed(2)} → ₹{exit.exit_price.toFixed(2)}
        </div>
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          color: isProfit ? '#15803d' : '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          {isProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          {isProfit ? '+' : ''}{exit.return_pct.toFixed(2)}%
        </div>
      </div>

      {/* Progress bar for visual feedback */}
      <div style={{
        height: 4,
        background: '#e2e8f0',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 8
      }}>
        <div style={{
          height: '100%',
          width: '100%',
          background: isProfit ? '#15803d' : '#dc2626',
          animation: 'progressShrink 10s linear'
        }} />
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
    setNotifications(prev => mergeBySymbol(prev, wsExits))
  }, [wsExits])

  const removeNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <>
      {notifications.map((exit, index) => (
        <div
          key={`${exit.symbol}-${exit.exit_time}-${index}`}
          style={{
            position: 'fixed',
            right: 20,
            top: 80 + (index * 120),
            zIndex: 9999
          }}
        >
          <ExitNotification 
            exit={exit} 
            onClose={() => removeNotification(index)} 
          />
        </div>
      ))}
    </>
  )
}
