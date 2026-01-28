import React, { useEffect, useRef, useState, useMemo } from 'react'
import { createChart, IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts'
import { X, TrendingUp, Target, Shield, Activity, AlertCircle } from 'lucide-react'
import { getChartData, postStrategySuggest, addWatchlistEntry } from '../api'
import { showSuccessToast, showErrorToast } from '../utils/exitToast'
import type { Pick as AIPick, ExitStrategy as ExitStrategyModel } from '../types/picks'
import { TradeStrategyPanel } from './TradeStrategyPanel'
import { classifyPickDirection } from '../utils/recommendation'
import { TradeExecutionModal, type ExecuteTradePayload } from './TradeExecutionModal'
import { BrokerModal } from './BrokerModal'

interface ChartViewProps {
  symbol: string
  onClose: () => void
  analysis?: AIPick  // 7-agent analysis data (Top Pick)
  livePrice?: { last_price?: number; change_percent?: number; volume?: number; updated_at?: string }
  onSubscribeSymbols?: (symbols: string[]) => void
  onUnsubscribeSymbols?: (symbols: string[]) => void
  accountId?: string
  sessionId?: string
}

export function ChartView({ symbol, onClose, analysis, livePrice, onSubscribeSymbols, onUnsubscribeSymbols, accountId, sessionId }: ChartViewProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [chart, setChart] = useState<IChartApi | null>(null)
  const [candlestickSeries, setCandlestickSeries] = useState<ISeriesApi<"Candlestick"> | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any>(null)
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1M')
  const [strategyPlan, setStrategyPlan] = useState<any | null>(null)
  const [strategyLoading, setStrategyLoading] = useState(false)
  const priceLinesRef = useRef<any[]>([])
  const [highlightSignalTime, setHighlightSignalTime] = useState<any | null>(null)
  const [crosshairSignal, setCrosshairSignal] = useState<{ time: any; text: string } | null>(null)

  const [tradeOpen, setTradeOpen] = useState(false)
  const [brokerOpen, setBrokerOpen] = useState(false)

  // Subscribe to live ticks for this symbol if helpers are provided
  useEffect(() => {
    if (!symbol) return
    if (!onSubscribeSymbols || !onUnsubscribeSymbols) return
    onSubscribeSymbols([symbol])
    return () => {
      onUnsubscribeSymbols([symbol])
    }
  }, [symbol, onSubscribeSymbols, onUnsubscribeSymbols])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const formatIstLabel = (time: any) => {
      const ts = typeof time === 'object' && time !== null && 'timestamp' in time
        ? (time as any).timestamp
        : (time as number)
      if (!ts) return ''
      try {
        const d = new Date(ts * 1000)
        return d.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch {
        return ''
      }
    }

    const newChart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      // Slightly reduced height to keep the modal more compact
      height: 360,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#d1d4dc',
      },
      timeScale: {
        borderColor: '#d1d4dc',
        timeVisible: true,
        tickMarkFormatter: formatIstLabel as any,
      },
    })

    const candlestick = newChart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })

    setChart(newChart)
    setCandlestickSeries(candlestick)

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        newChart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      newChart.remove()
    }
  }, [])

  const tradePayload = useMemo((): ExecuteTradePayload => {
    let side: string = 'BUY'
    try {
      const rec = String((analysis as any)?.recommendation || '')
      if (rec.toLowerCase().includes('sell')) side = 'SELL'
    } catch {}

    let qty = 1
    try {
      const plan = (analysis as any)?.trade_plan || (strategyPlan as any)?.plan
      const q = plan?.quantity
      if (typeof q === 'number' && q > 0) qty = q
    } catch {}

    return {
      account_id: accountId,
      session_id: sessionId,
      source: 'CHART',
      broker: 'ZERODHA',
      symbol,
      exchange: 'NSE',
      segment: 'CASH',
      product: 'CNC',
      side,
      qty,
      order_type: 'MARKET',
    }
  }, [accountId, sessionId, symbol, analysis, strategyPlan])

  // Fetch trade strategy if not already provided via analysis
  useEffect(() => {
    const fetchStrategy = async () => {
      if (!symbol) return
      // If analysis already contains a trade_plan, reuse it
      if (analysis && (analysis as any).trade_plan) {
        setStrategyPlan({ plan: (analysis as any).trade_plan })
        return
      }

      try {
        setStrategyLoading(true)

        // Reuse same session / risk / modes logic as main app
        let sessionId = 'local'
        try {
          sessionId = localStorage.getItem('arise_session') || 'local'
        } catch {}

        let risk: string = 'Moderate'
        let modes: any = { Intraday: true, Swing: true, Options: false, Futures: false, Commodity: false }
        let primaryMode: string = 'Swing'
        try {
          risk = (localStorage.getItem('arise_risk') as any) || 'Moderate'
          modes = JSON.parse(localStorage.getItem('arise_modes') || 'null') || modes
          primaryMode = localStorage.getItem('arise_primary_mode') || primaryMode
        } catch {}

        const body = {
          symbol,
          session_id: sessionId,
          risk,
          modes,
          primary_mode: primaryMode,
          context: { scores: analysis?.scores }
        }

        const resp = await postStrategySuggest(body as any)
        if (resp?.plan) {
          setStrategyPlan(resp)
        }
      } catch (err) {
        console.error('Failed to fetch strategy for chart view:', err)
      } finally {
        setStrategyLoading(false)
      }
    }

    fetchStrategy()
  }, [symbol, analysis])

  // Fetch chart data
  useEffect(() => {
    const fetchChartData = async () => {
      console.log('🔵 Fetching chart data for:', symbol, timeframe)
      setLoading(true)
      try {
        const data = await getChartData(symbol, timeframe)
        console.log('✅ Chart data received:', {
          source: data.data_source,
          candles: data.candles?.length,
          signals: data.signals?.length,
          firstCandle: data.candles?.[0]
        })
        setChartData(data)

        if (candlestickSeries && data.candles && data.candles.length > 0) {
          console.log('📊 Setting candle data to chart...')
          console.log('📊 Total candles to set:', data.candles.length)
          console.log('📊 First 3 candles:', data.candles.slice(0, 3))
          console.log('📊 Last candle:', data.candles[data.candles.length - 1])
          
          try {
            // Ensure data is properly formatted and strictly ordered by time
            const formattedCandles = data.candles
              .map((c: any) => ({
                time: typeof c.time === 'number' ? c.time : Number(c.time),
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
              }))
              .filter((c: any) =>
                Number.isFinite(c.time) &&
                Number.isFinite(c.open) &&
                Number.isFinite(c.high) &&
                Number.isFinite(c.low) &&
                Number.isFinite(c.close)
              )
              .sort((a: any, b: any) => (a.time as number) - (b.time as number))

            candlestickSeries.setData(formattedCandles)
            console.log('✅ Candles set successfully')

            // Fit content / set initial visible range and force resize
            if (chart) {
              setTimeout(() => {
                if (!chartContainerRef.current) return
                // Force chart resize to container dimensions
                chart.applyOptions({ 
                  width: chartContainerRef.current.clientWidth,
                  height: 360
                })

                const timeScale = chart.timeScale()
                if (timeframe === '1D' && formattedCandles.length > 0) {
                  // Show roughly the last trading day (about 100 five-minute candles)
                  const visibleCount = 100
                  const len = formattedCandles.length
                  const fromIndex = Math.max(0, len - visibleCount)
                  const fromTime = formattedCandles[fromIndex].time
                  const toTime = formattedCandles[len - 1].time
                  timeScale.setVisibleRange({ from: fromTime as any, to: toTime as any })
                } else {
                  timeScale.fitContent()
                }

                console.log('✅ Chart resized and initial range set')
              }, 150)
            }
          } catch (error) {
            console.error('❌ Error setting candles:', error)
            console.error('❌ Data format:', data.candles[0])
          }
        } else {
          console.warn('⚠️  Cannot set candles:', { candlestickSeries: !!candlestickSeries, candlesCount: data.candles?.length })
        }

        // Add Exit Strategy levels if picks/analysis provide one.
        // To avoid clutter, EXIT STRATEGY is primary. Only if missing,
        // we fall back to Trade Strategy plan for levels.
        const effectiveExitStrategy = analysis?.exit_strategy
        const effectiveTradePlan = (analysis as any)?.trade_plan || strategyPlan?.plan

        if (chart && effectiveExitStrategy) {
          console.log('📍 Adding exit strategy levels (primary)')
          addExitStrategyLevels(effectiveExitStrategy)
        } else if (chart && effectiveTradePlan) {
          console.log('📍 Adding trading levels (fallback, no exit_strategy)')
          addTradingLevels(effectiveTradePlan)
        }

        setLoading(false)
      } catch (error) {
        console.error('❌ Failed to fetch chart data:', error)
        setLoading(false)
      }
    }

    if (candlestickSeries) {
      fetchChartData()
    } else {
      console.log('⏳ Waiting for candlestickSeries to be initialized...')
    }
  }, [symbol, timeframe, candlestickSeries, chart])

  const addAIMarkers = (signals: any[]) => {
    if (!candlestickSeries || !Array.isArray(signals) || signals.length === 0) return

    const MAX_TEXT_LEN = 60
    const normalizeText = (text: any) => {
      const s = String(text ?? '')
      if (s.length <= MAX_TEXT_LEN) return s
      return s.slice(0, MAX_TEXT_LEN - 1) + '…'
    }

    type Marker = {
      time: any
      position: 'aboveBar' | 'belowBar'
      color: string
      shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square'
      text: string
    }

    // Group signals by time and de-duplicate identical time+text pairs
    const byTime = new Map<any, Marker[]>()
    const seen = new Set<string>()

    for (const signal of signals) {
      if (!signal || signal.time == null) continue
      const key = `${signal.time}|${signal.text}`
      if (seen.has(key)) continue
      seen.add(key)

      const isBullish = signal.type === 'bullish'
      const textLower = String(signal.text ?? '').toLowerCase()

      // Classify by text for distinct marker styles
      let color = isBullish ? '#26a69a' : '#ef5350'
      let shape: Marker['shape'] = isBullish ? 'arrowUp' : 'arrowDown'
      if (textLower.includes('volume')) {
        color = '#0ea5e9'
        shape = 'circle'
      } else if (textLower.includes('macd') || textLower.includes('rsi') || textLower.includes('breakout')) {
        color = '#6366f1'
        shape = isBullish ? 'arrowUp' : 'arrowDown'
      } else if (textLower.includes('gap')) {
        color = '#f97316'
        shape = 'square'
      }

      const marker: Marker = {
        time: signal.time,
        position: isBullish ? 'belowBar' : 'aboveBar',
        color,
        shape,
        text: normalizeText(signal.text),
      }

      const existing = byTime.get(signal.time) || []
      existing.push(marker)
      byTime.set(signal.time, existing)
    }

    const markers: Marker[] = []

    // For each candle/time, keep at most one bullish (belowBar) and one bearish (aboveBar)
    for (const [, group] of byTime.entries()) {
      const bullish = group.find(m => m.position === 'belowBar')
      const bearish = group.find(m => m.position === 'aboveBar')
      if (bullish) markers.push(bullish)
      if (bearish) markers.push(bearish)
    }

    const finalMarkers = markers.map(m => {
      const isHighlighted = highlightSignalTime != null && m.time === highlightSignalTime
      return {
        ...m,
        color: isHighlighted
          ? (m.position === 'belowBar' ? '#22c55e' : '#f97316')
          : m.color,
      }
    })

    const validMarkers = finalMarkers.filter(m => typeof m.time === 'number' && Number.isFinite(m.time))
    const sortedMarkers = validMarkers.sort((a, b) => (a.time as number) - (b.time as number))

    try {
      candlestickSeries.setMarkers(sortedMarkers as any)
    } catch (err) {
      console.error('[ChartView] Failed to set markers', err)
    }
  }

  const addExitStrategyLevels = (exit: any) => {
    if (!chart || !candlestickSeries || !exit) return

    // Clear previously drawn entry/SL/target lines to avoid duplicates
    if (priceLinesRef.current.length) {
      try {
        priceLinesRef.current.forEach(line => {
          try { candlestickSeries.removePriceLine(line) } catch {}
        })
      } catch {}
      priceLinesRef.current = []
    }

    // Entry price: prefer generic entry_price, fall back to trade plan entry if needed
    const entry = Number(exit.entry_price || (analysis as any)?.entry_price || 0)

    // 1) Entry line (keep label compact to avoid clutter)
    if (entry) {
      const line = candlestickSeries.createPriceLine({
        price: entry,
        color: '#16a34a',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `🟢 Entry: ₹${entry.toFixed(2)}`,
      })
      priceLinesRef.current.push(line)
    }

    // 2) Targets (supports both generic targets[] and legacy target_price)
    let targets: any[] = []
    if (Array.isArray(exit.targets) && exit.targets.length > 0) {
      targets = exit.targets
    } else if (exit.target_price) {
      targets = [{
        label: 'T1',
        price: Number(exit.target_price),
        pct: exit.target_pct,
        booking: 1.0,
      }]
    }

    targets.forEach((t: any, idx: number) => {
      const price = Number(t.price)
      if (!price) return
      const pctLabel = entry
        ? ` (+${((price - entry) / entry * 100).toFixed(1)}%)`
        : t.pct != null
        ? ` (${t.pct}% )`
        : ''

      const line = candlestickSeries.createPriceLine({
        price,
        color: '#2563eb',
        lineWidth: 2,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `🎯 ${t.label || 'T' + (idx + 1)}: ₹${price.toFixed(2)}${pctLabel}`,
      })
      priceLinesRef.current.push(line)
    })

    // 3) Stop-loss (supports generic stop_loss and legacy stop_loss_price)
    let stopPrice: number | null = null
    if (exit.stop_loss && exit.stop_loss.price) {
      stopPrice = Number(exit.stop_loss.price)
    } else if (exit.stop_loss_price) {
      stopPrice = Number(exit.stop_loss_price)
    }

    if (stopPrice) {
      const riskPct = entry
        ? ` (-${((entry - stopPrice) / entry * 100).toFixed(1)}%)`
        : ''
      const line = candlestickSeries.createPriceLine({
        price: stopPrice,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `🛑 SL: ₹${stopPrice.toFixed(2)}${riskPct}`,
      })
      priceLinesRef.current.push(line)
    }
  }

  const addTradingLevels = (tradePlan: any) => {
    if (!chart || !candlestickSeries || !tradePlan) return

    // Clear previously drawn entry/SL/target lines to avoid duplicates
    if (priceLinesRef.current.length) {
      try {
        priceLinesRef.current.forEach(line => {
          try { candlestickSeries.removePriceLine(line) } catch {}
        })
      } catch {}
      priceLinesRef.current = []
    }

    const entry = Number(tradePlan.entry)
    const stopLoss = Number(tradePlan.stop_loss)
    const target1 = Number(tradePlan.target_1)
    const target2 = Number(tradePlan.target_2)
    const target3 = Number(tradePlan.target_3)

    // Add price lines directly to candlestick series
    if (entry) {
      const line = candlestickSeries.createPriceLine({
        price: entry,
        color: '#26a69a',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `🟢 Entry: ₹${entry.toFixed(2)}`,
      })
      priceLinesRef.current.push(line)
    }

    if (target1) {
      const line = candlestickSeries.createPriceLine({
        price: target1,
        color: '#2196F3',
        lineWidth: 2,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `🎯 T1: ₹${target1.toFixed(2)} (+${((target1-entry)/entry*100).toFixed(1)}%)`,
      })
      priceLinesRef.current.push(line)
    }

    if (target2) {
      const line = candlestickSeries.createPriceLine({
        price: target2,
        color: '#1976D2',
        lineWidth: 2,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `🎯 T2: ₹${target2.toFixed(2)} (+${((target2-entry)/entry*100).toFixed(1)}%)`,
      })
      priceLinesRef.current.push(line)
    }

    if (target3) {
      const line = candlestickSeries.createPriceLine({
        price: target3,
        color: '#0D47A1',
        lineWidth: 2,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `🎯 T3: ₹${target3.toFixed(2)} (+${((target3-entry)/entry*100).toFixed(1)}%)`,
      })
      priceLinesRef.current.push(line)
    }

    if (stopLoss) {
      const line = candlestickSeries.createPriceLine({
        price: stopLoss,
        color: '#ef5350',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `🛑 SL: ₹${stopLoss.toFixed(2)} (-${((entry-stopLoss)/entry*100).toFixed(1)}%)`,
      })
      priceLinesRef.current.push(line)
    }
  }

  const combinedSignals = useMemo(() => {
    const baseSignals = Array.isArray(chartData?.signals) ? chartData.signals : []
    const patternSignals: any[] = []

    const candles = chartData?.candles
    const lastTime = Array.isArray(candles) && candles.length > 0 ? candles[candles.length - 1].time : undefined

    const keySignals = (analysis as any)?.key_signals
    if (lastTime && Array.isArray(keySignals)) {
      for (const sig of keySignals) {
        if (!sig) continue
        const agentName = typeof sig.agent === 'string' ? sig.agent.toLowerCase() : ''
        if (agentName && agentName !== 'pattern_recognition' && agentName !== 'pattern_recognition_agent') continue
        const name = sig.type || sig.signal
        if (!name) continue
        const dirRaw = (sig.direction || '').toString().toUpperCase()
        const signalType = dirRaw === 'BULLISH' ? 'bullish' : dirRaw === 'BEARISH' ? 'bearish' : 'neutral'
        const confidence = typeof sig.confidence === 'number' ? sig.confidence : undefined
        const description = typeof sig.description === 'string' ? sig.description : ''

        let text = String(name)
        if (confidence != null && confidence > 0) {
          text += ` (${confidence.toFixed(0)}%)`
        }
        if (description && !text.toLowerCase().includes(description.toLowerCase())) {
          text += ` – ${description}`
        }

        patternSignals.push({
          time: lastTime,
          type: signalType,
          text,
          detail: description || name,
        })
      }
    }

    // Put pattern signals first so they show prominently, then base technical/volume signals
    return [...patternSignals, ...baseSignals]
  }, [chartData, analysis])

  // Re-apply AI markers whenever signals or highlighted signal changes
  useEffect(() => {
    if (!candlestickSeries || !combinedSignals || combinedSignals.length === 0) return
    addAIMarkers(combinedSignals)
  }, [candlestickSeries, combinedSignals, highlightSignalTime])

  // Crosshair-based tooltip: when crosshair is over a marker time, show its text
  useEffect(() => {
    if (!chart || !combinedSignals || combinedSignals.length === 0) return

    const handler = (param: any) => {
      try {
        const tRaw = param?.time
        if (!tRaw) {
          setCrosshairSignal(null)
          setHighlightSignalTime(null)
          return
        }
        const t = typeof tRaw === 'object' && tRaw !== null && 'timestamp' in tRaw ? (tRaw as any).timestamp : tRaw
        const match = combinedSignals.find((s: any) => s && s.time === t)
        if (match) {
          setCrosshairSignal({ time: match.time, text: String(match.text ?? '') })
          setHighlightSignalTime(match.time)
        } else {
          setCrosshairSignal(null)
          setHighlightSignalTime(null)
        }
      } catch {
        // Non-fatal: ignore crosshair errors
      }
    }

    chart.subscribeCrosshairMove(handler as any)
    return () => {
      try {
        chart.unsubscribeCrosshairMove(handler as any)
      } catch {}
    }
  }, [chart, combinedSignals])

  // Standardized color scheme
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10b981'  // Green
    if (score >= 50) return '#3b82f6'  // Blue
    if (score >= 30) return '#f59e0b'  // Orange
    return '#ef4444'                    // Red
  }

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'High'
    if (score >= 50) return 'Medium'
    if (score >= 30) return 'Low'
    return 'Very Low'
  }

  const blendScore = analysis ? (analysis.score_blend ?? analysis.blend_score ?? 0) : 0

  const resolvePrimaryMode = () => {
    let mode = 'Swing'
    try {
      const stored = localStorage.getItem('arise_primary_mode')
      if (stored) mode = stored
    } catch {}
    return mode
  }

  const primaryModeForChart = resolvePrimaryMode()
  const direction = analysis ? classifyPickDirection(blendScore, primaryModeForChart) : null
  const recommendationLabel =
    direction?.label ||
    ((analysis as any)?.recommendation as string | undefined) ||
    'Buy'

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 md:p-5">
      <div className="chart-modal-shell bg-white rounded-xl w-full max-w-[1400px] max-h-[90vh] overflow-auto shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* Header */}
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-200 sticky top-0 z-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-t-xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:top-5 md:right-6 bg-white/20 border-none p-2 rounded-lg cursor-pointer text-white"
          >
            <X size={20} className="md:w-6 md:h-6" />
          </button>
          <div className="pr-12 md:pr-0">
            <h2 className="m-0 text-xl md:text-2xl font-bold">
              {symbol}
              {analysis && (
                <span className="ml-2 md:ml-4 text-xs md:text-base bg-green-500 text-white px-[10px] md:px-[14px] py-1 md:py-1.5 rounded-[20px] font-semibold inline-block">
                  {recommendationLabel} ({blendScore}/100)
                </span>
              )}
            </h2>
            {(() => {
              const base = chartData?.current || {}
              const price = typeof livePrice?.last_price === 'number' ? livePrice.last_price : base.price
              const change = typeof livePrice?.change_percent === 'number' ? livePrice.change_percent : base.change
              const volume = typeof livePrice?.volume === 'number' ? livePrice.volume : base.volume

              if (typeof price !== 'number') return null

              return (
                <div className="mt-2 text-xs md:text-sm opacity-90">
                  <div className="flex flex-row items-center gap-1 md:gap-2">
                    <span>Current: ₹{price.toFixed(2)}</span>
                    {typeof change === 'number' && (
                      <>
                        <span className="hidden md:inline">|</span>
                        <span>Change: <span className={change >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                        </span></span>
                      </>
                    )}
                    {typeof volume === 'number' && (
                      <>
                        <span className="hidden md:inline">|</span>
                        <span>Volume: {(volume / 1000000).toFixed(2)}M</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })()}

            {(analysis as any)?.exit_strategy?.time_exit && (
              <div className="mt-1 text-xs opacity-90">
                Exit Horizon: <span className="font-semibold">
                  {(((analysis as any).exit_strategy.time_exit.max_hold_mins || 0) / 60).toFixed(1)} hrs
                </span>
                {((analysis as any).exit_strategy.time_exit.eod_exit !== undefined) && (
                  <span>
                    {` | EOD Exit: `}
                    <span className="font-semibold">
                      {(analysis as any).exit_strategy.time_exit.eod_exit ? 'Yes' : 'No'}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 flex gap-2 overflow-x-auto">
          {(['1D', '1W', '1M', '1Y'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-2 md:px-4 md:py-2 border-2 rounded-md cursor-pointer font-medium text-sm md:text-base whitespace-nowrap ${
                timeframe === tf 
                  ? 'border-indigo-500 bg-blue-50 text-indigo-500' 
                  : 'border-gray-300 bg-white text-gray-600'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="px-4 py-4 md:px-6 md:py-6">
          {loading && (
            <div className="h-[300px] md:h-[360px] flex items-center justify-center text-gray-500">
              Loading chart data...
            </div>
          )}
          <div ref={chartContainerRef} className={`${loading ? 'hidden' : 'block'} w-full h-[300px] md:h-[360px] relative`}>
            {crosshairSignal && crosshairSignal.text && (
              <div className="absolute top-2 right-2 max-w-[80%] md:max-w-[60%] bg-slate-900/90 text-gray-200 px-2 py-1.5 md:px-2.5 md:py-1.5 rounded-md text-[10px] md:text-xs leading-tight pointer-events-none shadow-lg z-[5]">
                {crosshairSignal.text}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced AI Insights Panel */}
        {analysis && (
          <div className="px-4 py-4 md:px-6 md:py-6 bg-gray-50 border-t border-gray-200">
            <h3 className="m-0 mb-4 md:mb-5 text-lg md:text-xl font-bold text-sky-700">
              📊 AI Insights & Analysis
            </h3>

            {/* Confidence Meter */}
            <div className="mb-4 md:mb-6 bg-white p-4 md:p-5 rounded-xl border border-gray-200">
              <div className="text-xs md:text-sm font-semibold mb-2 md:mb-3 text-slate-600">Overall Confidence Score:</div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex-1 h-2 md:h-3 bg-gray-200 rounded-md overflow-hidden">
                  <div 
                    className="h-full transition-all duration-300 rounded-md"
                    style={{
                      width: `${blendScore}%`,
                      backgroundColor: getScoreColor(blendScore),
                    }}
                  />
                </div>
                <span className="text-sm md:text-lg font-bold min-w-[100px] md:min-w-[120px]" style={{ color: getScoreColor(analysis.score_blend || analysis.blend_score) }}>
                  {blendScore}% {getScoreLabel(blendScore)}
                </span>
              </div>
              <div className="mt-2 md:mt-3 text-[11px] md:text-xs text-slate-500 italic">
                Consensus from {analysis.scores ? Object.keys(analysis.scores).filter(k => !['trade_strategy', 'auto_monitoring', 'personalization'].includes(k)).length : '10'} AI agents · {recommendationLabel} recommendation
              </div>
            </div>

            {/* Agent Insights: side-by-side layout to match Multi-Agent System */}
            {analysis.scores && (
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] gap-4 mb-4 md:mb-6">
                {/* 10 Core Scoring Agents (same label as Top Five Picks) */}
                <div className="bg-white p-3 md:p-5 rounded-xl border border-gray-200">
                  <div className="text-sm md:text-base font-semibold mb-3 md:mb-4 text-slate-800">10 Core Scoring Agents:</div>
                  <div className="grid gap-2 md:gap-2.5">
                    {Object.entries(analysis.scores)
                      .filter(([agent]) => !['trade_strategy', 'auto_monitoring', 'personalization'].includes(agent))
                      .map(([agent, score]: any) => (
                        <div key={agent} className="flex items-center gap-2 md:gap-3">
                          <div className="w-32 md:w-40 text-[11px] md:text-xs font-medium capitalize text-slate-600">
                            {agent.replace(/_/g, ' ')}
                          </div>
                          <div className="flex-1 h-1.5 md:h-2 bg-gray-200 rounded overflow-hidden">
                            <div 
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${score}%`,
                                backgroundColor: getScoreColor(score),
                              }}
                            />
                          </div>
                          <div className="w-10 md:w-12 text-[11px] md:text-xs font-semibold text-right" style={{ color: getScoreColor(score) }}>
                            {score}%
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Comprehensive Analysis (aligned with picks section) */}
                <div className="bg-white p-3 md:p-5 rounded-xl border border-gray-200">
                  <div className="text-sm md:text-base font-semibold mb-2 md:mb-3 text-slate-800">Comprehensive Analysis:</div>
                  <div className="text-xs md:text-sm text-slate-600 leading-6 md:leading-7">
                    {analysis.rationale ? (
                      <div className="bg-gray-50 px-3 py-2.5 md:px-3.5 md:py-3 rounded-lg border border-gray-200 text-[11px] md:text-xs">
                        {analysis.rationale}
                      </div>
                    ) : (
                      <div className="bg-white px-3 py-2.5 md:px-3.5 md:py-3 rounded-lg border border-gray-200 text-[11px] md:text-xs">
                        <div className="mb-1.5 md:mb-2"><strong>Multi-Agent Assessment:</strong></div>
                        <ul className="m-0 pl-4 md:pl-5">
                          {(() => {
                            const scores = analysis.scores || {}
                            const items: JSX.Element[] = []
                            if (typeof scores.technical === 'number') {
                              items.push(
                                <li key="technical"><strong>Technical Analysis:</strong> Score {scores.technical}% - Price action, trends, and momentum indicators.</li>
                              )
                            }
                            if (typeof scores.sentiment === 'number') {
                              items.push(
                                <li key="sentiment"><strong>Sentiment Analysis:</strong> Score {scores.sentiment}% - Market sentiment and news analysis.</li>
                              )
                            }
                            if (typeof scores.options === 'number') {
                              items.push(
                                <li key="options"><strong>Options Analysis:</strong> Score {scores.options}% - Options flow and implied volatility.</li>
                              )
                            }
                            if (typeof scores.pattern === 'number') {
                              items.push(
                                <li key="pattern"><strong>Pattern Recognition:</strong> Score {scores.pattern}% - Historical pattern matching.</li>
                              )
                            }
                            if (typeof scores.policy === 'number') {
                              items.push(
                                <li key="policy"><strong>Policy Impact:</strong> Score {scores.policy}% - Macro and policy analysis.</li>
                              )
                            }
                            if (typeof scores.risk === 'number') {
                              items.push(
                                <li key="risk"><strong>Risk Assessment:</strong> Score {scores.risk}% - Risk-reward evaluation.</li>
                              )
                            }
                            return items
                          })()}
                        </ul>
                        <div className="mt-1.5 md:mt-2 italic text-slate-500">
                          Recommendation based on {recommendationLabel} stance with {getScoreLabel(blendScore)} confidence level.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Comprehensive Trade Strategy */}
            {(() => {
              const effectiveTradePlan = (analysis as any)?.trade_plan || strategyPlan?.plan
              if (!effectiveTradePlan) return null
              return (
                <div className="mb-3 md:mb-5">
                  <TradeStrategyPanel
                    symbol={symbol}
                    plan={effectiveTradePlan}
                    blendScore={analysis.score_blend || analysis.blend_score}
                    strategyRationale={(analysis as any)?.strategy_rationale}
                    scores={analysis.scores}
                    recommendation={(analysis as any)?.recommendation}
                    primaryMode={primaryModeForChart}
                    showActions={false}
                  />
                </div>
              )
            })()}

            {/* If strategy is still loading and we don't yet have a plan, show a subtle hint */}
            {!((analysis as any)?.trade_plan || strategyPlan?.plan) && strategyLoading && (
              <div className="mb-3 md:mb-4 text-[11px] md:text-xs text-slate-500 italic">
                Generating trade strategy from multi-agent analysis...
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3 md:gap-4">
              {/* Key Signals Card */}
              {combinedSignals && combinedSignals.length > 0 && (
                <div className="bg-white p-3 md:p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center mb-2 md:mb-3">
                    <Activity size={16} className="mr-2 md:mr-2 text-blue-500 md:w-5 md:h-5" />
                    <strong className="text-sm md:text-base">AI Signals Detected on Chart</strong>
                  </div>
                  {(() => {
                    // Keep only unique signal texts (up to 5) for readability
                    const seen = new Set<string>()
                    const unique: any[] = []
                    for (const s of combinedSignals) {
                      const label = String(s.text ?? '')
                      if (!label || seen.has(label)) continue
                      seen.add(label)
                      unique.push(s)
                      if (unique.length >= 5) break
                    }

                    const getSignalVisual = (signal: any) => {
                      const text = String(signal.text ?? '').toLowerCase()
                      if (text.includes('volume')) return { icon: '📈', color: '#0ea5e9' }
                      if (text.includes('macd') || text.includes('rsi') || text.includes('breakout')) return { icon: '📊', color: '#6366f1' }
                      if (text.includes('gap')) return { icon: '⚡', color: '#f97316' }
                      if (
                        text.includes('wedge') ||
                        text.includes('channel') ||
                        text.includes('triple top') ||
                        text.includes('triple bottom') ||
                        text.includes('double top') ||
                        text.includes('double bottom') ||
                        text.includes('cup and handle') ||
                        text.includes('triangle') ||
                        text.includes('flag') ||
                        text.includes('rectangle') ||
                        text.includes('rounding') ||
                        text.includes('head & shoulders') ||
                        text.includes('inverse head & shoulders') ||
                        text.includes('doji') ||
                        text.includes('hammer') ||
                        text.includes('shooting star')
                      ) {
                        if (signal.type === 'bullish') return { icon: '📐', color: '#22c55e' }
                        if (signal.type === 'bearish') return { icon: '📐', color: '#ef4444' }
                        return { icon: '📐', color: '#6b7280' }
                      }
                      if (signal.type === 'bullish') return { icon: '🟢', color: '#22c55e' }
                      return { icon: '🔴', color: '#ef4444' }
                    }

                    return (
                      <>
                        {unique.map((signal: any, idx: number) => {
                          const visual = getSignalVisual(signal)
                          return (
                            <div
                              key={idx}
                              className="mb-1.5 md:mb-2 text-[11px] md:text-xs flex items-center gap-1.5 md:gap-2"
                              onMouseEnter={() => setHighlightSignalTime(signal.time)}
                              onMouseLeave={() => setHighlightSignalTime(null)}
                            >
                              <span className="text-sm md:text-base">{visual.icon}</span>
                              <span className="leading-tight">{signal.text}</span>
                            </div>
                          )
                        })}
                        <div className="mt-1.5 md:mt-2 text-[10px] md:text-[11px] text-gray-400">
                          <div className="hidden md:block">
                            Legend: 📈 Volume Surge · 📊 MACD / Technical Breakout · ⚡ Gap Up / Momentum · 🟢 Bullish · 🔴 Bearish
                          </div>
                          <div className="md:hidden">
                            📈 Volume · � MACD · ⚡ Gap · �🟢 Bullish · 🔴 Bearish
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {/* Data Source */}
              <div className="bg-white p-3 md:p-4 rounded-lg border border-gray-200">
                <div className="flex items-center mb-2 md:mb-3">
                  <AlertCircle size={16} className="mr-2 md:mr-2 text-indigo-500 md:w-5 md:h-5" />
                  <strong className="text-sm md:text-base">Data Information</strong>
                </div>
                <div className="text-[11px] md:text-xs text-slate-500 leading-5 md:leading-6">
                  <div><strong>Source:</strong> {chartData?.data_source || 'Loading...'}</div>
                  <div><strong>Candles:</strong> {chartData?.candles?.length || 0}</div>
                  <div><strong>Timeframe:</strong> {timeframe}</div>
                  <div className="mt-1.5 md:mt-2 text-[11px] md:text-[12px] italic">
                    {chartData?.data_source === 'Zerodha Kite' ? '✅ Real-time market data' : '⚠️ Using fallback data'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 md:mt-5 flex gap-2 md:gap-3 flex-wrap">
              <button
                className="px-4 py-2 md:px-5 md:py-2.5 bg-teal-500 text-white border-none rounded-md cursor-pointer font-semibold text-sm md:text-base"
                onClick={() => setBrokerOpen(true)}
              >
                Execute Trade
              </button>
              <button
                className="px-4 py-2 md:px-5 md:py-2.5 bg-indigo-500 text-white border-none rounded-md cursor-pointer font-semibold text-sm md:text-base"
                onClick={async () => {
                  try {
                    if (!symbol) return
                    const base = (chartData as any)?.current || {}
                    const price = typeof base.price === 'number' ? base.price : undefined
                    await addWatchlistEntry({
                      symbol,
                      timeframe,
                      desired_entry: price,
                      source: 'chart',
                    })
                    showSuccessToast(`Alert set for ${symbol} at ₹${price?.toFixed(2) || 'current price'}`)
                    onClose()
                  } catch (e) {
                    console.error('Failed to add watchlist entry from chart:', e)
                    showErrorToast('Failed to set alert. Please try again.')
                  }
                }}
              >
                Set Alert
              </button>
            </div>

            <TradeExecutionModal
              isOpen={tradeOpen}
              onClose={() => setTradeOpen(false)}
              accountId={accountId}
              sessionId={sessionId}
              initialPayload={tradePayload}
            />
            <BrokerModal
              isOpen={brokerOpen}
              onClose={() => setBrokerOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
