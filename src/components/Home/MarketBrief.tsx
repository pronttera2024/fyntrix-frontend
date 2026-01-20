import React from 'react'
import { InsightCards } from '../InsightCards'
import { MarketHeatMap } from '../MarketHeatMap'

type MarketRegion = 'India' | 'Global'

interface MarketBriefProps {
    showPicks: boolean
    showPortfolio: boolean
    showWatchlist: boolean
    marketRegion: MarketRegion
    setMarketRegion: (region: MarketRegion) => void
    market: any
    sentiment: any
    spark: Record<string, number[]>
    tiles: Array<{
        name: string
        val: string
        pct?: number
    }>
    tip: { x: number; y: number; text: string } | null
    setTip: (tip: { x: number; y: number; text: string } | null) => void
    tipTimer: any
    setTipTimer: (timer: any) => void
    insights: any[]
    setInsights: (insights: any[]) => void
    dismissedInsightIds: Record<string, boolean>
    setDismissedInsightIds: (ids: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void
    showHeatMap: boolean
    heatMapStocks: any[]
    picks: any[]
    setChartView: (view: any) => void
    universe: string
    primaryMode: string
    setShowPicks: (show: boolean) => void
}

// Helper functions for date/time formatting
const formatIstDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

const formatIstTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    })
}

export const MarketBrief: React.FC<MarketBriefProps> = ({
    showPicks,
    showPortfolio,
    showWatchlist,
    marketRegion,
    setMarketRegion,
    market,
    sentiment,
    spark,
    tiles,
    tip,
    setTip,
    tipTimer,
    setTipTimer,
    insights,
    setInsights,
    dismissedInsightIds,
    setDismissedInsightIds,
    showHeatMap,
    heatMapStocks,
    picks,
    setChartView,
    universe,
    primaryMode,
    setShowPicks
}) => {
    return (
        <section className="p-2 border border-slate-200 rounded-md mb-3 shadow-sm">
            <div className="flex justify-between mb-3 gap-3 flex-wrap">
                <div className="flex flex-col gap-2">
                    <span className="text-lg font-semibold">Market Brief</span>
                    <div className="flex gap-2 border-b border-slate-200 pb-1">
                        {[
                            { value: 'India' as const, label: 'India Markets', icon: '🇮🇳' },
                            { value: 'Global' as const, label: 'World Markets', icon: '🌍' },
                        ].map(tab => {
                            const isActive = marketRegion === tab.value
                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => {
                                        if (marketRegion === tab.value) return
                                        const r = tab.value
                                        setMarketRegion(r)
                                        try { localStorage.setItem('arise_market_region', r) } catch { }
                                    }}
                                    className={`
                    border-none bg-transparent py-0.5 px-1 border-b-[3px] cursor-pointer flex items-center gap-1.5 text-sm
                    ${isActive
                                            ? 'border-b-blue-600 text-blue-700 font-semibold'
                                            : 'border-b-transparent text-slate-600 font-medium'
                                        }
                  `}
                                >
                                    <span className="text-sm">{tab.icon}</span>
                                    <span>{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
                <div className="flex flex-col px-2 w-full md:w-auto">
                    {(() => {
                        // Determine market open status strictly from weekday + intraday time window
                        const now = new Date()
                        const nowIst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
                        const day = nowIst.getDay() // 0=Sun, 6=Sat
                        const isWeekday = day >= 1 && day <= 5

                        const hours = nowIst.getHours()
                        const minutes = nowIst.getMinutes()
                        const currentTime = hours * 60 + minutes // minutes since midnight
                        const marketOpen = 9 * 60 + 15  // 9:15 AM = 555 minutes
                        const marketClose = 15 * 60 + 30 // 3:30 PM = 930 minutes

                        const isMarketOpen = isWeekday && currentTime >= marketOpen && currentTime <= marketClose

                        const prevTradingCloseIst = () => {
                            const closing = new Date(nowIst)
                            // If it's a weekday and after 3:30 PM IST, last close is today.
                            // Otherwise (pre-market / weekend), last close is previous trading day.
                            if (!(isWeekday && currentTime >= marketClose)) {
                                do {
                                    closing.setDate(closing.getDate() - 1)
                                } while (closing.getDay() === 0 || closing.getDay() === 6)
                            }
                            closing.setHours(15, 30, 0, 0)
                            return closing
                        }

                        // Determine appropriate timestamp:
                        // - Market open: use backend-provided market.as_of (preferred), else now
                        // - Market closed: always show last session close (never a future time)
                        let asOf: Date
                        if (isMarketOpen) {
                            const raw = market && market.as_of ? new Date(market.as_of) : null
                            asOf = raw && !Number.isNaN(raw.getTime()) ? raw : now
                        } else {
                            asOf = prevTradingCloseIst()
                        }

                        const datePart = formatIstDate(asOf)
                        const timePart = formatIstTime(asOf)
                        const ageMs = (() => {
                            try {
                                const t = asOf.getTime()
                                return Number.isNaN(t) ? null : (Date.now() - t)
                            } catch {
                                return null
                            }
                        })()
                        const isStale = isMarketOpen && typeof ageMs === 'number' && ageMs > 60_000
                        const label = isMarketOpen
                            ? isStale
                                ? `Last updated: ${datePart}, ${timePart}`
                                : `Data as of ${datePart}, ${timePart}`
                            : `Last closed: ${datePart}, ${timePart}`

                        return (
                            <div className="flex w-full flex-row md:flex-col justify-between md:justify-start gap-1 md:gap-2">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-2">
                                    <span className={`
                    md:text-xs text-sm rounded-full font-semibold px-2 py-1 animate-pulse animation-duration-100 animation-iteration-count-infinite
                    ${!isMarketOpen
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : (isStale
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-green-100 text-green-800'
                                            )
                                        }
                  `}>
                                        {!isMarketOpen ? '⏸️ Market Closed' : (isStale ? '🔴 Stale' : '🟢 Live')}
                                    </span>
                                    <span className="md:text-xs text-sm text-slate-600 whitespace-nowrap max-w-60 overflow-hidden text-ellipsis">
                                        {label}
                                    </span>
                                </div>
                                <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-2 ml-auto">
                                    <span className="inline-flex items-center gap-1.5 text-sm md:text-xs px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200" style={{ color: sentiment.color }}>
                                        <span className="inline-flex gap-0.25">
                                            {Array.from({ length: 5 }).map((_, i) => {
                                                const active = (sentiment.score || 0) > ((i - 2) * 15)
                                                const bg = active ? sentiment.color : '#cbd5e1'
                                                return <span key={i} className="md:w-[3px] w-2 md:h-[9px] h-3 rounded-[2px]" style={{ background: bg }} />
                                            })}
                                        </span>
                                        <span className="font-semibold text-base md:text-xs">{sentiment.label}</span>
                                    </span>
                                    {isMarketOpen && (
                                        <span className="text-sm md:text-xs text-slate-400 uppercase tracking-[0.5px]">Nifty 50 Sentiment</span>
                                    )}
                                </div>
                            </div>
                        )
                    })()}
                </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
                {tiles.length ? tiles.map(t => {
                    const isPositive = (t.pct || 0) >= 0
                    const trendColor = isPositive ? '#16a34a' : '#ef4444'
                    return (
                        <div key={t.name} className="min-w-60 flex-[0_0_auto] p-2.5 border border-slate-200 rounded-xl bg-white shadow-sm">
                            <div className="flex justify-between items-start mb-1.5">
                                <div>
                                    <div className="text-xs font-bold text-slate-900 uppercase mb-0.25">{t.name === 'GOLD' ? 'GOLD (IN $/OUNCE)' : t.name}</div>
                                </div>
                                {typeof t.pct === 'number' ? (
                                    <div className="flex flex-col items-end">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${(t.pct || 0) >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            {(t.pct || 0) >= 0 ? '↑' : '↓'} {Math.abs(t.pct).toFixed(2)}%
                                        </span>
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400">-</div>
                                )}
                            </div>
                            <div className="text-base font-bold mb-1.5">{t.val}</div>
                            <div className="h-7 relative">
                                {(() => {
                                    // Smart key lookup - try exact match, then fallbacks for global markets
                                    let key = t.name
                                    if (key === 'USD/INR') key = 'USDINR'
                                    // Try exact match first
                                    let s = spark[key] || []
                                    // If not found and it's a global market, try alternative keys
                                    if (!s.length && marketRegion === 'Global') {
                                        if (key === 'FTSE 100') s = spark['LSE (FTSE 100)'] || spark['^FTSE'] || []
                                        else if (key === 'S&P 500') s = spark['S&P 500'] || spark['^GSPC'] || []
                                        else if (key === 'NASDAQ') s = spark['NASDAQ'] || spark['^IXIC'] || []
                                        else if (key === 'Hang Seng') s = spark['Hang Seng'] || spark['^HSI'] || []
                                    }
                                    if (!s.length) {
                                        return <div className="text-[10px] text-slate-300 text-center pt-3">Chart loading...</div>
                                    }
                                    return (
                                        <svg className="w-full h-8 block" viewBox="0 0 180 40" preserveAspectRatio="none"
                                            onMouseMove={(e) => {
                                                const last = s[s.length - 1]; const prev = s[s.length - 2] ?? last
                                                const pct = prev ? ((last - prev) / prev * 100) : 0
                                                if (tipTimer) clearTimeout(tipTimer)
                                                const timer = setTimeout(() => {
                                                    const maxX = Math.max(0, (window.innerWidth || 0) - 200)
                                                    const maxY = Math.max(0, (window.innerHeight || 0) - 60)
                                                    const x = Math.min(e.clientX + 8, maxX)
                                                    const y = Math.min(e.clientY + 8, maxY)
                                                    setTip({ x, y, text: `Last ${last.toFixed(2)} · Prev ${prev.toFixed(2)} · ${(pct >= 0 ? '+' : '') + pct.toFixed(2)}%` })
                                                }, 60)
                                                setTipTimer(timer)
                                            }}
                                            onMouseLeave={() => { if (tipTimer) clearTimeout(tipTimer); setTip(null) }}>
                                            {(() => {
                                                // Build a smooth sparkline based on the actual intraday series
                                                const tilePct = t.pct ?? 0
                                                const strokeColor = tilePct >= 0 ? '#22c55e' : '#f97373'
                                                const areaFill = tilePct >= 0 ? '#dcfce7' : '#fee2e2'

                                                const width = 180
                                                const height = 40

                                                const values = s
                                                const n = values.length
                                                if (n < 2) {
                                                    const midY = height - 10
                                                    const dFlat = `M0,${midY} L${width},${midY}`
                                                    return (
                                                        <path d={dFlat} stroke={strokeColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
                                                    )
                                                }

                                                let min = Math.min(...values)
                                                let max = Math.max(...values)
                                                if (min === max) {
                                                    // Avoid divide-by-zero: expand a tiny band around the value
                                                    min = min - 1
                                                    max = max + 1
                                                }
                                                const span = max - min

                                                const marginTop = 6
                                                const marginBottom = 6
                                                const usableHeight = height - marginTop - marginBottom

                                                const points = values.map((v, idx) => {
                                                    const x = (idx / (n - 1)) * width
                                                    const norm = (v - min) / span // 0..1
                                                    const y = height - marginBottom - norm * usableHeight
                                                    return { x, y }
                                                })

                                                const baseY = height - marginBottom
                                                let areaPath = `M${points[0].x},${baseY}`
                                                for (let i = 0; i < points.length; i++) {
                                                    const p = points[i]
                                                    areaPath += ` L${p.x},${p.y}`
                                                }
                                                areaPath += ` L${points[points.length - 1].x},${baseY} Z`

                                                // Quadratic smoothing between points for a soft curve
                                                let d = `M${points[0].x},${points[0].y}`
                                                for (let i = 1; i < points.length; i++) {
                                                    const prev = points[i - 1]
                                                    const curr = points[i]
                                                    const midX = (prev.x + curr.x) / 2
                                                    const midY = (prev.y + curr.y) / 2
                                                    d += ` Q${prev.x},${prev.y} ${midX},${midY}`
                                                }
                                                // Ensure we end exactly at the last point
                                                const lastPoint = points[points.length - 1]
                                                d += ` T${lastPoint.x},${lastPoint.y}`

                                                return (
                                                    <>
                                                        <path d={areaPath} fill={areaFill} stroke="none" opacity={0.6} />
                                                        <path d={d} stroke={strokeColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
                                                    </>
                                                )
                                            })()}
                                        </svg>
                                    )
                                })()}
                            </div>
                        </div>
                    )
                }) : <div className="text-xs opacity-70 p-5 text-center">Loading market data...</div>}
            </div>
            {!showPicks && insights.length > 0 && (
                <div className="mt-2.5 mb-1.5 flex justify-center">
                    <div className="max-w-[520px] w-full">
                        <InsightCards
                            insights={insights}
                            onInsightClick={(insight) => {
                                if (insight.metadata && 'symbols' in insight.metadata) {
                                    setShowPicks(true)
                                }
                            }}
                            onDismiss={(id) => {
                                setInsights(insights.filter(i => i.id !== id))
                                setDismissedInsightIds((prev: Record<string, boolean>) => ({ ...prev, [id]: true }))
                            }}
                        />
                    </div>
                </div>
            )}
            {showHeatMap && picks.length > 0 && (
                <div className="mt-2.5">
                    <MarketHeatMap
                        stocks={heatMapStocks}
                        onStockClick={(symbol) => {
                            const row = picks.find((p: any) => p.symbol === symbol)
                            if (row) {
                                setChartView({ symbol: row.symbol, analysis: row })
                            } else {
                                setChartView({ symbol })
                            }
                        }}
                        universe={universe}
                        modeLabel={primaryMode}
                    />
                </div>
            )}
        </section>
    )
}
