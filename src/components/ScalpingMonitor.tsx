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
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-2 md:p-2">
      <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-[1180px] w-[96vw] md:w-[92vw] max-h-[92vh] md:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-6 py-[14px] md:py-[18px] border-b border-slate-200 flex flex-col md:justify-between gap-3 bg-gradient-to-r from-[#0095FF] to-[#10C8A9] text-white">
          <div>
            <div className='flex justify-between'>
              <h2 className="m-0 text-lg md:text-xl font-bold flex items-center gap-2 text-white">
                ⚡ Scalping Monitor
                {isIndiaMarketOpen && positions.length > 0 && (
                  <span className="bg-green-50 text-green-700 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs font-semibold">
                    {positions.length} Active
                  </span>
                )}
              </h2>

              <button
                onClick={onClose}
                className="px-2 py-1 md:px-4 md:py-2 bg-slate-100 text-slate-600 border-none rounded-lg cursor-pointer font-semibold text-sm"
              >
                <span className="hidden sm:inline">Close</span>
                <span className="sm:hidden">✕</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2 md:gap-3 items-center">
            {lastUpdate && (
              <div className="text-xs text-white/85 mt-2 md:mt-1">
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
            <button
              onClick={triggerMonitoring}
              disabled={refreshing}
              className={`px-3 py-1.5 md:px-4 md:py-2 border-none rounded-lg font-semibold text-sm flex items-center gap-1.5 transition-all ${refreshing
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#0095FF] to-[#10C8A9] text-white cursor-pointer shadow-[0_4px_10px_rgba(0,149,255,0.35)]'
                }`}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{refreshing ? 'Checking...' : 'Check Now'}</span>
              <span className="sm:hidden">{refreshing ? '...' : 'Check'}</span>
            </button>

          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 md:p-4">
          {loading ? (
            <div className="text-center py-12 md:py-15 text-slate-500">
              <RefreshCw size={28} className="animate-spin mx-auto" />
              <div className="mt-3 text-sm md:text-base">Loading positions...</div>
            </div>
          ) : error ? (
            <div className="text-center py-12 md:py-15 text-red-700 bg-red-50 rounded-xl border border-red-200">
              <div className="text-2xl md:text-3xl mb-2">⚠️</div>
              <div className="text-sm md:text-base font-semibold mb-1">
                Scalping monitor is temporarily unavailable
              </div>
              <div className="text-xs md:text-sm max-w-[400px] md:max-w-[520px] mx-auto">
                {error}
              </div>
            </div>
          ) : (
            <>
              {positions.length === 0 && recentExits.length === 0 ? (
                <div className="text-center py-12 md:py-15 text-slate-500 bg-slate-50 rounded-xl">
                  <div className="text-4xl md:text-5xl mb-3">⚡</div>
                  <div className="text-sm md:text-base font-semibold mb-1">
                    No Active Scalping Positions
                  </div>
                  <div className="text-xs md:text-sm max-w-[400px] md:max-w-[520px] mx-auto">
                    {isIndiaMarketOpen
                      ? 'Scalping entries only appear here when ARIS finds fresh, high-confidence setups from your Top Five Picks. When a new scalp is triggered, it will be tracked live in this monitor.'
                      : topPicksMeta && topPicksMeta.length > 0
                        ? 'All scalping setups from the last trading session have already hit their exits or expired, so there are no open positions to track. You can review how they performed under the Winning Trades section.'
                        : 'Markets are closed and there are no open scalping positions from the last session. New opportunities will appear here automatically once markets reopen and fresh Scalping picks are generated.'}
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 text-xs text-slate-500 bg-slate-50 rounded-lg p-2 md:p-3 border border-dashed border-slate-300">
                    <div className="font-semibold mb-0.5">
                      Scalping thresholds (score_blend)
                    </div>
                    <div className="text-xs">
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
                    <div className="mb-4 md:mb-6">
                      <div className="text-sm font-semibold mb-2">
                        Open scalps
                      </div>
                      <div className="grid gap-3 md:gap-3 grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(340px,1fr))]">
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
                    <div className="mb-4 md:mb-6">
                      <div className="text-sm font-semibold mb-2">
                        Closed scalps (last 60 mins)
                      </div>
                      <div className="grid gap-2 md:gap-2.5 grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
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
                              className={`p-3 md:p-4 rounded-xl border flex flex-col gap-1.5 ${isWin
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                                }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="text-sm font-semibold">
                                  {exit.symbol}
                                </div>
                                <div className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                  {reasonLabel}
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-1">
                                  {isWin ? <TrendingUp size={12} color="#15803d" /> : <TrendingDown size={12} color="#b91c1c" />}
                                  <span className={`font-semibold ${isWin ? 'text-green-700' : 'text-red-700'}`}>
                                    {hasReturn
                                      ? `${isWin ? '+' : ''}${exit.return_pct.toFixed(2)}%`
                                      : '--'}
                                  </span>
                                  <span className="text-slate-500">
                                    • Hold {Math.round(exit.hold_duration_mins)} mins
                                  </span>
                                </div>
                                <div className="text-right text-slate-500">
                                  <div>
                                    Exited at {formatTime(exit.exit_time)}
                                  </div>
                                  {typeof exit.time_since_exit_mins === 'number' && (
                                    <div className="text-[11px]">
                                      {exit.time_since_exit_mins.toFixed(1)} mins ago
                                    </div>
                                  )}
                                </div>
                              </div>
                              {reasonDescription && (
                                <div className="mt-1 text-xs text-slate-500">
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

              <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 md:p-4 border border-dashed border-slate-300">
                <div className="font-semibold mb-1">
                  Monitor Occupancy
                </div>
                <div className="text-xs space-y-1">
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
                  <div className="mt-1">
                    Scalping entries are short-lived and event-driven. It is normal for many monitor checks to show no active positions between bursts of activity.
                  </div>
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
      <div className="p-5 bg-red-50 border-2 border-red-300 rounded-xl text-center">
        <div className="text-base font-semibold text-red-600 mb-2">
          {position.symbol}
        </div>
        <div className="text-xs text-slate-500">
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
    <div className={`p-3 md:p-4 rounded-xl border-2 relative max-w-full ${isProfit ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
      }`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
            <div className="text-base md:text-lg font-bold">
              {position.symbol}
            </div>
            <div className="flex flex-wrap gap-1">
              <div
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.4px] border whitespace-nowrap ${isLong
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : 'bg-red-50 text-red-800 border-red-200'
                  }`}
              >
                {isLong ? 'Long scalp' : 'Short scalp'}
              </div>
              {directionLabel && (
                <div
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${direction?.side === 'short'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-green-50 text-green-800 border-green-200'
                    }`}
                >
                  {directionLabel}
                </div>
              )}
            </div>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Clock size={12} />
            Entry: {formatTime(position.entry_time)} @ ₹{entryPrice.toFixed(2)}
          </div>
        </div>

        <div className="text-right">
          <div
            className={`text-xl md:text-2xl font-bold ${hasPnl
              ? (isProfit ? 'text-green-700' : 'text-red-700')
              : 'text-slate-500'
              }`}
          >
            {hasPnl && effectiveReturnPct !== undefined
              ? `${isProfit ? '+' : ''}${effectiveReturnPct.toFixed(2)}%`
              : '--'}
          </div>
          <div className="text-xs text-slate-500">
            {effectivePrice && effectivePrice > 0 ? `₹${effectivePrice.toFixed(2)}` : 'Awaiting live price'}
          </div>
          {(!effectivePrice || !hasPnl) && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              Using entry price as placeholder until first market tick arrives
            </div>
          )}
        </div>
      </div>

      {/* Strategy Info */}
      <div className="bg-white/70 p-3 rounded-lg mb-3 text-xs text-slate-600">
        <div className="font-semibold mb-1">
          {position.exit_strategy.description}
        </div>
        <div className="flex flex-col sm:flex-row sm:gap-4 gap-2">
          <div className="flex items-center gap-1">
            <Target size={12} />
            <span className="break-words">Target: ₹{position.exit_strategy.target_price.toFixed(2)} (+{position.exit_strategy.target_pct}%)</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield size={12} />
            <span className="break-words">Stop: ₹{position.exit_strategy.stop_loss_price.toFixed(2)} (-{position.exit_strategy.stop_pct}%)</span>
          </div>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="grid gap-2 max-w-[560px] mx-auto">
        {/* Target Progress */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">To Target</span>
            <span className={`font-semibold ${isNearTarget ? 'text-green-700' : 'text-slate-500'}`}>
              {typeof effectivePrice === 'number' && effectivePrice > 0
                ? (targetDistance > 0 ? `${targetDistance.toFixed(2)}%` : 'Target Hit!')
                : '--'}
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${targetProgressPct}%`,
                background: isNearTarget ? '#15803d' : '#3b82f6'
              }}
            />
          </div>
        </div>

        {/* Stop Distance */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">From Stop</span>
            <span className={`font-semibold ${isNearStop ? 'text-red-700' : 'text-slate-500'}`}>
              {typeof effectivePrice === 'number' && effectivePrice > 0 ? `${stopDistance.toFixed(2)}%` : '--'}
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${stopProgressPct}%`,
                background: isNearStop ? '#dc2626' : '#64748b'
              }}
            />
          </div>
        </div>

        {/* Time Progress */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Time Left</span>
            <span className={`font-semibold ${isTimeRunningOut ? 'text-amber-600' : 'text-slate-500'}`}>
              {Number.isFinite(rawTimeLeftMins) ? `${Math.floor(rawTimeLeftMins)} mins` : '--'}
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${Math.max(0, Math.min(100, 100 - timeProgress))}%`,
                background: isTimeRunningOut ? '#f59e0b' : '#8b5cf6'
              }}
            />
          </div>
        </div>
      </div>

      {/* Trailing Stop Info */}
      {trailingStop.enabled && hasPnl && safeEffectiveReturnPct >= trailingStop.activation_pct && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-800 flex items-center gap-1.5">
          <TrendingUp size={14} />
          <span className="font-semibold">Trailing Stop Active!</span>
          <span>Will exit if profit drops below {(safeEffectiveReturnPct - trailingStop.trail_distance_pct).toFixed(2)}%</span>
        </div>
      )}

      {/* Warnings */}
      {isNearStop && (
        <div className="mt-2 p-2 bg-red-50 border border-red-600 rounded-md text-xs text-red-600 font-semibold">
          ⚠️ Near stop loss! Consider exiting manually.
        </div>
      )}
    </div>
  )
}
