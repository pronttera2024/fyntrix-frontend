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

const formatIndianPrice = (price: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price)
}

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
      className="fixed inset-0 flex bg-white items-stretch justify-stretch p-0 md:bg-black/35 md:items-center md:justify-center md:p-5 z-[1001] md:overscroll-contain"
      onClick={onClose}
    >
      {/* <button
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
        className={`fixed z-[1010] flex items-center justify-center font-black cursor-pointer text-slate-900 border border-slate-400/60 bg-white/95 ${isMobile ? 'w-11 h-11 top-[calc(env(safe-area-inset-top)+12px)]' : 'w-10 h-10 top-4'} right-4 rounded-xl text-2xl leading-6`}
        aria-label="Close Winning Trades"
        title="Close (Esc)"
      >
        ×
      </button> */}
      <div
        ref={winnersDialogRef}
        role="dialog"
        aria-modal={true}
        aria-label="Winning Trades"
        tabIndex={-1}
        className="bg-white overflow-y-auto w-full h-dvh max-h-dvh rounded-none pt-[calc(env(safe-area-inset-top)+12px)] px-3 pb-[calc(env(safe-area-inset-bottom)+16px)] border-none shadow-none md:w-auto md:h-auto md:max-h-[90vh] md:min-w-[1000px] md:max-w-[90vw] md:rounded-2xl md:p-6 md:border md:border-slate-200 md:shadow-[0_18px_50px_rgba(2,6,23,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          {...swipeCloseWinners}
          className={`flex justify-between items-start mb-4 md:mb-5 sticky top-0 bg-white z-[2] md:static`}
        >
          <div className="flex-1">
            <div
              className="flex justify-between items-start"
            >
              <div>
                <div
                  className={`flex items-center gap-2 mb-1.5 md:gap-3 md:mb-2`}
                >
                  <span className="text-xl md:text-2xl">🏆</span>
                  <div
                    className={`font-bold text-lg md:text-2xl text-slate-900`}
                  >
                    Winning Trades
                  </div>
                </div>
                <div className="text-[11px] md:text-xs text-slate-500">
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
                      className={`flex flex-col items-end gap-1 mr-2 md:mr-3.5`}
                    >
                      <div
                        className={`flex items-center gap-1 px-2 py-1 md:gap-1.5 md:px-3 md:py-1.5 rounded-full border ${isMarketOpen ? 'bg-green-50 border-green-300' : 'bg-slate-100 border-slate-200'}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-green-600 animate-pulse' : 'bg-slate-400'}`}
                        ></div>
                        <span
                          className={`text-[10px] md:text-xs font-bold ${isMarketOpen ? 'text-green-800' : 'text-slate-500'}`}
                        >
                          {isMarketOpen ? 'Live' : 'Market Closed'}
                        </span>
                      </div>
                      <div className={`text-[9px] md:text-xs text-slate-500 font-medium`}>
                        {isMarketOpen ? `Updated ${updatedLabel}` : closedLabel}
                      </div>
                    </div>
                  )
                })()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="border-slate-400 bg-slate-800/5 border rounded-md cursor-pointer leading-none px-0.5 self-start text-xl md:text-2xl -mt-1 md:-mt-1.5 text-slate-500"
          >
            &times;
          </button>
        </div>

        {/* Mode Filters */}
        <div className="mb-4 md:mb-5">
          <div
            className="text-[11px] md:text-xs font-semibold text-slate-900 mb-2"
          >
            TRADING MODE
          </div>
          <div className={`flex gap-1.5 md:flex-wrap md:gap-2 overflow-x-auto md:overflow-visible`} style={{ msOverflowStyle: 'none', scrollbarWidth: 'none', WebkitScrollbar: { display: 'none' } as any }}>
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
                  className={`relative flex items-center gap-1.5 px-2 py-1.5 text-[11px] md:gap-2 md:px-3 md:py-2 md:text-xs font-semibold rounded-full border cursor-pointer transition-all duration-200 select-none ${isActive ? 'border-2 border-teal-500 bg-cyan-50' : 'border border-slate-200 bg-white'} text-slate-900 active:scale-95 md:hover:border-slate-300`}
                >
                  <input
                    type="radio"
                    name="winning_trades_mode"
                    value={mode}
                    checked={isActive}
                    onChange={() => setWinningTradesMode(mode)}
                    className="absolute opacity-0 pointer-events-none"
                  />
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center bg-white ${isActive ? 'border-[3px] border-teal-500' : 'border-2 border-slate-400'}`}
                  >
                    {isActive && (
                      <div
                        className="w-1.5 h-1.5 rounded-full bg-teal-500"
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
          <div className={`text-center py-8 md:py-10 text-amber-700`}>Loading performance data...</div>
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

            const avgReturnColor = avgReturnNum > 0 ? 'text-green-600' : avgReturnNum < 0 ? 'text-red-500' : 'text-slate-900'
            const alphaColor = alphaNum > 0 ? 'text-green-600' : alphaNum < 0 ? 'text-red-500' : 'text-slate-900'

            return (
              <div
                className={`grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] md:gap-4 mb-6`}
              >
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                  <div className={`text-[10px] md:text-xs text-slate-500 font-semibold mb-1`}>WIN RATE</div>
                  <div className={`text-xl md:text-2xl font-bold text-slate-900`}>{winRate}%</div>
                  <div className={`text-[10px] md:text-xs text-slate-500`}>
                    {winningTradesMode === 'All' ? 'All modes' : winningTradesMode}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                  <div className={`text-[10px] md:text-xs text-slate-500 font-semibold mb-1`}>AVG RETURN</div>
                  <div className={`text-base md:text-lg font-bold mb-1 ${avgReturnColor}`}>
                    {avgReturnNum >= 0 ? '+' : ''}
                    {avgReturn}%
                  </div>
                  <div className={`text-[10px] md:text-xs text-slate-500`}>Per recommendation</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                  <div className={`text-[10px] md:text-xs text-slate-500 font-semibold mb-1`}>ALPHA GENERATED</div>
                  <div className={`text-base md:text-lg font-bold mb-1 ${alphaColor}`}>
                    {alphaNum >= 0 ? '+' : ''}
                    {alphaGen}%
                  </div>
                  <div className={`text-[10px] md:text-xs text-slate-500`}>vs NIFTY50</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                  <div className={`text-[10px] md:text-xs text-slate-500 font-semibold mb-1`}>TOTAL PICKS</div>
                  <div className={`text-xl md:text-2xl font-bold text-slate-900`}>{totalPicks}</div>
                  <div className={`text-[10px] md:text-xs text-slate-500 leading-[1.4]`}>
                    <div>Filtered results</div>
                    <div>Unique symbols: {uniqueSymbols}</div>
                  </div>
                </div>
              </div>
            )
          })()
        ) : (
          <div className={`text-center py-8 md:py-10 text-amber-700`}>No performance data available</div>
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
        className="bg-white rounded-xl p-3 md:p-4 border border-gray-200"
      >
        <div
          className={`flex justify-between items-start mb-2 md:mb-3`}
        >
          <div>
            <div className={`font-semibold text-sm md:text-base`}>Top Winning Trades</div>
            <div className={`text-[11px] md:text-xs text-slate-500`}>
              Performance tracked since recommendation • Sorted by Returns
            </div>
            <div className={`text-[10px] md:text-[11px] text-slate-400 mt-1 md:mt-0.5`}>
              ! icon marks strategy advisories (trend weakening, volume fade, price stretched) and does not indicate an
              executed exit.
            </div>
          </div>
          <select
            value={winningTradesDate}
            onChange={(e) => setWinningTradesDate(e.target.value)}
            className={`px-2 py-1 text-[11px] md:px-3 md:py-1.5 md:text-xs font-semibold rounded-lg border-2 border-gray-200 bg-white text-slate-500 cursor-pointer`}
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

        <div className={`overflow-x-auto md:overflow-visible`}>
          <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className={`text-left p-2 text-[10px] md:text-xs font-semibold text-slate-500`} style={{ minWidth: '80px' }}>Symbol</th>
                <th className={`text-left p-2 text-[10px] md:text-xs font-semibold text-slate-500`} style={{ minWidth: '70px' }}>Mode</th>
                <th className={`text-left p-2 text-[10px] md:text-xs font-semibold text-slate-500`} style={{ minWidth: '100px' }}>
                  Recommended
                </th>
                <th className={`text-left p-2 text-[10px] md:text-xs font-semibold text-slate-500`} style={{ minWidth: '40px' }}>
                  Exit Time
                </th>
                <th className={`text-right p-2 text-[10px] md:text-xs font-semibold text-slate-500`} style={{ minWidth: '90px' }}>
                  Entry Price
                </th>
                <th className={`text-right p-2 text-[10px] md:text-xs font-semibold text-slate-500`} style={{ minWidth: '110px' }}>
                  Exit / Last Price
                </th>
                <th className={`text-right p-2 text-[10px] md:text-xs font-semibold text-slate-500`} style={{ minWidth: '100px' }}>
                  Return Profile
                </th>
                <th className={`text-center p-2 text-[10px] md:text-xs font-semibold text-slate-500`} style={{ minWidth: '80px' }}>Status</th>
                <th className={`text-center p-2 text-[10px] md:text-xs font-semibold text-slate-500`} style={{ minWidth: '70px' }}>
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
            <div className={`text-center py-8 md:py-10 text-slate-400 text-sm md:text-base`}>
              📋 No trades found for selected filters
            </div>
          )}
        </div>
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
    ? 'text-green-600'
    : statusRaw.includes('STOP')
      ? 'text-red-500'
      : statusRaw.includes('CLOSED')
        ? 'text-slate-500'
        : statusRaw.includes('CONTEXT')
          ? 'text-orange-500'
          : 'text-blue-500'

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
    } catch { }
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
  const directionBg = isShortSide ? 'bg-red-100' : 'bg-green-100'
  const directionColor = isShortSide ? 'text-red-800' : 'text-green-800'
  const directionBorder = isShortSide ? 'border-red-200' : 'border-green-300'

  return (
    <tr
      className={`border-b border-slate-100 ${idx < 3 ? 'bg-yellow-50' : 'bg-transparent'}`}
    >
      <td className={`py-2 px-1 md:py-2.5 md:px-2 font-semibold`}>
        <div className="flex items-center gap-1">
          <span className={`text-xs md:text-sm`}>{row.symbol}</span>
          {advisoryTooltipTitle && (
            <span className={`text-[8px] md:text-[10px] text-cyan-700 cursor-default`} title={advisoryTooltipTitle}>
              !
            </span>
          )}
          {newsRiskLabel && newsRiskScore != null && (
            <span
              className={`text-[8px] md:text-[10px] cursor-default`}
              style={{ color: newsRiskColor }}
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
      <td className={`py-2 px-1 md:py-2.5 md:px-2 text-[10px] md:text-xs`}>
        <div className="flex flex-col gap-1">
          <span className={`px-1.5 py-0.5 text-[10px] md:px-2 md:py-0.5 md:text-xs rounded bg-purple-100 text-purple-700 font-semibold`}>
            {row.mode || 'Swing'}
          </span>
          <span
            className={`px-1 py-0.5 text-[8px] md:px-1.5 md:py-0.5 md:text-[9px] rounded-full font-semibold uppercase tracking-wider whitespace-nowrap self-start border ${directionBg} ${directionColor} ${directionBorder}`}
          >
            {directionLabel}
          </span>
        </div>
      </td>
      <td className={`py-2 px-1 md:py-2.5 md:px-2 text-[10px] md:text-xs text-slate-500`}>
        {(() => {
          try {
            const t = row.entry_time as any
            if (!t) return <div className={`text-xs md:text-sm`}>{row.recommended_date}</div>

            const d = new Date(t)
            const dateLabel = formatIstDate(d)
            const timeLabel = formatIstTime(d)

            return (
              <div className="flex flex-col gap-0.5">
                <div className={`text-[10px] md:text-xs`}>{dateLabel}</div>
                <div className={`text-[10px] md:text-xs text-slate-400`}>{timeLabel}</div>
              </div>
            )
          } catch {
            return <div className={`text-xs md:text-sm`}>{row.recommended_date}</div>
          }
        })()}
      </td>
      <td className={`py-2 px-1 md:py-2.5 md:px-2 text-left text-[10px] md:text-xs text-slate-500`}>
        {(() => {
          try {
            const t = (row as any).exit_time
            if (!t)
              return (
                <span className={`text-[10px] md:text-xs text-slate-400`}>—</span>
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
              <div className="flex flex-col gap-0.5">
                <div className={`text-[10px] md:text-xs`}>{dateLabel}</div>
                <div className={`text-[10px] md:text-xs text-slate-400`}>{timeLabel}</div>
              </div>
            )
          } catch {
            return <span className={'text-[10px] md:text-xs text-slate-400'}>—</span>
          }
        })()}
      </td>
      <td className={`py-2 px-1 md:py-2.5 md:px-2 text-right text-xs md:text-sm`}>₹{formatIndianPrice(row.entry_price)}</td>
      <td className={`py-2 px-1 md:py-2.5 md:px-2 text-right text-xs md:text-sm`}>
        {(() => {
          const hasExit = typeof row.exit_price === 'number' && Number.isFinite(row.exit_price)
          const price = hasExit ? row.exit_price : row.current_price

          if (typeof price !== 'number' || !Number.isFinite(price)) {
            return <span className={`text-[10px] md:text-xs text-slate-400`}>—</span>
          }

          const label = hasExit ? 'Exit price' : 'Last traded price'

          return (
            <div className="flex flex-col items-end">
              <span className={`text-xs md:text-sm`}>₹{formatIndianPrice(price)}</span>
              <span className={`text-[10px] md:text-[10px] text-slate-500 mt-0.5`}>{label}</span>
            </div>
          )
        })()}
      </td>
      <td className={`py-2 px-1 md:py-2.5 md:px-2 text-right text-[10px] md:text-xs`}>
        {(() => {
          const baseRet = typeof row.return_pct === 'number' && Number.isFinite(row.return_pct) ? row.return_pct : 0
          const baseColor = baseRet > 0 ? 'text-green-600' : baseRet < 0 ? 'text-red-500' : 'text-slate-500'

          return (
            <span className={`font-semibold text-[10px] md:text-xs ${baseColor}`}>
              {baseRet > 0 ? '+' : ''}
              {baseRet.toFixed(2)}%
            </span>
          )
        })()}
      </td>
      <td className="py-2.5 px-2 text-center text-xs">
        <div className="flex flex-col items-center gap-1">
          <span
            className={`px-2 py-1 rounded text-[10px] md:text-[10px] font-semibold ${statusColor}`}
            style={{ backgroundColor: statusColor === 'text-green-600' ? '#16a34a20' : statusColor === 'text-red-500' ? '#ef444420' : statusColor === 'text-slate-500' ? '#64748b20' : statusColor === 'text-orange-500' ? '#f9731620' : '#3b82f620' }}
            title={statusDetail || undefined}
          >
            {row.status}
          </span>
          {statusDetail && (
            <span className={`text-[10px] md:text-xs text-slate-500`} title={statusDetail}>
              {statusDetail}
            </span>
          )}
        </div>
      </td>
      <td className={`py-2 px-1 md:py-2.5 md:px-2 text-center text-[10px] md:text-xs font-semibold text-slate-500`}>
        {daysHeld}d
      </td>
    </tr>
  )
}

// Mode comparison table component
const ModeComparisonTable: React.FC<{ winningStrategiesData: any }> = ({ winningStrategiesData }) => {
  return (
    <div
      className={`bg-white rounded-xl p-3 md:p-4 border border-slate-200`}
    >
      <div className={`font-semibold text-sm md:text-base mb-3 flex items-center gap-2`}>
        <span>🔄</span>
        <span>Mode Performance Comparison</span>
      </div>
      <div className={`text-[11px] md:text-xs text-slate-500 mb-1.5`}>
        Compare performance across all trading modes at a glance
      </div>
      <div className={`text-[11px] md:text-xs text-slate-400 mb-4`}>
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

      <div className={`overflow-x-auto md:overflow-visible`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className={`text-left p-2 text-[10px] md:text-xs font-semibold text-slate-500`}>Mode</th>
              <th className={`text-center p-2 text-[10px] md:text-xs font-semibold text-slate-500`}>
                Total Picks
              </th>
              <th className={`text-center p-2 text-[10px] md:text-xs font-semibold text-slate-500`}>
                Win Rate
              </th>
              <th className={`text-center p-2 text-[10px] md:text-xs font-semibold text-slate-500`}>
                Avg Return/Rec
              </th>
              <th className={`text-center p-2 text-[10px] md:text-xs font-semibold text-slate-500`}>
                Alpha vs NIFTY
              </th>
              <th className={`text-center p-2 text-[10px] md:text-xs font-semibold text-slate-500`}>
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
                Scalping: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-900' },
                Intraday: { bg: 'bg-amber-50', border: 'border-yellow-200', text: 'text-amber-900' },
                Swing: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-900' },
                Options: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900' },
                Futures: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800' },
              }
              const colors = modeColors[mode] || { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-800' }

              return (
                <tr key={mode} className="border-b border-slate-100">
                  <td className="py-2.5 px-2">
                    <span
                      className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${colors.bg} ${colors.border} ${colors.text}`}
                    >
                      {mode}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center text-sm font-semibold">
                    {modeRecs.length}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className="text-sm font-bold text-slate-900">{winRate}%</span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className={`text-sm font-bold ${avgNum > 0 ? 'text-green-600' : avgNum < 0 ? 'text-red-500' : 'text-slate-900'}`}
                    >
                      {avgDisplay}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className={`text-sm font-bold ${alphaNum > 0 ? 'text-green-600' : alphaNum < 0 ? 'text-red-500' : 'text-slate-900'}`}
                    >
                      {alphaDisplay}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-center text-xs">
                    <div className="flex flex-col items-center">
                      <span className="font-semibold text-slate-800">{bestPick.symbol}</span>
                      <span
                        className={`text-[10px] font-semibold ${bestPick.return_pct >= 0 ? 'text-green-600' : 'text-red-500'}`}
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
          className="mt-3.5 p-3 bg-orange-50 border border-orange-200 rounded-lg text-slate-800 text-xs leading-6"
        >
          <div className="font-bold mb-1.5">How we track performance</div>
          <div className="text-slate-600">
            Each recommendation's performance is tracked from the entry price suggested by our Trade Strategy Agent. Returns
            are calculated using the current market price (or exit price when closed). Status updates reflect when targets
            are hit or stop-losses are triggered.
          </div>
          <div className="mt-2.5 text-slate-900 font-semibold">Metric calculations</div>
          <div className="text-slate-600">
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
    </div>
  )
}
