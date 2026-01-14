import React, { useState, useEffect } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Clock, Target, Shield } from 'lucide-react'
import { json } from '../api'
import { classifyPickDirection, getPickThresholds } from '../utils/recommendation'

interface ScalpingPosition {
  symbol: string
  entry_time: string
  entry_date: string
  entry_price: number
  current_price: number
  return_pct: number
  elapsed_mins: number
  time_left_mins: number
  recommendation: string
  score_blend?: number
  exit_strategy: {
    target_price: number
    target_pct: number
    stop_loss_price: number
    stop_pct: number
    max_hold_mins: number
    trailing_stop?: {
      enabled?: boolean
      activation_pct?: number
      trail_distance_pct?: number
    }
    scalp_type: string
    description: string
  }
  status: string
  price_source?: string
}

interface ScalpingExit {
  symbol: string
  entry_time: string
  exit_time: string
  entry_price: number
  exit_price: number
  exit_reason: string
  return_pct: number
  hold_duration_mins: number
  time_since_exit_mins?: number
  status?: string
}

interface MonitorOccupancyWindowMetrics {
  window_days: number
  cycles_total: number
  cycles_with_positions: number
  occupancy_pct: number
  avg_active_positions: number
}

interface MonitorOccupancyResponse {
  status: string
  as_of_utc: string
  last_day?: MonitorOccupancyWindowMetrics
  last_week?: MonitorOccupancyWindowMetrics
}

interface ScalpingMonitorProps {
  onClose?: () => void
  livePrices?: Record<string, { last_price: number; change_percent?: number }>
  onSubscribeSymbols?: (symbols: string[]) => void
  onUnsubscribeSymbols?: (symbols: string[]) => void
  refreshToken?: number
}

export const ScalpingMonitor: React.FC<ScalpingMonitorProps> = ({ onClose, livePrices, onSubscribeSymbols, onUnsubscribeSymbols, refreshToken }) => {
  const [positions, setPositions] = useState<ScalpingPosition[]>([])
  const [recentExits, setRecentExits] = useState<ScalpingExit[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [topPicksMeta, setTopPicksMeta] = useState<Array<{ as_of?: string; run_id?: string; universe?: string; mode?: string }> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [monitorOccupancy, setMonitorOccupancy] = useState<MonitorOccupancyResponse | null>(null)
  const [monitorOccupancyError, setMonitorOccupancyError] = useState<string | null>(null)

  // Fetch active positions
  const fetchPositions = async () => {
    try {
      const data = await json<any>('/v1/scalping/active-positions?include_recent_exits=true&recent_exit_minutes=60')

      if (data && data.status === 'success') {
        const safePositions = Array.isArray(data.positions) ? data.positions : []
        setPositions(safePositions)

        const rawRecent = data.recent_exits
        const safeRecent: ScalpingExit[] = Array.isArray(rawRecent) ? rawRecent : []
        setRecentExits(safeRecent)

        const rawMeta = data.scalping_top_picks_meta
        let metaArray: Array<{ as_of?: string; run_id?: string; universe?: string; mode?: string }> = []
        if (Array.isArray(rawMeta)) metaArray = rawMeta
        else if (rawMeta && typeof rawMeta === 'object') metaArray = [rawMeta]

        if (metaArray.length) {
          setTopPicksMeta(metaArray)
          // Use the freshest as_of as lastUpdate
          let best: Date | null = null
          for (const m of metaArray) {
            if (!m.as_of) continue
            const d = new Date(m.as_of)
            if (!Number.isNaN(d.getTime()) && (!best || d > best)) {
              best = d
            }
          }
          setLastUpdate(best || new Date())
        } else {
          setTopPicksMeta(null)
          setLastUpdate(new Date())
        }

        setError(null)
      }
    } catch (error) {
      console.error('Failed to fetch scalping positions:', error)
      setPositions([])
      setRecentExits([])
      setTopPicksMeta(null)
      setLastUpdate(new Date())
      setError('Scalping monitor data is temporarily unavailable. Please try again in a minute.')
    } finally {
      setLoading(false)
    }
  }

  const fetchMonitorOccupancy = async () => {
    try {
      const data = await json<MonitorOccupancyResponse>('/v1/scalping/monitor-occupancy')
      if (data && data.status === 'success') {
        setMonitorOccupancy(data)
        setMonitorOccupancyError(null)
      } else {
        setMonitorOccupancy(null)
      }
    } catch (err) {
      console.error('Failed to fetch scalping monitor occupancy:', err)
      setMonitorOccupancy(null)
      setMonitorOccupancyError('Monitor occupancy stats are temporarily unavailable.')
    }
  }

  // Determine India cash-market open status (9:15 AM - 3:30 PM IST, Mon-Fri)
  const computeIndiaMarketOpen = () => {
    const now = new Date()
    const day = now.getDay() // 0=Sun, 6=Sat
    const isWeekday = day >= 1 && day <= 5
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const currentTime = hours * 60 + minutes
    const marketOpen = 9 * 60 + 15
    const marketClose = 15 * 60 + 30
    return isWeekday && currentTime >= marketOpen && currentTime <= marketClose
  }

  const isIndiaMarketOpen = computeIndiaMarketOpen()

  const pickThresholds = getPickThresholds('Scalping')

  // Manual trigger monitoring
  const triggerMonitoring = async () => {
    setRefreshing(true)
    try {
      // Trigger backend monitoring
      const data = await json<any>('/v1/scalping/monitor?manual=true', {
        method: 'POST'
      })
      
      console.log('Manual monitoring triggered:', data)
      
      // Refresh positions after monitoring
      await fetchPositions()
      await fetchMonitorOccupancy()
      
      // Show notification if exits detected
      if (data.exits_detected > 0) {
        alert(`✅ ${data.exits_detected} position(s) exited!`)
      }
    } catch (error) {
      console.error('Failed to trigger monitoring:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchPositions()
    fetchMonitorOccupancy()

    const interval = setInterval(() => {
      fetchPositions()
    }, 30000) // 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!refreshToken) return
    fetchPositions()
  }, [refreshToken])

  // Subscribe to symbols of active positions for live ticks
  useEffect(() => {
    if (!onSubscribeSymbols || !onUnsubscribeSymbols) return
    if (!positions.length) return
    const symbols = Array.from(new Set(positions.map(p => p.symbol).filter(Boolean)))
    if (!symbols.length) return
    onSubscribeSymbols(symbols)
    return () => {
      onUnsubscribeSymbols(symbols)
    }
  }, [positions, onSubscribeSymbols, onUnsubscribeSymbols])

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return isoString
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: 1180,
        width: '96vw',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, #0095FF 0%, #10C8A9 100%)',
          color: '#ffffff',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#ffffff' }}>
              ⚡ Scalping Monitor
              {isIndiaMarketOpen && positions.length > 0 && (
                <span style={{
                  background: '#ecfdf5',
                  color: '#047857',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  {positions.length} Active
                </span>
              )}
            </h2>
            {lastUpdate && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
                {isIndiaMarketOpen
                  ? (topPicksMeta && topPicksMeta.length > 0
                      ? (() => {
                          const parts = topPicksMeta.map((m) => {
                            const uni = (m.universe || 'nifty50').toUpperCase()
                            const timeStr = m.as_of ? new Date(m.as_of).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : lastUpdate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            return `${uni} at ${timeStr}`
                          })
                          return `Aligned with latest scalping picks: ${parts.join(', ')}`
                        })()
                      : `Last updated: ${lastUpdate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`)
                  : 'Markets are closed. Scalping signals were valid during the last trading session. Fresh setups will appear when markets reopen.'}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={triggerMonitoring}
              disabled={refreshing}
              style={{
                padding: '8px 16px',
                background: refreshing ? '#e2e8f0' : 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)',
                color: refreshing ? '#64748b' : '#ffffff',
                border: 'none',
                borderRadius: 8,
                cursor: refreshing ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: refreshing ? 'none' : '0 4px 10px rgba(0,149,255,0.35)',
              }}
            >
              <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Checking...' : 'Check Now'}
            </button>
            
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: '#f1f5f9',
                color: '#475569',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 16
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
              <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ marginTop: 12 }}>Loading positions...</div>
            </div>
          ) : error ? (
            <div style={{
              textAlign: 'center',
              padding: 60,
              color: '#b91c1c',
              background: '#fef2f2',
              borderRadius: 12,
              border: '1px solid #fecaca'
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                Scalping monitor is temporarily unavailable
              </div>
              <div style={{ fontSize: 13, maxWidth: 520, margin: '0 auto' }}>
                {error}
              </div>
            </div>
          ) : (
            <>
              {positions.length === 0 && recentExits.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: 60,
                  color: '#64748b',
                  background: '#f8fafc',
                  borderRadius: 12
                }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                    No Active Scalping Positions
                  </div>
                  <div style={{ fontSize: 14, maxWidth: 520, margin: '0 auto' }}>
                    {isIndiaMarketOpen
                      ? 'Scalping entries only appear here when ARIS finds fresh, high-confidence setups from your Top Five Picks. When a new scalp is triggered, it will be tracked live in this monitor.'
                      : topPicksMeta && topPicksMeta.length > 0
                        ? 'All scalping setups from the last trading session have already hit their exits or expired, so there are no open positions to track. You can review how they performed under the Winning Trades section.'
                        : 'Markets are closed and there are no open scalping positions from the last session. New opportunities will appear here automatically once markets reopen and fresh Scalping picks are generated.'}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{
                    marginBottom: 12,
                    fontSize: 11,
                    color: '#64748b',
                    background: '#f8fafc',
                    borderRadius: 8,
                    padding: 8,
                    border: '1px dashed #cbd5e1'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      Scalping thresholds (score_blend)
                    </div>
                    <div>
                      {(() => {
                        const sb = Math.round(pickThresholds.strongBuyMin)
                        const b = Math.round(pickThresholds.buyMin)
                        const s = pickThresholds.sellMax != null ? Math.round(pickThresholds.sellMax) : null
                        const ss = pickThresholds.strongSellMax != null ? Math.round(pickThresholds.strongSellMax) : null
                        if (s == null || ss == null) {
                          return `Strong Buy: >= ${sb}, Buy: ${b}-${sb - 1}`
                        }
                        return `Strong Buy: >= ${sb}, Buy: ${b}-${sb - 1}, Sell: ${ss + 1}-${s}, Strong Sell: <= ${ss}`
                      })()}
                    </div>
                  </div>
                  {positions.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                        Open scalps
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gap: 12,
                          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))'
                        }}
                      >
                        {positions.map((pos, idx) => (
                          <ScalpingPositionCard
                            key={`${pos.symbol}-${idx}`}
                            position={pos}
                            liveTick={livePrices?.[pos.symbol]}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {recentExits.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                        Closed scalps (last 60 mins)
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gap: 10,
                          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
                        }}
                      >
                        {recentExits.map((exit, idx) => {
                          const hasReturn = typeof exit.return_pct === 'number' && Number.isFinite(exit.return_pct)
                          const isWin = hasReturn && exit.return_pct >= 0

                          const rawReason = String(exit.exit_reason || 'EXIT').toUpperCase()
                          let reasonLabel = rawReason
                          let reasonDescription = ''
                          switch (rawReason) {
                            case 'TARGET_HIT':
                              reasonLabel = 'Target achieved'
                              reasonDescription = 'Booking profits as per scalping target.'
                              break
                            case 'STOP_LOSS':
                              reasonLabel = 'Stop loss triggered'
                              reasonDescription = 'Exit to protect downside as per stop loss.'
                              break
                            case 'TIME_EXIT':
                              reasonLabel = 'Time-based exit'
                              reasonDescription = 'Exited after max hold time elapsed.'
                              break
                            case 'EOD_AUTO_EXIT':
                              reasonLabel = 'End-of-day exit'
                              reasonDescription = 'Safety exit at market close.'
                              break
                            default:
                              reasonLabel = rawReason || 'Exit'
                              reasonDescription = ''
                          }

                          return (
                            <div
                              key={`${exit.symbol}-${exit.exit_time}-${idx}`}
                              style={{
                                padding: 16,
                                background: isWin ? '#f0fdf4' : '#fef2f2',
                                borderRadius: 10,
                                border: `1px solid ${isWin ? '#bbf7d0' : '#fecaca'}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>
                                  {exit.symbol}
                                </div>
                                <div style={{
                                  fontSize: 11,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: '#e2e8f0',
                                  color: '#475569'
                                }}>
                                  {reasonLabel}
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {isWin ? <TrendingUp size={14} color="#15803d" /> : <TrendingDown size={14} color="#b91c1c" />}
                                  <span style={{ fontWeight: 600, color: isWin ? '#15803d' : '#b91c1c' }}>
                                    {hasReturn
                                      ? `${isWin ? '+' : ''}${exit.return_pct.toFixed(2)}%`
                                      : '--'}
                                  </span>
                                  <span style={{ color: '#64748b' }}>
                                    • Hold {Math.round(exit.hold_duration_mins)} mins
                                  </span>
                                </div>
                                <div style={{ textAlign: 'right', color: '#64748b' }}>
                                  <div>
                                    Exited at {formatTime(exit.exit_time)}
                                  </div>
                                  {typeof exit.time_since_exit_mins === 'number' && (
                                    <div style={{ fontSize: 11 }}>
                                      {exit.time_since_exit_mins.toFixed(1)} mins ago
                                    </div>
                                  )}
                                </div>
                              </div>
                              {reasonDescription && (
                                <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>
                                  {reasonDescription}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div style={{
                marginTop: 8,
                fontSize: 11,
                color: '#64748b',
                background: '#f8fafc',
                borderRadius: 8,
                padding: 12,
                border: '1px dashed #cbd5e1'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  Monitor Occupancy
                </div>
                {monitorOccupancy ? (
                  <>
                    {monitorOccupancy.last_day && (() => {
                      const ld = monitorOccupancy.last_day
                      const occ = typeof ld.occupancy_pct === 'number' && Number.isFinite(ld.occupancy_pct)
                        ? ld.occupancy_pct.toFixed(2)
                        : '--'
                      const avg = typeof ld.avg_active_positions === 'number' && Number.isFinite(ld.avg_active_positions)
                        ? ld.avg_active_positions.toFixed(2)
                        : '--'
                      return (
                        <div>
                          Last day (24h): {occ}% of cycles had at least one scalping position (avg {avg} active).
                        </div>
                      )
                    })()}
                    {monitorOccupancy.last_week && (() => {
                      const lw = monitorOccupancy.last_week
                      const occ = typeof lw.occupancy_pct === 'number' && Number.isFinite(lw.occupancy_pct)
                        ? lw.occupancy_pct.toFixed(2)
                        : '--'
                      const avg = typeof lw.avg_active_positions === 'number' && Number.isFinite(lw.avg_active_positions)
                        ? lw.avg_active_positions.toFixed(2)
                        : '--'
                      return (
                        <div>
                          Last week (7 days): {occ}% of cycles had positions (avg {avg} active).
                        </div>
                      )
                    })()}
                  </>
                ) : monitorOccupancyError ? (
                  <div>{monitorOccupancyError}</div>
                ) : (
                  <div>Loading occupancy stats...</div>
                )}
                <div style={{ marginTop: 4 }}>
                  Scalping entries are short-lived and event-driven. It is normal for many monitor checks to show no active positions between bursts of activity.
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

const ScalpingPositionCard: React.FC<{ position: ScalpingPosition; liveTick?: { last_price?: number; change_percent?: number } }> = ({ position, liveTick }) => {
  // Defensive: Validate exit_strategy exists with required fields
  if (!position.exit_strategy || 
      typeof position.exit_strategy.target_price !== 'number' || 
      typeof position.exit_strategy.stop_loss_price !== 'number' ||
      typeof position.exit_strategy.max_hold_mins !== 'number') {
    return (
      <div style={{
        padding: 20,
        background: '#fef2f2',
        border: '2px solid #fca5a5',
        borderRadius: 12,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
          {position.symbol}
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Incomplete position data - exit strategy missing
        </div>
      </div>
    )
  }

  const rawTrailing = position.exit_strategy.trailing_stop || {}
  const trailingStop = {
    enabled: !!rawTrailing.enabled,
    activation_pct: typeof rawTrailing.activation_pct === 'number' ? rawTrailing.activation_pct : 0,
    trail_distance_pct: typeof rawTrailing.trail_distance_pct === 'number' ? rawTrailing.trail_distance_pct : 0
  }

  const entryPrice =
    typeof position.entry_price === 'number' && Number.isFinite(position.entry_price) && position.entry_price > 0
      ? position.entry_price
      : 0

  const backendPrice =
    typeof position.current_price === 'number' && Number.isFinite(position.current_price) && position.current_price > 0
      ? position.current_price
      : entryPrice

  const tickPrice =
    typeof liveTick?.last_price === 'number' && Number.isFinite(liveTick.last_price) && liveTick.last_price > 0
      ? liveTick.last_price
      : undefined

  const rawPriceSource = (position.price_source || '').toLowerCase()

  // If backend explicitly says "entry" and we have no live tick, treat this as
  // "no market price yet" rather than fabricating a 0.00% P&L.
  const hasLiveTickPrice = typeof tickPrice === 'number'
  const hasBackendMarketPrice =
    typeof backendPrice === 'number' &&
    backendPrice > 0 &&
    rawPriceSource &&
    rawPriceSource !== 'entry'

  const effectivePrice = hasLiveTickPrice ? tickPrice : hasBackendMarketPrice ? backendPrice : undefined

  const rec = String(position.recommendation || '').toLowerCase()
  const isLong = !rec || rec === 'buy' || rec === 'strong buy'

  const scoreBlend = typeof position.score_blend === 'number' ? position.score_blend : undefined
  const direction =
    typeof scoreBlend === 'number' ? classifyPickDirection(scoreBlend, 'Scalping') : null
  const directionLabel = direction?.label || position.recommendation

  let effectiveReturnPct: number | undefined
  if (effectivePrice && entryPrice > 0) {
    const rawPct = ((effectivePrice - entryPrice) / entryPrice) * 100
    effectiveReturnPct = isLong ? rawPct : -rawPct
  } else if (
    typeof position.return_pct === 'number' &&
    Number.isFinite(position.return_pct) &&
    rawPriceSource &&
    rawPriceSource !== 'entry'
  ) {
    // Only trust backend return_pct when it is not based purely on entry price
    effectiveReturnPct = position.return_pct
  }

  const hasPnl = typeof effectiveReturnPct === 'number' && Number.isFinite(effectiveReturnPct)
  const safeEffectiveReturnPct: number = hasPnl ? (effectiveReturnPct as number) : 0
  const isProfit = hasPnl && safeEffectiveReturnPct >= 0

  let targetDistance = 0
  let stopDistance = 0
  if (effectivePrice && effectivePrice > 0) {
    targetDistance = ((position.exit_strategy.target_price - effectivePrice) / effectivePrice) * 100
    stopDistance = ((effectivePrice - position.exit_strategy.stop_loss_price) / effectivePrice) * 100
  }

  const maxHoldMins =
    typeof position.exit_strategy.max_hold_mins === 'number' && Number.isFinite(position.exit_strategy.max_hold_mins)
      ? position.exit_strategy.max_hold_mins
      : 0

  const elapsedMins =
    typeof position.elapsed_mins === 'number' && Number.isFinite(position.elapsed_mins)
      ? position.elapsed_mins
      : 0

  const rawTimeLeftMins =
    typeof position.time_left_mins === 'number' && Number.isFinite(position.time_left_mins)
      ? position.time_left_mins
      : Math.max(0, maxHoldMins - elapsedMins)

  const timeProgress =
    maxHoldMins > 0 ? Math.min(100, Math.max(0, (elapsedMins / maxHoldMins) * 100)) : 0

  const targetProgressPct =
    effectivePrice && effectivePrice > 0 && position.exit_strategy.target_pct > 0
      ? Math.min(100, Math.max(0, ((position.exit_strategy.target_pct - targetDistance) / position.exit_strategy.target_pct) * 100))
      : 0

  const stopProgressPct =
    effectivePrice && effectivePrice > 0 && position.exit_strategy.stop_pct > 0
      ? Math.max(0, Math.min(100, (stopDistance / position.exit_strategy.stop_pct) * 100))
      : 0

  // Determine urgency
  const isNearTarget = effectivePrice && effectivePrice > 0 && Math.abs(targetDistance) < 0.1
  const isNearStop = effectivePrice && effectivePrice > 0 && stopDistance < 0.15
  const isTimeRunningOut = rawTimeLeftMins < 10

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return isoString
    }
  }

  return (
    <div style={{
      padding: 16,
      background: isProfit ? '#f0fdf4' : '#fef2f2',
      border: `2px solid ${isProfit ? '#86efac' : '#fca5a5'}`,
      borderRadius: 12,
      position: 'relative',
      maxWidth: '100%'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {position.symbol}
            </div>
            <div
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                background: isLong ? '#dcfce7' : '#fee2e2',
                color: isLong ? '#166534' : '#991b1b',
                border: `1px solid ${isLong ? '#bbf7d0' : '#fecaca'}`,
                whiteSpace: 'nowrap',
              }}
            >
              {isLong ? 'Long scalp' : 'Short scalp'}
            </div>
            {directionLabel && (
              <div
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 600,
                  background: direction?.side === 'short' ? '#fee2e2' : '#dcfce7',
                  color: direction?.side === 'short' ? '#991b1b' : '#166534',
                  border: `1px solid ${direction?.side === 'short' ? '#fecaca' : '#bbf7d0'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {directionLabel}
              </div>
            )}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} />
            Entry: {formatTime(position.entry_time)} @ ₹{entryPrice.toFixed(2)}
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: hasPnl ? (isProfit ? '#15803d' : '#dc2626') : '#64748b'
            }}
          >
            {hasPnl && effectiveReturnPct !== undefined
              ? `${isProfit ? '+' : ''}${effectiveReturnPct.toFixed(2)}%`
              : '--'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {effectivePrice && effectivePrice > 0 ? `₹${effectivePrice.toFixed(2)}` : 'Awaiting live price'}
          </div>
          {(!effectivePrice || !hasPnl) && (
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
              Using entry price as placeholder until first market tick arrives
            </div>
          )}
        </div>
      </div>

      {/* Strategy Info */}
      <div style={{
        background: 'rgba(255,255,255,0.7)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        fontSize: 11,
        color: '#475569'
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {position.exit_strategy.description}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Target size={12} />
            Target: ₹{position.exit_strategy.target_price.toFixed(2)} (+{position.exit_strategy.target_pct}%)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Shield size={12} />
            Stop: ₹{position.exit_strategy.stop_loss_price.toFixed(2)} (-{position.exit_strategy.stop_pct}%)
          </div>
        </div>
      </div>

      {/* Progress Indicators */}
      <div style={{ display: 'grid', gap: 8, maxWidth: 560, margin: '0 auto' }}>
        {/* Target Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: '#64748b' }}>To Target</span>
            <span style={{ fontWeight: 600, color: isNearTarget ? '#15803d' : '#64748b' }}>
              {typeof effectivePrice === 'number' && effectivePrice > 0
                ? (targetDistance > 0 ? `${targetDistance.toFixed(2)}%` : 'Target Hit!')
                : '--'}
            </span>
          </div>
          <div style={{
            height: 6,
            background: '#e2e8f0',
            borderRadius: 3,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${targetProgressPct}%`,
              background: isNearTarget ? '#15803d' : '#3b82f6',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Stop Distance */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: '#64748b' }}>From Stop</span>
            <span style={{ fontWeight: 600, color: isNearStop ? '#dc2626' : '#64748b' }}>
              {typeof effectivePrice === 'number' && effectivePrice > 0 ? `${stopDistance.toFixed(2)}%` : '--'}
            </span>
          </div>
          <div style={{
            height: 6,
            background: '#e2e8f0',
            borderRadius: 3,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${stopProgressPct}%`,
              background: isNearStop ? '#dc2626' : '#64748b',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Time Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: '#64748b' }}>Time Left</span>
            <span style={{ fontWeight: 600, color: isTimeRunningOut ? '#f59e0b' : '#64748b' }}>
              {Number.isFinite(rawTimeLeftMins) ? `${Math.floor(rawTimeLeftMins)} mins` : '--'}
            </span>
          </div>
          <div style={{
            height: 6,
            background: '#e2e8f0',
            borderRadius: 3,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.max(0, Math.min(100, 100 - timeProgress))}%`,
              background: isTimeRunningOut ? '#f59e0b' : '#8b5cf6',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Trailing Stop Info */}
      {trailingStop.enabled && hasPnl && safeEffectiveReturnPct >= trailingStop.activation_pct && (
        <div style={{
          marginTop: 12,
          padding: 8,
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid #fbbf24',
          borderRadius: 6,
          fontSize: 11,
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <TrendingUp size={14} />
          <span style={{ fontWeight: 600 }}>Trailing Stop Active!</span>
          <span>Will exit if profit drops below {(safeEffectiveReturnPct - trailingStop.trail_distance_pct).toFixed(2)}%</span>
        </div>
      )}

      {/* Warnings */}
      {isNearStop && (
        <div style={{
          marginTop: 8,
          padding: 8,
          background: 'rgba(220, 38, 38, 0.1)',
          border: '1px solid #dc2626',
          borderRadius: 6,
          fontSize: 11,
          color: '#dc2626',
          fontWeight: 600
        }}>
          ⚠️ Near stop loss! Consider exiting manually.
        </div>
      )}
    </div>
  )
}
