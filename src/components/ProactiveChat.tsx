import React, { useEffect, useState } from 'react'

interface ProactiveMessage {
  id: string
  message: string
  type: 'suggestion' | 'alert' | 'tip' | 'question'
  timestamp: number
  autoShow?: boolean
}

interface ProactiveChatProps {
  messages: ProactiveMessage[]
  onMessageClick?: (message: ProactiveMessage) => void
  onDismiss?: (id: string) => void
  position?: 'bottom-right' | 'bottom-left'
}

export const ProactiveChat: React.FC<ProactiveChatProps> = ({
  messages,
  onMessageClick,
  onDismiss,
  position = 'bottom-right'
}) => {
  const [visible, setVisible] = useState<string[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    messages.forEach((msg) => {
      if (msg.autoShow && !dismissed.has(msg.id) && !visible.includes(msg.id)) {
        // Show message after a small delay
        setTimeout(() => {
          setVisible((prev) => [...prev, msg.id])
        }, 500)
      }
    })
  }, [messages, dismissed, visible])

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]))
    setVisible((prev) => prev.filter((v) => v !== id))
    onDismiss?.(id)
  }

  const visibleMessages = messages.filter(
    (msg) => visible.includes(msg.id) && !dismissed.has(msg.id)
  )

  if (visibleMessages.length === 0) {
    return null
  }

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'alert':
        return {
          bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '#f59e0b',
          icon: '🔔',
          color: '#92400e'
        }
      case 'tip':
        return {
          bg: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          border: '#3b82f6',
          icon: '💡',
          color: '#1e40af'
        }
      case 'question':
        return {
          bg: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
          border: '#a855f7',
          icon: '🤔',
          color: '#6b21a8'
        }
      default: // suggestion
        return {
          bg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
          border: '#16a34a',
          icon: '✨',
          color: '#166534'
        }
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        [position === 'bottom-right' ? 'right' : 'left']: 24,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        maxWidth: 360,
        width: '100%'
      }}
    >
      {visibleMessages.map((msg, idx) => {
        const style = getTypeStyle(msg.type)
        
        return (
          <div
            key={msg.id}
            style={{
              background: style.bg,
              border: `2px solid ${style.border}`,
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              cursor: onMessageClick ? 'pointer' : 'default',
              animation: 'slideInUp 0.3s ease-out',
              animationDelay: `${idx * 0.1}s`,
              animationFillMode: 'both',
              position: 'relative'
            }}
            onClick={() => onMessageClick?.(msg)}
          >
            {/* ARIS Avatar */}
            <div style={{
              position: 'absolute',
              top: -12,
              left: 16,
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              border: '3px solid #fff'
            }}>
              🤖
            </div>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDismiss(msg.id)
              }}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                borderRadius: 6,
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 14,
                color: style.color,
                opacity: 0.6,
                fontWeight: 700
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.background = 'rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.6'
                e.currentTarget.style.background = 'rgba(0,0,0,0.05)'
              }}
            >
              ×
            </button>

            <div style={{ marginTop: 16 }}>
              {/* Type badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(255,255,255,0.7)',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                color: style.color,
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <span style={{ fontSize: 14 }}>{style.icon}</span>
                ARIS {msg.type}
              </div>

              {/* Message */}
              <div style={{
                fontSize: 14,
                color: style.color,
                lineHeight: 1.6,
                fontWeight: 500
              }}>
                {msg.message}
              </div>

              {/* Click hint */}
              {onMessageClick && (
                <div style={{
                  marginTop: 10,
                  fontSize: 11,
                  color: style.color,
                  opacity: 0.7,
                  fontStyle: 'italic'
                }}>
                  👆 Click to explore
                </div>
              )}
            </div>
          </div>
        )
      })}

      <style>
        {`
          @keyframes slideInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  )
}
