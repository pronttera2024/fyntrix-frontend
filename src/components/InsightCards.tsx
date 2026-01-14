import React from 'react'

interface Insight {
  id: string
  type: 'opportunity' | 'warning' | 'trend' | 'analysis'
  title: string
  message: string
  actionable?: boolean
  metadata?: {
    symbol?: string
    score?: number
    change?: number
    timeframe?: string
  }
}

interface InsightCardsProps {
  insights: Insight[]
  onInsightClick?: (insight: Insight) => void
  onDismiss?: (id: string) => void
}

export const InsightCards: React.FC<InsightCardsProps> = ({ 
  insights, 
  onInsightClick,
  onDismiss 
}) => {
  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'opportunity':
        return {
          bg: '#dcfce7',
          border: '#16a34a',
          icon: '💡',
          color: '#166534'
        }
      case 'warning':
        return {
          bg: '#fef3c7',
          border: '#f59e0b',
          icon: '⚠️',
          color: '#92400e'
        }
      case 'trend':
        return {
          bg: '#dbeafe',
          border: '#3b82f6',
          icon: '📈',
          color: '#1e40af'
        }
      case 'analysis':
        return {
          bg: '#f3e8ff',
          border: '#a855f7',
          icon: '🔍',
          color: '#6b21a8'
        }
      default:
        return {
          bg: '#f1f5f9',
          border: '#64748b',
          icon: 'ℹ️',
          color: '#475569'
        }
    }
  }

  if (insights.length === 0) {
    return null
  }

  return (
    <div style={{
      display: 'grid',
      gap: 12
    }}>
      {insights.map((insight) => {
        const style = getInsightStyle(insight.type)
        
        return (
          <div
            key={insight.id}
            style={{
              background: style.bg,
              border: `2px solid ${style.border}`,
              borderRadius: 12,
              padding: 14,
              position: 'relative',
              cursor: onInsightClick ? 'pointer' : 'default',
              transition: 'all 0.2s'
            }}
            onClick={() => onInsightClick?.(insight)}
            onMouseEnter={(e) => {
              if (onInsightClick) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
              }
            }}
            onMouseLeave={(e) => {
              if (onInsightClick) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }
            }}
          >
            {/* Dismiss button */}
            {onDismiss && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDismiss(insight.id)
                }}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.05)',
                  border: 'none',
                  borderRadius: 4,
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: style.color,
                  opacity: 0.6
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
            )}

            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12
            }}>
              {/* Icon */}
              <div style={{
                fontSize: 24,
                flexShrink: 0,
                marginTop: 2
              }}>
                {style.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: style.color,
                  marginBottom: 4,
                  paddingRight: 20 // Space for dismiss button
                }}>
                  {insight.title}
                </div>

                <div style={{
                  fontSize: 13,
                  color: style.color,
                  opacity: 0.9,
                  lineHeight: 1.5,
                  marginBottom: insight.metadata ? 8 : 0
                }}>
                  {insight.message}
                </div>

                {/* Metadata */}
                {insight.metadata && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 8
                  }}>
                    {insight.metadata.symbol && (
                      <div style={{
                        background: 'rgba(0,0,0,0.08)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        color: style.color
                      }}>
                        {insight.metadata.symbol}
                      </div>
                    )}
                    {insight.metadata.score !== undefined && (
                      <div style={{
                        background: 'rgba(0,0,0,0.08)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        color: style.color
                      }}>
                        Score: {insight.metadata.score}%
                      </div>
                    )}
                    {insight.metadata.change !== undefined && (
                      <div style={{
                        background: 'rgba(0,0,0,0.08)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        color: style.color
                      }}>
                        {insight.metadata.change >= 0 ? '↑' : '↓'} {Math.abs(insight.metadata.change).toFixed(2)}%
                      </div>
                    )}
                    {insight.metadata.timeframe && (
                      <div style={{
                        background: 'rgba(0,0,0,0.08)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        color: style.color
                      }}>
                        {insight.metadata.timeframe}
                      </div>
                    )}
                  </div>
                )}

                {/* Actionable badge */}
                {insight.actionable && (
                  <div style={{
                    marginTop: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(255,255,255,0.6)',
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: style.color
                  }}>
                    ⚡ Actionable
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
