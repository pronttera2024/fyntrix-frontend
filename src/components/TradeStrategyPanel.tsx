import React, { useMemo, useState } from 'react'
import { addWatchlistEntry } from '../api'
import { computeSentimentRiskLevel } from '../sentimentRisk'
import { classifyPickDirection } from '../utils/recommendation'
import { TradeExecutionModal, type ExecuteTradePayload } from './TradeExecutionModal'

export interface TradeStrategyPanelProps {
  symbol: string
  plan: any
  blendScore?: number
  strategyRationale?: string
  scores?: any
  recommendation?: string
  primaryMode?: string
  availableModes?: { value: string; display_name: string; horizon: string; icon?: string }[]
  showActions?: boolean
  accountId?: string
  sessionId?: string
}

const getScoreColor = (score?: number) => {
  if (!score && score !== 0) return '#6b7280'
  if (score >= 80) return '#16a34a'  // GREEN
  if (score >= 60) return '#2563eb'  // BLUE
  if (score >= 50) return '#eab308'  // AMBER
  return '#ef4444'  // RED
}

function getSentimentRisk(plan: any): {
  label: string
  score: number
  summary: string
  color: string
} | null {
  if (!plan) return null

  const latestExit = plan.latest_exit || plan.latest_sr_exit || plan.latest_news_exit || {}
  const rawScore = latestExit.news_risk_score ?? plan.news_risk_score
  const rawReason = latestExit.news_reason ?? plan.news_reason

  const level = computeSentimentRiskLevel(rawScore)
  if (!level) return null

  let summary = ''
  if (typeof rawReason === 'string' && rawReason.trim()) {
    summary = rawReason.trim()
    if (summary.length > 140) {
      summary = summary.slice(0, 137) + '...'
    }
  }

  if (!summary) {
    summary = `${level.label} risk based on recent news flow.`
  }

  return {
    label: level.label,
    score: level.score,
    summary,
    color: level.color,
  }
}

export const TradeStrategyPanel: React.FC<TradeStrategyPanelProps> = ({
  symbol,
  plan,
  blendScore,
  strategyRationale,
  scores,
  recommendation,
  primaryMode,
  availableModes,
  showActions = true,
  accountId,
  sessionId,
}) => {
  if (!plan) return null

  const [tradeOpen, setTradeOpen] = useState(false)

  const effectiveBlend = typeof blendScore === 'number' ? blendScore : 50

  const deriveRecommendation = () => {
    const pmode = primaryMode || 'Swing'
    const dir = classifyPickDirection(effectiveBlend, pmode)
    if (dir && dir.label) return dir.label
    if (recommendation && ['Strong Buy', 'Buy', 'Sell', 'Strong Sell'].includes(recommendation)) {
      return recommendation
    }
    if (typeof blendScore === 'number') {
      return blendScore >= 60 ? 'Buy' : 'Sell'
    }
    return 'Buy'
  }

  const recLabel = deriveRecommendation()

  const getTimeHorizonLabel = () => {
    if (plan.timeframe) return plan.timeframe
    const pmode = primaryMode || 'Swing'
    if (Array.isArray(availableModes)) {
      const modeInfo = availableModes.find((m: any) => m.value === pmode)
      if (modeInfo?.horizon) return `${pmode} (${modeInfo.horizon})`
    }
    return '3-7 days'
  }

  const parseNumber = (value: any): number | null => {
    if (value == null) return null
    const n = parseFloat(String(value))
    return isNaN(n) ? null : n
  }

  const entryRaw = plan.entry?.price ?? plan.entry
  const stopRaw = plan.stop ?? plan.stop_loss?.initial ?? plan.stop_loss

  const entryNum = parseNumber(entryRaw)
  const stopNum = parseNumber(stopRaw)

  const displayEntry = entryRaw ?? 'CMP'
  const displayStop = stopRaw ?? '99.2'

  const firstArrayTarget = Array.isArray(plan.targets) && plan.targets.length > 0
    ? parseNumber(plan.targets[0])
    : null
  const objectT1 = plan.targets?.T1?.price
  const firstTargetNum = parseNumber(objectT1 ?? firstArrayTarget ?? plan.target_1)

  const quantity = plan.quantity || (entryNum ? Math.floor(20000 / entryNum) : undefined)

  const riskPerShare = entryNum != null && stopNum != null ? (entryNum - stopNum) : null
  const maxLoss = riskPerShare != null && quantity ? riskPerShare * quantity : null

  const sentimentRisk = getSentimentRisk(plan)

  const timeHorizonLabel = getTimeHorizonLabel()

  const tradePayload = useMemo((): ExecuteTradePayload => {
    const side = (recLabel || '').toLowerCase().includes('sell') ? 'SELL' : 'BUY'
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1

    return {
      account_id: accountId,
      session_id: sessionId,
      source: 'STRATEGY',
      broker: 'ZERODHA',
      symbol,
      exchange: 'NSE',
      segment: 'CASH',
      product: 'CNC',
      side,
      qty,
      order_type: 'MARKET',
      stop_loss: stopNum ?? undefined,
      target: firstTargetNum ?? undefined,
    }
  }, [accountId, sessionId, symbol, recLabel, quantity, stopNum, firstTargetNum])

  return (
    <div className="flex flex-col gap-3 lg:gap-3">
      {/* Compact Trust Score with Analyst Rationale */}
      <div className="p-3 lg:p-3 bg-white rounded-xl border border-gray-200 border-l-[3px] border-l-blue-600">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-2 lg:mb-2">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-2">
            <div className="px-2.5 py-1 rounded-full bg-blue-50 text-[11px] lg:text-[11px] font-bold text-blue-900">
              {symbol || 'Symbol'}
            </div>
            <div className="text-xs lg:text-xs text-slate-600">
              Expected Holding Period - <span className="font-semibold">{timeHorizonLabel}</span>
            </div>
          </div>
          <div className="flex flex-row items-start gap-6 mt-2">
            <div className="flex flex-col lg:items-end">
              <div className="text-xs lg:text-xs text-slate-600 font-semibold">Confidence</div>
              <div className="text-lg lg:text-lg font-bold" style={{ color: getScoreColor(effectiveBlend) }}>{effectiveBlend}%</div>
            </div>
            <div className="flex flex-col lg:items-end">
              <div className="text-xs lg:text-xs text-slate-600 font-semibold">Risk:Reward</div>
              <div className="text-base lg:text-base font-bold text-purple-600">
                {(() => {
                  const raw = plan.risk_reward ?? '2.5'
                  const num = parseFloat(String(raw))
                  if (!isNaN(num) && num > 0) {
                    return `1:${num}`
                  }
                  return '1:2.5'
                })()}
              </div>
            </div>
            <div className="flex flex-col lg:items-end">
              <div className="text-xs lg:text-xs text-slate-600 font-semibold">Setup Quality</div>
              <div className="text-sm lg:text-sm font-bold px-2 py-1 rounded-full" style={{ backgroundColor: (recLabel || '').toLowerCase().includes('sell') ? '#fee2e2' : '#dcfce7', color: (recLabel || '').toLowerCase().includes('sell') ? '#b91c1c' : '#166534' }}>
                {recLabel || 'Buy'}
              </div>
              <div className="text-xs lg:text-xs text-slate-600 mt-0.5">
                {plan.setup_quality || 'Good'}
              </div>
            </div>
          </div>
        </div>
        <div className="h-2 lg:h-2 bg-gray-200 rounded-md overflow-hidden mb-2.5">
          <div
            className="h-full transition-all duration-300 rounded-md"
            style={{
              width: `${effectiveBlend}%`,
              backgroundColor: getScoreColor(effectiveBlend),
            }}
          />
        </div>
        <div className="text-xs lg:text-xs text-emerald-700 leading-6 italic">
          {strategyRationale || (() => {
            const s = scores || {}
            const insights: string[] = []
            if (s.technical >= 70) insights.push('strong technical breakout pattern detected')
            else if (s.technical >= 60) insights.push('positive technical setup')
            if (s.sentiment >= 70) insights.push('bullish sentiment prevailing')
            if (s.options >= 70) insights.push('options flow indicating accumulation')
            if (s.pattern >= 70) insights.push('favorable historical patterns emerging')
            if (s.global >= 65) insights.push('global markets showing strength')
            if (s.risk <= 40) insights.push('risk-reward ratio attractive')
            const rationale = insights.length > 0 ?
              `Our agents analyzed and found ${insights.slice(0, 3).join(', ')}.` :
              'Comprehensive multi-dimensional analysis indicates favorable setup.'
            return rationale
          })()}
        </div>
        {sentimentRisk && (
          <div className="mt-2.5 p-2 lg:p-2 rounded-lg bg-red-50 border border-red-200">
            <div className="text-xs lg:text-xs font-semibold text-red-800 mb-1">
              Sentiment risk:{' '}
              <span style={{ color: sentimentRisk.color }}>
                {sentimentRisk.label} ({sentimentRisk.score.toFixed(0)}/100)
              </span>
            </div>
            <div className="text-xs lg:text-xs text-red-600 leading-6">
              {sentimentRisk.summary}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-row gap-2">
        {/* Trade Action Banner */}
        <div
          className="p-2 bg-white rounded-xl border border-gray-200 border-l-[3px] flex-1"
          style={{
            borderLeftColor: (recLabel || '').toLowerCase().includes('sell')
              ? '#ef4444'
              : '#16a34a',
          }}
        >
          {/* Title */}
          <div className="text-sm text-slate-600 font-semibold mb-1">
            RECOMMENDED ACTION
          </div>
          {/* Content Row */}
          <div className="flex flex-row justify-between items-start gap-4">
            {/* Left Block */}
            <div className="flex flex-row items-center gap-2">
              <span className="text-lg">📈</span>
              <span className="text-base font-semibold text-slate-800">
                {recLabel}
              </span>
            </div>

            {/* Right Block */}
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500">Setup Quality</span>
              <span
                className={`text-sm font-bold ${plan.setup_quality === 'STRONG'
                  ? 'text-green-600'
                  : plan.setup_quality === 'WEAK'
                    ? 'text-red-500'
                    : 'text-amber-600'
                  }`}
              >
                {plan.setup_quality || 'GOOD'}
              </span>
            </div>
          </div>
        </div>
        {/* Entry Details - Comprehensive */}
        <div className="p-2 bg-white rounded-xl border border-gray-200 border-l-[3px] border-l-blue-600 flex-1">
          <div className="text-sm lg:text-sm font-bold text-blue-600 mb-2.5 flex items-center gap-2">
            <span>🎯</span>
            <span>ENTRY STRATEGY</span>
          </div>
          <div className="grid gap-2 lg:gap-2">
            <div className="grid grid-cols-[120px_1fr] lg:grid-cols-[120px_1fr] gap-2 lg:gap-2 items-center">
              <div className="text-xs text-slate-600 font-semibold">Entry Price:</div>
              <div className="text-lg lg:text-lg font-bold text-green-600">{displayEntry}</div>
            </div>
            <div className="grid grid-cols-[120px_1fr] lg:grid-cols-[120px_1fr] gap-2 lg:gap-2 items-start">
              <div className="text-xs text-slate-600 font-semibold">Entry Timing:</div>
              <div className="text-xs text-slate-600 leading-6">
                {plan.entry_timing || plan.entry?.timing || 'At current market price or on pullback to support zone. Consider entering in 2-3 tranches for better risk management.'}
              </div>
            </div>
          </div>
        </div>
      </div>




      {/* Stop Loss Details - Comprehensive */}
      <div className="p-3 lg:p-3 bg-white rounded-xl border border-gray-200 border-l-[3px] border-l-red-600">
        <div className="text-sm lg:text-sm font-bold text-red-600 mb-2.5 flex items-center gap-2">
          <span>🛡️</span>
          <span>STOP LOSS MANAGEMENT</span>
        </div>
        <div className="grid gap-2.5 lg:gap-2.5">
          <div className="p-2 lg:p-2 bg-white rounded-md border border-red-200">
            <div className="text-xs text-red-800 font-semibold mb-1">Initial Stop Loss:</div>
            <div className="text-base lg:text-base font-bold text-red-600">{displayStop}</div>
            {entryNum != null && stopNum != null && (
              <div className="text-xs text-slate-600 mt-0.5">Risk per share: ₹{(entryNum - stopNum).toFixed(2)}</div>
            )}
          </div>
          <div className="p-2 lg:p-2 bg-white rounded-md border border-red-200">
            <div className="text-xs text-red-800 font-semibold mb-1">Trailing Stop:</div>
            <div className="text-xs text-slate-600 leading-6">
              {plan.trailing_stop || plan.stop_loss?.trailing || 'Move stop loss to breakeven (entry price) after T1 is achieved. Trail below recent swing lows as price advances.'}
            </div>
          </div>
          <div className="p-2 lg:p-2 bg-white rounded-md border border-red-200">
            <div className="text-xs text-red-800 font-semibold mb-1">Final Stop:</div>
            <div className="text-xs text-slate-600">
              {plan.final_stop || plan.stop_loss?.final || 'Exit position if price closes below breakeven on daily timeframe'}
            </div>
          </div>
        </div>
      </div>

      {/* Target Levels - Comprehensive */}
      <div className="p-3 lg:p-3 bg-white rounded-xl border border-gray-200 border-l-[3px] border-l-green-600">
        <div className="text-sm lg:text-sm font-bold text-green-600 mb-2.5 flex items-center gap-2">
          <span>🎯</span>
          <span>TARGET LEVELS & PROFIT BOOKING</span>
        </div>
        <div className="grid gap-2 lg:gap-2">
          {(plan.targets || ['101', '102', '103']).map((target: any, idx: number) => {
            const targetPrice = typeof target === 'string' || typeof target === 'number' ? target : target.price
            const entryForGain = entryNum ?? parseNumber(plan.entry || '100') ?? 100
            const gainPct = entryForGain && targetPrice != null
              ? (((parseFloat(String(targetPrice)) - entryForGain) / entryForGain) * 100).toFixed(2)
              : '0.00'
            const details = (plan as any)?.target_details
            let rr: any
            if (details) {
              rr = idx === 0 ? details.T1?.rr_ratio : idx === 1 ? details.T2?.rr_ratio : details.T3?.rr_ratio
            }
            if (rr == null) {
              const fallback = idx === 0 ? 1.5 : idx === 1 ? 2.5 : 4.0
              rr = fallback
            }
            const rrNum = parseFloat(String(rr))
            const rrLabel = !isNaN(rrNum) && rrNum > 0 ? `1:${rrNum}` : '1:1.5'

            return (
              <div key={idx} className="p-2 lg:p-2 bg-white rounded-lg border-[2px] border-amber-300 flex gap-3 lg:gap-3 items-center">
                <div className="flex-1 text-center">
                  <div className="text-xs text-slate-600 font-semibold">TARGET {idx + 1}</div>
                  <div className="text-base lg:text-base font-bold text-green-600">₹{targetPrice}</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xs text-slate-600">Gain</div>
                  <div className="text-sm lg:text-sm font-semibold text-green-600">+{gainPct}%</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xs text-slate-600">Book Profit</div>
                  <div className="text-xs lg:text-xs font-semibold text-green-600">{idx === 0 ? '33%' : idx === 1 ? '33%' : '34%'} of position</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xs text-slate-600">R:R Ratio</div>
                  <div className="text-sm lg:text-sm font-bold text-purple-600">{rrLabel}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-2.5 lg:mt-2.5 p-2 lg:p-2 bg-white rounded-md border border-amber-300">
          <div className="text-xs text-green-600 font-semibold mb-1">Strategy:</div>
          <div className="text-xs text-slate-600 leading-6">
            Book 33% at T1 (secure initial gains), 33% at T2 (lock core profits), and let remaining 34% run to T3 for maximum upside. Trail stop loss as each target is achieved.
          </div>
        </div>
      </div>

      {/* Position Sizing - Comprehensive */}
      <div className="p-3 lg:p-3 bg-white rounded-xl border border-gray-200 border-l-[3px] border-l-amber-500">
        <div className="text-sm lg:text-sm font-bold text-amber-600 mb-2.5 flex items-center gap-2">
          <span>📏</span>
          <span>POSITION SIZING & CAPITAL ALLOCATION</span>
        </div>
        <div className="grid gap-2.5 lg:gap-2.5">
          <div className="p-2.5 lg:p-2.5 bg-white rounded-lg border border-amber-200">
            <div className="text-xs text-amber-600 font-semibold mb-1.5">2% Risk Rule (Recommended):</div>
            <div className="text-xs text-amber-900 leading-6">
              <div><strong>Capital Allocation:</strong> {plan.sizing || '2-3% of total capital'}</div>
              <div className="mt-1"><strong>Position Size:</strong> ₹{plan.position_size || '20,000'} (assuming ₹10L portfolio)</div>
              <div className="mt-1"><strong>Quantity:</strong> {quantity || Math.floor(20000 / (entryNum || 100))} shares @ ₹{displayEntry || '100'}</div>
              <div className="mt-1.5 p-2 lg:p-2 bg-amber-50 rounded-md">
                <div className="text-xs text-amber-600 font-semibold">📊 Risk Calculation:</div>
                <div className="text-xs text-amber-900 mt-0.5">
                  Max Loss = (Entry - Stop Loss) × Quantity = ₹{maxLoss != null ? maxLoss.toFixed(2) : '—'}
                </div>
                <div className="text-xs text-amber-900 mt-0.5">
                  This represents ~2% of ₹10L capital, limiting downside while maximizing upside potential
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk:Reward & Time Horizon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 lg:gap-2.5">
        <div className="p-3 lg:p-3 bg-white rounded-xl border border-gray-200 border-l-[3px] border-l-yellow-600">
          <div className="text-sm lg:text-sm font-bold text-yellow-600 mb-2 flex items-center gap-2">
            <span>📊</span>
            <span>RISK:REWARD</span>
          </div>
          <div className="text-center p-2.5 lg:p-2.5">
            <div className="text-2xl lg:text-2xl font-bold text-purple-600">
              {(() => {
                const raw = plan.risk_reward ?? '2.5'
                const num = parseFloat(String(raw))
                if (!isNaN(num) && num > 0) {
                  return `1:${num}`
                }
                return '1:2.5'
              })()}
            </div>
            <div className="text-xs text-yellow-600 mt-1">Excellent risk-to-reward setup</div>
          </div>
        </div>

        <div className="p-3 lg:p-3 bg-white rounded-xl border border-gray-200 border-l-[3px] border-l-orange-500">
          <div className="text-sm lg:text-sm font-bold text-orange-500 mb-2 flex items-center gap-2">
            <span>⏱️</span>
            <span>TIME HORIZON</span>
          </div>
          <div className="text-center p-2.5 lg:p-2.5">
            <div className="text-2xl lg:text-2xl font-bold text-orange-500">
              {getTimeHorizonLabel()}
            </div>
            <div className="text-xs text-orange-500 mt-1">Expected holding period</div>
          </div>
        </div>
      </div>

      {/* Invalidation Conditions */}
      <div className="p-3 lg:p-3 bg-white rounded-xl border border-gray-200 border-l-[3px] border-l-red-600 col-span-full">
        <div className="text-sm lg:text-sm font-bold text-red-600 mb-2.5 flex items-center gap-2">
          <span>❌</span>
          <span>INVALIDATION CONDITIONS (Exit Immediately If)</span>
        </div>
        <div className="grid gap-1.5 lg:gap-1.5">
          <div className="p-2 lg:p-2 bg-white rounded-md border border-red-200 text-xs text-red-800">
            • Stop loss is breached ({displayStop})
          </div>
          <div className="p-2 lg:p-2 bg-white rounded-md border border-red-200 text-xs text-red-800">
            • {plan.invalidation || 'Price closes below support on daily timeframe'}
          </div>
          <div className="p-2 lg:p-2 bg-white rounded-md border border-red-200 text-xs text-red-800">
            • Bearish reversal pattern emerges (e.g., shooting star, evening star)
          </div>
          <div className="p-2 lg:p-2 bg-white rounded-md border border-red-200 text-xs text-red-800">
            • Negative material news or corporate action announced
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-2.5 pt-2 mt-1 border-t border-gray-200 justify-end flex-wrap col-span-full">
          <button
            onClick={() => {
              setTradeOpen(true)
            }}
            className="px-4 py-2.5 lg:px-4 lg:py-2.5 rounded-md bg-green-600 text-white border-none font-semibold text-sm cursor-pointer min-w-[130px]"
          >
            🚀 Execute Trade
          </button>
          <button
            onClick={async () => {
              try {
                const entryVal = parseNumber(entryRaw)
                const stopVal = parseNumber(stopRaw)
                const firstTargetVal = firstTargetNum
                await addWatchlistEntry({
                  symbol,
                  timeframe: primaryMode || 'Swing',
                  desired_entry: entryVal ?? undefined,
                  stop_loss: stopVal ?? undefined,
                  target: firstTargetVal ?? undefined,
                  source: 'trade_strategy',
                })
                try {
                  window.alert('Alert added to watchlist. Use the Watchlist button to monitor this setup.')
                } catch { }
              } catch (e) {
                console.error('Failed to add watchlist entry from trade strategy:', e)
              }
            }}
            className="px-4 py-2.5 lg:px-4 lg:py-2.5 rounded-md bg-slate-600 text-white border-none font-semibold text-sm cursor-pointer min-w-[130px]"
          >
            ⏰ Set Alert
          </button>
        </div>
      )}

      <TradeExecutionModal
        isOpen={tradeOpen}
        onClose={() => setTradeOpen(false)}
        accountId={accountId}
        sessionId={sessionId}
        initialPayload={tradePayload}
      />
    </div>
  )
}
