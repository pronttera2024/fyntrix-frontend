import React, { useRef } from 'react'
import { formatIstDate, formatIstTime, isWithinTodayIst } from '../utils/time'
import { computeSentimentRiskLevel } from '../sentimentRisk'
import { useSwipeToClose } from '../utils/swipeToClose'
import { useFocusTrap } from '../utils/focusTrap'

const DEFAULT_AVAILABLE_MODES: any[] = [
  {
    value: 'Scalping',
    display_name: 'Scalping',
    description: 'Ultra-fast trades (seconds to minutes) capturing micro price movements',
  },
  {
    value: 'Intraday',
    display_name: 'Intraday',
    description: 'Day trading positions closed before market close',
  },
  {
    value: 'Swing',
    display_name: 'Swing',
    description: 'Multi-day positions (2-10 days) riding momentum waves',
  },
  {
    value: 'Options',
    display_name: 'Options',
    description: 'Leveraged derivatives for directional or hedging strategies',
  },
  {
    value: 'Futures',
    display_name: 'Futures',
    description: 'Leveraged contracts for commodities and indices',
  },
]

interface WinningTradesModalProps {
  isOpen: boolean
  onClose: () => void
  isMobile: boolean
  winningTradesData: any
  loadingWinningTrades: boolean
  winningTradesMode: string
  setWinningTradesMode: (mode: string) => void
  winningTradesDate: string
  setWinningTradesDate: (date: string) => void
  winningTradesAvailableDates: string[]
  winningStrategiesData: any
  availableModes: any[]
  DEFAULT_AVAILABLE_MODES: any[]
  tip: any
  setTip: (tip: any) => void
}

export const WinningTradesModal: React.FC<WinningTradesModalProps> = ({
  isOpen,
  onClose,
  isMobile,
  winningTradesData,
  loadingWinningTrades,
  winningTradesMode,
  setWinningTradesMode,
  winningTradesDate,
  setWinningTradesDate,
  winningTradesAvailableDates,
  winningStrategiesData,
  availableModes,
  DEFAULT_AVAILABLE_MODES: defaultModes,
  tip,
  setTip,
}) => {
  const winnersDialogRef = useRef<HTMLDivElement | null>(null)
  const winnersCloseRef = useRef<HTMLButtonElement | null>(null)

  useFocusTrap({
    enabled: Boolean(isOpen),
    containerRef: winnersDialogRef,
    initialFocusRef: winnersCloseRef,
    onEscape: onClose,
  })

  const swipeCloseWinners = useSwipeToClose({
    enabled: isMobile && isOpen,
    onClose,
  })

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: isMobile ? '#ffffff' : 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: isMobile ? 'stretch' : 'center',
        padding: isMobile ? 0 : 20,
        zIndex: 1001,
        overscrollBehavior: isMobile ? 'contain' : undefined,
      }}
      onClick={onClose}
    >
      <button
        ref={winnersCloseRef}
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          try {
            ;(e as any).nativeEvent?.stopImmediatePropagation?.()
          } catch {}
          onClose()
        }}
        style={{
          position: 'fixed',
          top: isMobile ? 'calc(env(safe-area-inset-top) + 12px)' : 16,
          right: 16,
          zIndex: 1010,
          width: isMobile ? 44 : 40,
          height: isMobile ? 44 : 40,
          borderRadius: 10,
          border: '1px solid rgba(148,163,184,0.6)',
          background: 'rgba(255,255,255,0.95)',
          color: '#0f172a',
          fontSize: 26,
          lineHeight: '26px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
        }}
        aria-label="Close Winning Trades"
        title="Close (Esc)"
      >
        ×
      </button>
      <div
        ref={winnersDialogRef}
        role="dialog"
        aria-modal={true}
        aria-label="Winning Trades"
        tabIndex={-1}
        style={{
          width: isMobile ? '100vw' : 'min(1000px, 90vw)',
          height: isMobile ? '100dvh' : undefined,
          maxHeight: isMobile ? '100dvh' : '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: isMobile ? 0 : 16,
          padding: isMobile
            ? 'calc(env(safe-area-inset-top) + 12px) 16px calc(env(safe-area-inset-bottom) + 16px) 16px'
            : 24,
          border: isMobile ? 'none' : '1px solid #e2e8f0',
          boxShadow: isMobile ? 'none' : '0 18px 50px rgba(2,6,23,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          {...swipeCloseWinners}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            position: isMobile ? 'sticky' : 'static',
            top: isMobile ? 0 : undefined,
            background: '#ffffff',
            zIndex: 2,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 32 }}>🏆</span>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 24,
                      color: '#0f172a',
                    }}
                  >
                    Winning Trades
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  Track Alpha Generated Across Trading Modes
                </div>
              </div>
              {/* Live Indicator */}
              {winningTradesData?.as_of &&
                (() => {
                  const now = new Date()
                  const nowIst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
                  const day = nowIst.getDay()
                  const isWeekday = day >= 1 && day <= 5
                  const hours = nowIst.getHours()
                  const minutes = nowIst.getMinutes()
                  const currentTime = hours * 60 + minutes
                  const marketOpen = 9 * 60 + 15
                  const marketClose = 15 * 60 + 30
                  const intradayWindowOpen = isWeekday && currentTime >= marketOpen && currentTime <= marketClose

                  const asOfDate = new Date(winningTradesData.as_of)
                  const isSameDay = isWithinTodayIst(winningTradesData.as_of)
                  const isMarketOpen = intradayWindowOpen && isSameDay

                  const updatedLabel = (() => {
                    try {
                      const diffMs = now.getTime() - asOfDate.getTime()
                      const diffMins = Math.floor(diffMs / 60000)
                      if (diffMins < 1) return 'just now'
                      if (diffMins === 1) return '1 min ago'
                      if (diffMins < 60) return `${diffMins} mins ago`
                      const diffHours = Math.floor(diffMins / 60)
                      if (diffHours === 1) return '1 hour ago'
                      return `${diffHours} hours ago`
                    } catch {
                      return 'recently'
                    }
                  })()

                  const closedLabel = (() => {
                    try {
                      const dateStr = formatIstDate(asOfDate, { weekday: 'short' })

                      if (isSameDay) {
                        return 'As of market close today'
                      }

                      return `As of market close on ${dateStr}`
                    } catch {
                      return 'As of last market close'
                    }
                  })()

                  return (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 4,
                        marginRight: 14,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          background: isMarketOpen ? '#dcfce7' : '#f1f5f9',
                          borderRadius: 999,
                          border: isMarketOpen ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: isMarketOpen ? '#16a34a' : '#94a3b8',
                            animation: isMarketOpen ? 'pulse 2s infinite' : 'none',
                          }}
                        ></div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: isMarketOpen ? '#166534' : '#64748b',
                          }}
                        >
                          {isMarketOpen ? 'Live' : 'Market Closed'}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                        {isMarketOpen ? `Updated ${updatedLabel}` : closedLabel}
                      </div>
                    </div>
                  )
                })()}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 28,
              cursor: 'pointer',
              color: '#64748b',
              lineHeight: 1,
              padding: 0,
              alignSelf: 'flex-start',
              marginTop: -6,
            }}
          >
            &times;
          </button>
        </div>

        {/* Mode Filters */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#0f172a',
              marginBottom: 8,
            }}
          >
            TRADING MODE
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['All', 'Scalping', 'Intraday', 'Swing', 'Options', 'Futures'].map((mode) => {
              const isActive = winningTradesMode === mode

              const modeConfig =
                mode === 'All'
                  ? null
                  : (availableModes || DEFAULT_AVAILABLE_MODES).find(
                      (m) => String(m.value).toLowerCase() === mode.toLowerCase()
                    )

              const tooltip =
                mode === 'All' ? 'Show performance across all trading modes' : modeConfig?.description || `${mode} mode`

              return (
                <label
                  key={mode}
                  onClick={() => setWinningTradesMode(mode)}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setTip({
                      x: rect.left + rect.width / 2,
                      y: rect.top - 8,
                      text: tooltip,
                      type: 'mode',
                    })
                  }}
                  onMouseLeave={() => setTip(null)}
                  style={{
                    position: 'relative',
                    padding: '8px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 999,
                    border: isActive ? '2px solid #14b8a6' : '1px solid #e2e8f0',
                    background: isActive ? '#ecfeff' : '#ffffff',
                    color: '#0f172a',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="radio"
                    name="winning_trades_mode"
                    value={mode}
                    checked={isActive}
                    onChange={() => setWinningTradesMode(mode)}
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                  />
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      border: isActive ? '3px solid #14b8a6' : '2px solid #94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#ffffff',
                    }}
                  >
                    {isActive && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#14b8a6',
                        }}
                      />
                    )}
                  </div>
                  <span>{mode}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Performance Metrics */}
        {loadingWinningTrades ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#78350f' }}>Loading performance data...</div>
        ) : winningTradesData ? (
          (() => {
            let filteredRecs = winningTradesData?.recommendations || []
            if (winningTradesMode !== 'All') {
              filteredRecs = filteredRecs.filter((r: any) => r.mode === winningTradesMode)
            }
            if (winningTradesDate !== 'all') {
              filteredRecs = filteredRecs.filter((r: any) => r.recommended_date === winningTradesDate)
            }

            const wins = filteredRecs.filter((r: any) => r.return_pct > 0)
            const winRate = filteredRecs.length > 0 ? ((wins.length / filteredRecs.length) * 100).toFixed(1) : '0.0'
            const avgReturn =
              filteredRecs.length > 0
                ? (filteredRecs.reduce((sum: number, r: any) => sum + r.return_pct, 0) / filteredRecs.length).toFixed(2)
                : '0.00'

            let benchmark =
              typeof winningTradesData?.metrics?.benchmark_return === 'number'
                ? winningTradesData.metrics.benchmark_return
                : 1.0
            if (winningTradesDate !== 'all') {
              const ts = (winningTradesData as any)?.benchmark_timeseries
              const perDay = ts && typeof ts[winningTradesDate] === 'number' ? ts[winningTradesDate] : undefined
              if (typeof perDay === 'number') {
                benchmark = perDay
              }
            }

            const alphaGen = (parseFloat(avgReturn) - benchmark).toFixed(2)
            const totalPicks = filteredRecs.length
            const uniqueSymbols = new Set(filteredRecs.map((r: any) => r.symbol)).size

            const avgReturnNum = parseFloat(avgReturn)
            const alphaNum = parseFloat(alphaGen)

            const avgReturnColor = avgReturnNum > 0 ? '#16a34a' : avgReturnNum < 0 ? '#ef4444' : '#0f172a'
            const alphaColor = alphaNum > 0 ? '#16a34a' : alphaNum < 0 ? '#ef4444' : '#0f172a'

            const kpiCardStyle: React.CSSProperties = {
              background: '#ffffff',
              padding: 16,
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
            }

            return (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                <div style={{ ...kpiCardStyle }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>WIN RATE</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a' }}>{winRate}%</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {winningTradesMode === 'All' ? 'All modes' : winningTradesMode}
                  </div>
                </div>
                <div style={{ ...kpiCardStyle }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>AVG RETURN</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: avgReturnColor, marginBottom: 4 }}>
                    {avgReturnNum >= 0 ? '+' : ''}
                    {avgReturn}%
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Per recommendation</div>
                </div>
                <div style={{ ...kpiCardStyle }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>ALPHA GENERATED</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: alphaColor, marginBottom: 4 }}>
                    {alphaNum >= 0 ? '+' : ''}
                    {alphaGen}%
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>vs NIFTY50</div>
                </div>
                <div style={{ ...kpiCardStyle }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 4 }}>TOTAL PICKS</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a' }}>{totalPicks}</div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                    <div>Filtered results</div>
                    <div>Unique symbols: {uniqueSymbols}</div>
                  </div>
                </div>
              </div>
            )
          })()
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#78350f' }}>No performance data available</div>
        )}

        {/* Top Winning Trades Table - Continued in next part */}
        {winningTradesData && (
          <WinningTradesTable
            winningTradesData={winningTradesData}
            winningTradesMode={winningTradesMode}
            winningTradesDate={winningTradesDate}
            setWinningTradesDate={setWinningTradesDate}
            winningTradesAvailableDates={winningTradesAvailableDates}
            winningStrategiesData={winningStrategiesData}
          />
        )}

        {/* Mode Comparison Table */}
        {winningTradesData?.recommendations && winningTradesData.recommendations.length > 0 && (
          <ModeComparisonTable winningStrategiesData={winningTradesData} />
        )}
      </div>
    </div>
  )
}

// Separate component for the trades table
const WinningTradesTable: React.FC<{
  winningTradesData: any
  winningTradesMode: string
  winningTradesDate: string
  setWinningTradesDate: (date: string) => void
  winningTradesAvailableDates: string[]
  winningStrategiesData: any
}> = ({
  winningTradesData,
  winningTradesMode,
  winningTradesDate,
  setWinningTradesDate,
  winningTradesAvailableDates,
  winningStrategiesData,
}) => {
  // Extract strategyExitsByDate from winningStrategiesData
  const strategyExitsByDate = winningStrategiesData?.strategy_exits_by_date || {}
  let recs = winningTradesData?.recommendations || []
  if (winningTradesMode !== 'All') {
    recs = recs.filter((r: any) => r.mode === winningTradesMode)
  }
  if (winningTradesDate !== 'all') {
    recs = recs.filter((r: any) => r.recommended_date === winningTradesDate)
  }
  recs = [...recs].sort((a: any, b: any) => b.return_pct - a.return_pct)

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 16,
        border: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Top Winning Trades</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Performance tracked since recommendation • Sorted by Returns
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            ! icon marks strategy advisories (trend weakening, volume fade, price stretched) and does not indicate an
            executed exit.
          </div>
        </div>
        <select
          value={winningTradesDate}
          onChange={(e) => setWinningTradesDate(e.target.value)}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 8,
            border: '2px solid #e5e7eb',
            background: '#fff',
            color: '#64748b',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Dates</option>
          {winningTradesAvailableDates.map((d) => {
            try {
              const dt = new Date(d)
              const label = formatIstDate(dt)
              return (
                <option key={d} value={d}>
                  {label}
                </option>
              )
            } catch {
              return null
            }
          })}
        </select>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>Symbol</th>
            <th style={{ textAlign: 'left', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>Mode</th>
            <th style={{ textAlign: 'left', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              Recommended
            </th>
            <th style={{ textAlign: 'left', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              Exit Time
            </th>
            <th style={{ textAlign: 'right', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              Entry Price
            </th>
            <th style={{ textAlign: 'right', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              Exit / Last Price
            </th>
            <th style={{ textAlign: 'right', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              Return Profile
            </th>
            <th style={{ textAlign: 'center', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>Status</th>
            <th style={{ textAlign: 'center', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              Days Held
            </th>
          </tr>
        </thead>
        <tbody>
          {recs.map((row: any, idx: number) => (
            <TradeRow key={idx} row={row} idx={idx} strategyExitsByDate={strategyExitsByDate} />
          ))}
        </tbody>
      </table>
      {recs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 }}>
          📋 No trades found for selected filters
        </div>
      )}
    </div>
  )
}

// Individual trade row component
const TradeRow: React.FC<{ row: any; idx: number; strategyExitsByDate: Record<string, any> }> = ({
  row,
  idx,
  strategyExitsByDate,
}) => {
  const statusRaw = String(row.status || '').toUpperCase()
  const statusColor = statusRaw.includes('TP') || statusRaw.includes('TARGET')
    ? '#16a34a'
    : statusRaw.includes('STOP')
    ? '#ef4444'
    : statusRaw.includes('CLOSED')
    ? '#64748b'
    : statusRaw.includes('CONTEXT')
    ? '#f97316'
    : '#3b82f6'

  const daysHeld = (() => {
    try {
      const mode = String(row.mode || 'Swing')
      if (mode === 'Scalping' || mode === 'Intraday') return 0

      const recDate = new Date(row.recommended_date)
      const baseRec = new Date(recDate.getFullYear(), recDate.getMonth(), recDate.getDate())

      const rawExit = (row as any).exit_time
      if (rawExit) {
        const exitDate = new Date(rawExit)
        const baseExit = new Date(exitDate.getFullYear(), exitDate.getMonth(), exitDate.getDate())
        const diffMs = baseExit.getTime() - baseRec.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        return Math.max(diffDays, 0)
      }

      const today = new Date()
      if (baseRec.toDateString() === today.toDateString()) return 0

      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
      let d = new Date(baseRec)
      let count = 0
      while (d <= end) {
        const day = d.getDay()
        if (day >= 1 && day <= 5) count += 1
        d.setDate(d.getDate() + 1)
      }
      return Math.max(count, 0)
    } catch {
      return 0
    }
  })()

  const statusDetail = (() => {
    if (!statusRaw.includes('CONTEXT')) return null
    const rawExitReason = (row as any)?.exit_reason
    if (typeof rawExitReason === 'string' && rawExitReason.trim()) {
      const cleaned = rawExitReason.replace(/_/g, ' ').trim()
      const lower = cleaned.toLowerCase()
      if (lower && lower !== 'context invalidated') {
        return cleaned.length > 52 ? cleaned.slice(0, 49) + '...' : cleaned
      }
    }
    const msg = String((row as any)?.strategy_exit?.message || '')
    if (!msg) return null
    let m = msg.replace(/^S\d+\s*/i, '').trim()
    const lowerMsg = m.toLowerCase()
    const idxCtx = lowerMsg.indexOf('context invalidated:')
    if (idxCtx >= 0) {
      m = m.slice(idxCtx + 'context invalidated:'.length).trim()
    }
    const colon = m.indexOf(':')
    if (colon >= 0 && colon <= 24) {
      m = m.slice(colon + 1).trim()
    }
    const short = (m.split('.').shift() || m).trim()
    if (!short || short.toLowerCase() === 'context invalidated') return null
    if (short.length > 52) return short.slice(0, 49) + '...'
    return short
  })()

  let advisoryTooltipTitle: string | null = null
  {
    const se: any = (row as any).strategy_exit
    try {
      if (se && se.is_exit === false) {
        const kindRaw = String(se.kind || '').toUpperCase()
        let kindLabel = ''
        if (kindRaw === 'TREND_WEAKENING') kindLabel = 'Trend weakening'
        else if (kindRaw === 'VOLUME_FADE') kindLabel = 'Volume fade'
        else if (kindRaw === 'PRICE_STRETCHED') kindLabel = 'Price stretched'
        else if (kindRaw) {
          const cleaned = kindRaw.replace(/_/g, ' ').toLowerCase()
          kindLabel = cleaned.replace(/\b\w/g, (c) => c.toUpperCase())
        }

        const msgRaw = String(se.message || '').trim()
        let msg = msgRaw
        if (msg.length > 160) msg = msg.slice(0, 157) + '...'

        const parts: string[] = []
        if (kindLabel) parts.push(kindLabel)
        if (msg) parts.push(msg)

        const title = parts.join(' • ')
        advisoryTooltipTitle = title || null
      }
    } catch {}
  }

  let newsRiskLabel: string | null = null
  let newsRiskScore: number | null = null
  let newsRiskColor = '#6b7280'
  let newsRiskSummary: string | null = null
  let newsHeadlineCount: number | null = null

  const exitsForDate = row.recommended_date ? strategyExitsByDate[row.recommended_date] : null
  const exitsList = exitsForDate && Array.isArray(exitsForDate.exits) ? exitsForDate.exits : []

  if (exitsList.length > 0) {
    const matches = exitsList.filter((e: any) => e && e.symbol === row.symbol)
    if (matches.length > 0) {
      let best = matches[0]
      for (let i = 1; i < matches.length; i++) {
        const a = best as any
        const b = matches[i] as any
        const ta = Date.parse(a.generated_at || '') || 0
        const tb = Date.parse(b.generated_at || '') || 0
        if (tb > ta) best = b
      }

      const level = computeSentimentRiskLevel((best as any).news_risk_score)
      if (level) {
        newsRiskScore = level.score
        newsRiskLabel = level.label
        newsRiskColor = level.color
      }

      const reason = (best as any).news_reason
      if (typeof reason === 'string' && reason.trim()) {
        let s = reason.trim()
        if (s.length > 120) s = s.slice(0, 117) + '...'
        newsRiskSummary = s
      }

      const headlinesCount = (best as any).news_headlines_count
      if (typeof headlinesCount === 'number' && Number.isFinite(headlinesCount)) {
        newsHeadlineCount = headlinesCount
      }
    }
  }

  const recStr = String(row.recommendation || '').toLowerCase()
  const isShortSide = recStr.includes('sell')
  const directionLabel = isShortSide ? 'Short' : 'Long'
  const directionBg = isShortSide ? '#fee2e2' : '#dcfce7'
  const directionColor = isShortSide ? '#991b1b' : '#166534'
  const directionBorder = isShortSide ? '#fecaca' : '#bbf7d0'

  return (
    <tr
      style={{
        borderBottom: '1px solid #f1f5f9',
        background: idx < 3 ? '#fefce8' : 'transparent',
      }}
    >
      <td style={{ padding: '10px 8px', fontWeight: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{row.symbol}</span>
          {advisoryTooltipTitle && (
            <span style={{ fontSize: 10, color: '#0f766e', cursor: 'default' }} title={advisoryTooltipTitle}>
              !
            </span>
          )}
          {newsRiskLabel && newsRiskScore != null && (
            <span
              style={{ fontSize: 10, color: newsRiskColor, cursor: 'default' }}
              title={(() => {
                const parts: string[] = []
                parts.push(`${newsRiskLabel} (${Math.round(Number(newsRiskScore))}/100)`)
                if (newsRiskSummary) parts.push(newsRiskSummary)
                if (newsHeadlineCount != null) parts.push(`${newsHeadlineCount} news item${newsHeadlineCount === 1 ? '' : 's'}`)
                return parts.join(' • ')
              })()}
            >
              ★
            </span>
          )}
        </div>
      </td>
      <td style={{ padding: '10px 8px', fontSize: 11 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ padding: '3px 8px', borderRadius: 4, background: '#f3e8ff', color: '#7c3aed', fontWeight: 600 }}>
            {row.mode || 'Swing'}
          </span>
          <span
            style={{
              padding: '2px 6px',
              borderRadius: 999,
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
              background: directionBg,
              color: directionColor,
              border: `1px solid ${directionBorder}`,
              alignSelf: 'flex-start',
              whiteSpace: 'nowrap',
            }}
          >
            {directionLabel}
          </span>
        </div>
      </td>
      <td style={{ padding: '10px 8px', fontSize: 12, color: '#64748b' }}>
        {(() => {
          try {
            const t = row.entry_time as any
            if (!t) return <div>{row.recommended_date}</div>

            const d = new Date(t)
            const dateLabel = formatIstDate(d)
            const timeLabel = formatIstTime(d)

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>{dateLabel}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{timeLabel}</span>
              </div>
            )
          } catch {
            return <div>{row.recommended_date}</div>
          }
        })()}
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'left', fontSize: 12, color: '#64748b' }}>
        {(() => {
          try {
            const t = (row as any).exit_time
            if (!t)
              return (
                <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
              )
            const ts = new Date(t)
            const open = 9 * 60 + 15
            const close = 15 * 60 + 30

            const istParts = (() => {
              try {
                const fmt = new Intl.DateTimeFormat('en-US', {
                  timeZone: 'Asia/Kolkata',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })
                const parts = fmt.formatToParts(ts)
                const get = (type: string) => parts.find((p) => p.type === type)?.value || ''
                const yyyy = get('year')
                const mm = get('month')
                const dd = get('day')
                const hh = parseInt(get('hour') || '0', 10)
                const mi = parseInt(get('minute') || '0', 10)
                return { yyyy, mm, dd, mins: hh * 60 + mi }
              } catch {
                return null
              }
            })()

            let displayTs = ts
            if (istParts && istParts.yyyy && istParts.mm && istParts.dd) {
              const clampedMins = istParts.mins < open ? open : istParts.mins > close ? close : istParts.mins
              const hh = String(Math.floor(clampedMins / 60)).padStart(2, '0')
              const mi = String(clampedMins % 60).padStart(2, '0')
              displayTs = new Date(`${istParts.yyyy}-${istParts.mm}-${istParts.dd}T${hh}:${mi}:00+05:30`)
            }

            const dateLabel = formatIstDate(displayTs)
            const timeLabel = formatIstTime(displayTs)
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>{dateLabel}</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{timeLabel}</span>
              </div>
            )
          } catch {
            return <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
          }
        })()}
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13 }}>₹{row.entry_price}</td>
      <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13 }}>
        {(() => {
          const hasExit = typeof row.exit_price === 'number' && Number.isFinite(row.exit_price)
          const price = hasExit ? row.exit_price : row.current_price

          if (typeof price !== 'number' || !Number.isFinite(price)) {
            return <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
          }

          const label = hasExit ? 'Exit price' : 'Last traded price'

          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span>₹{price}</span>
              <span style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{label}</span>
            </div>
          )
        })()}
      </td>
      <td style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12 }}>
        {(() => {
          const baseRet = typeof row.return_pct === 'number' && Number.isFinite(row.return_pct) ? row.return_pct : 0
          const baseColor = baseRet > 0 ? '#16a34a' : baseRet < 0 ? '#ef4444' : '#64748b'

          return (
            <span style={{ fontWeight: 600, color: baseColor }}>
              {baseRet > 0 ? '+' : ''}
              {baseRet.toFixed(2)}%
            </span>
          )
        })()}
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 600,
              background: statusColor + '20',
              color: statusColor,
            }}
            title={statusDetail || undefined}
          >
            {row.status}
          </span>
          {statusDetail && (
            <span style={{ fontSize: 10, color: '#64748b' }} title={statusDetail}>
              {statusDetail}
            </span>
          )}
        </div>
      </td>
      <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
        {daysHeld}d
      </td>
    </tr>
  )
}

// Mode comparison table component
const ModeComparisonTable: React.FC<{ winningStrategiesData: any }> = ({ winningStrategiesData }) => {
  return (
    <div
      style={{
        marginTop: 24,
        background: '#fff',
        borderRadius: 12,
        padding: 16,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>🔄</span>
        <span>Mode Performance Comparison</span>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
        Compare performance across all trading modes at a glance
      </div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
        {(() => {
          try {
            const lookbackDaysRaw = (winningStrategiesData as any)?.filters?.lookback_days
            const lookbackDays = typeof lookbackDaysRaw === 'number' && lookbackDaysRaw > 0 ? lookbackDaysRaw : 7

            const dates: string[] = Array.from(
              new Set(
                (winningStrategiesData?.recommendations || [])
                  .map((r: any) => r?.recommended_date)
                  .filter((d: any) => typeof d === 'string' && d)
              )
            ) as string[]
            dates.sort()

            const start = typeof dates[0] === 'string' ? dates[0] : ''
            const end = typeof dates[dates.length - 1] === 'string' ? dates[dates.length - 1] : ''

            const fmt = (d: string) => {
              try {
                const dt = new Date(`${d}T00:00:00+05:30`)
                const out = formatIstDate(dt)
                return out || d
              } catch {
                return d
              }
            }

            const range = start && end ? `${fmt(start)} – ${fmt(end)}` : ''

            return `Timeframe: Last ${lookbackDays} days${range ? ` (${range})` : ''}`
          } catch {
            return 'Timeframe: Last 7 days'
          }
        })()}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>Mode</th>
            <th style={{ textAlign: 'center', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              Total Picks
            </th>
            <th style={{ textAlign: 'center', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              Win Rate
            </th>
            <th style={{ textAlign: 'center', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              Avg Return/Rec
            </th>
            <th style={{ textAlign: 'center', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              Alpha vs NIFTY
            </th>
            <th style={{ textAlign: 'center', padding: '8px', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
              Best Pick
            </th>
          </tr>
        </thead>
        <tbody>
          {['Scalping', 'Intraday', 'Swing', 'Options', 'Futures'].map((mode) => {
            const modeRecs = (winningStrategiesData?.recommendations || []).filter((r: any) => r.mode === mode)
            if (modeRecs.length === 0) return null

            const wins = modeRecs.filter((r: any) => r.return_pct > 0)
            const winRate = ((wins.length / modeRecs.length) * 100).toFixed(1)
            const benchmark =
              typeof winningStrategiesData?.metrics?.benchmark_return === 'number'
                ? winningStrategiesData.metrics.benchmark_return
                : 1.0

            const avgRaw =
              modeRecs.reduce((sum: number, r: any) => {
                const v = r?.return_pct
                if (typeof v === 'number' && !Number.isNaN(v)) return sum + v
                const parsed = parseFloat(String(v))
                return Number.isNaN(parsed) ? sum : sum + parsed
              }, 0) / modeRecs.length

            const avgNum = Object.is(avgRaw, -0) ? 0 : avgRaw
            const alphaRaw = avgNum - benchmark
            const alphaNum = Object.is(alphaRaw, -0) ? 0 : alphaRaw

            const formatSignedPct = (v: number) => {
              const rounded2 = Math.round(v * 100) / 100
              if (Object.is(rounded2, -0) || Math.abs(rounded2) < 0.005) {
                const abs = Math.abs(v)
                if (abs >= 0.0005 && abs < 0.01) {
                  const mag = Math.round(abs * 1000) / 1000
                  return `${v > 0 ? '+' : '-'}${mag.toFixed(3)}%`
                }
                return '0.00%'
              }
              return `${rounded2 > 0 ? '+' : ''}${rounded2.toFixed(2)}%`
            }

            const avgDisplay = formatSignedPct(avgNum)
            const alphaDisplay = formatSignedPct(alphaNum)
            const bestPick = modeRecs.sort((a: any, b: any) => b.return_pct - a.return_pct)[0]

            const modeColors: any = {
              Scalping: { bg: '#fce7f3', border: '#fbcfe8', text: '#831843' },
              Intraday: { bg: '#fef3c7', border: '#fde68a', text: '#78350f' },
              Swing: { bg: '#ede9fe', border: '#ddd6fe', text: '#4c1d95' },
              Options: { bg: '#dbeafe', border: '#bfdbfe', text: '#1e40af' },
              Futures: { bg: '#dcfce7', border: '#bbf7d0', text: '#166534' },
            }
            const colors = modeColors[mode] || { bg: '#f1f5f9', border: '#e2e8f0', text: '#1e293b' }

            return (
              <tr key={mode} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 8px' }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {mode}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>
                  {modeRecs.length}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{winRate}%</span>
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: avgNum > 0 ? '#16a34a' : avgNum < 0 ? '#ef4444' : '#0f172a',
                    }}
                  >
                    {avgDisplay}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: alphaNum > 0 ? '#16a34a' : alphaNum < 0 ? '#ef4444' : '#0f172a',
                    }}
                  >
                    {alphaDisplay}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{bestPick.symbol}</span>
                    <span
                      style={{
                        fontSize: 10,
                        color: bestPick.return_pct >= 0 ? '#16a34a' : '#ef4444',
                        fontWeight: 600,
                      }}
                    >
                      {bestPick.return_pct >= 0 ? '+' : ''}
                      {bestPick.return_pct}%
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div
        style={{
          marginTop: 14,
          padding: 12,
          background: '#fff7ed',
          border: '1px solid #fed7aa',
          borderRadius: 10,
          color: '#1e293b',
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>How we track performance</div>
        <div style={{ color: '#475569' }}>
          Each recommendation's performance is tracked from the entry price suggested by our Trade Strategy Agent. Returns
          are calculated using the current market price (or exit price when closed). Status updates reflect when targets
          are hit or stop-losses are triggered.
        </div>
        <div style={{ marginTop: 10, color: '#0f172a', fontWeight: 600 }}>Metric calculations</div>
        <div style={{ color: '#475569' }}>
          <div>
            <strong>Win Rate</strong> = (Number of recommendations with Return % &gt; 0) ÷ (Total recommendations) × 100
          </div>
          <div>
            <strong>Average Return</strong> = (Sum of Return % across recommendations) ÷ (Total recommendations)
          </div>
          <div>
            <strong>Alpha vs NIFTY</strong> = (Average Return %) − (NIFTY return % over the same lookback window)
          </div>
        </div>
      </div>
    </div>
  )
}
