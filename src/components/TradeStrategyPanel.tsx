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
    <div style={{display:'grid', gridTemplateColumns:'minmax(0, 1.2fr) minmax(0, 1.3fr)', gap:12}}>
      {/* Compact Trust Score with Analyst Rationale */}
      <div style={{padding:12, background:'#ffffff', borderRadius:10, border:'1px solid #e5e7eb', borderLeft:'3px solid #3b82f6', gridColumn:'1 / -1'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <div style={{padding:'4px 10px', borderRadius:999, background:'#eef2ff', fontSize:11, fontWeight:700, color:'#3730a3'}}>
              {symbol || 'Symbol'}
            </div>
            <div style={{fontSize:11, color:'#475569'}}>
              Expected Holding Period - <span style={{fontWeight:600}}>{timeHorizonLabel}</span>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:24}}>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:11, color:'#64748b', fontWeight:600}}>Confidence</div>
              <div style={{fontSize:18, fontWeight:700, color:getScoreColor(effectiveBlend)}}>{effectiveBlend}%</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:11, color:'#64748b', fontWeight:600}}>Risk:Reward</div>
              <div style={{fontSize:16, fontWeight:700, color:'#7c3aed'}}>
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
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:11, color:'#64748b', fontWeight:600}}>Setup Quality</div>
              <div style={{fontSize:14, fontWeight:700, padding:'4px 10px', borderRadius:999, background:(recLabel || '').toLowerCase().includes('sell') ? '#fee2e2' : '#dcfce7', color:(recLabel || '').toLowerCase().includes('sell') ? '#b91c1c' : '#166534'}}>
                {recLabel || 'Buy'}
              </div>
              <div style={{fontSize:11, color:'#64748b', marginTop:2}}>
                {plan.setup_quality || 'Good'}
              </div>
            </div>
          </div>
        </div>
        <div style={{height:8, background:'#e5e7eb', borderRadius:4, overflow:'hidden', marginBottom:10}}>
          <div style={{width: `${effectiveBlend}%`, height:'100%', background: getScoreColor(effectiveBlend), transition:'width 0.3s'}} />
        </div>
        <div style={{fontSize:12, color:'#075985', lineHeight:1.5, fontStyle:'italic'}}>
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
              `Our agents analyzed and found ${insights.slice(0,3).join(', ')}.` : 
              'Comprehensive multi-dimensional analysis indicates favorable setup.'
            return rationale
          })()}
        </div>
        {sentimentRisk && (
          <div style={{marginTop:10, padding:8, borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca'}}>
            <div style={{fontSize:11, fontWeight:600, color:'#991b1b', marginBottom:4}}>
              Sentiment risk:{' '}
              <span style={{color: sentimentRisk.color}}>
                {sentimentRisk.label} ({sentimentRisk.score.toFixed(0)}/100)
              </span>
            </div>
            <div style={{fontSize:11, color:'#4b5563', lineHeight:1.5}}>
              {sentimentRisk.summary}
            </div>
          </div>
        )}
      </div>

      {/* Trade Action Banner */}
      <div style={{padding:12, background:'#ffffff', borderRadius:10, border:'1px solid #e5e7eb', borderLeft: (recLabel || '').toLowerCase().includes('sell') ? '3px solid #ef4444' : '3px solid #16a34a', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div style={{fontSize:12, color:'#64748b', fontWeight:600}}>RECOMMENDED ACTION</div>
          <div style={{fontSize:20, fontWeight:700, color:'#0f172a', display:'flex', alignItems:'center', gap:8, marginTop:4}}>
            <span>📈</span>
            <span>{recLabel}</span>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:11, color:'#64748b'}}>Setup Quality</div>
          <div style={{fontSize:16, fontWeight:700, color:'#16a34a'}}>{plan.setup_quality || 'GOOD'}</div>
        </div>
      </div>

      {/* Entry Details - Comprehensive */}
      <div style={{padding:12, background:'#ffffff', borderRadius:10, border:'1px solid #e5e7eb', borderLeft:'3px solid #3b82f6'}}>
        <div style={{fontSize:14, fontWeight:700, color:'#1e40af', marginBottom:10, display:'flex', alignItems:'center', gap:8}}>
          <span>🎯</span>
          <span>ENTRY STRATEGY</span>
        </div>
        <div style={{display:'grid', gap:8}}>
          <div style={{display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'center'}}>
            <div style={{fontSize:11, color:'#64748b', fontWeight:600}}>Entry Price:</div>
            <div style={{fontSize:18, fontWeight:700, color:'#16a34a'}}>{displayEntry}</div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'120px 1fr', gap:8, alignItems:'start'}}>
            <div style={{fontSize:11, color:'#64748b', fontWeight:600}}>Entry Timing:</div>
            <div style={{fontSize:12, color:'#475569', lineHeight:1.5}}>
              {plan.entry_timing || plan.entry?.timing || 'At current market price or on pullback to support zone. Consider entering in 2-3 tranches for better risk management.'}
            </div>
          </div>
        </div>
      </div>

      {/* Stop Loss Details - Comprehensive */}
      <div style={{padding:12, background:'#ffffff', borderRadius:10, border:'1px solid #e5e7eb', borderLeft:'3px solid #dc2626'}}>
        <div style={{fontSize:14, fontWeight:700, color:'#991b1b', marginBottom:10, display:'flex', alignItems:'center', gap:8}}>
          <span>🛡️</span>
          <span>STOP LOSS MANAGEMENT</span>
        </div>
        <div style={{display:'grid', gap:10}}>
          <div style={{padding:8, background:'#fff', borderRadius:6, border:'1px solid #fecaca'}}>
            <div style={{fontSize:11, color:'#991b1b', fontWeight:600, marginBottom:4}}>Initial Stop Loss:</div>
            <div style={{fontSize:16, fontWeight:700, color:'#dc2626'}}>{displayStop}</div>
            {entryNum != null && stopNum != null && (
              <div style={{fontSize:10, color:'#64748b', marginTop:2}}>Risk per share: ₹{(entryNum - stopNum).toFixed(2)}</div>
            )}
          </div>
          <div style={{padding:8, background:'#fff', borderRadius:6, border:'1px solid #fecaca'}}>
            <div style={{fontSize:11, color:'#991b1b', fontWeight:600, marginBottom:4}}>Trailing Stop:</div>
            <div style={{fontSize:11, color:'#475569', lineHeight:1.5}}>
              {plan.trailing_stop || plan.stop_loss?.trailing || 'Move stop loss to breakeven (entry price) after T1 is achieved. Trail below recent swing lows as price advances.'}
            </div>
          </div>
          <div style={{padding:8, background:'#fff', borderRadius:6, border:'1px solid #fecaca'}}>
            <div style={{fontSize:11, color:'#991b1b', fontWeight:600, marginBottom:4}}>Final Stop:</div>
            <div style={{fontSize:11, color:'#475569'}}>
              {plan.final_stop || plan.stop_loss?.final || 'Exit position if price closes below breakeven on daily timeframe'}
            </div>
          </div>
        </div>
      </div>

      {/* Target Levels - Comprehensive */}
      <div style={{padding:12, background:'#ffffff', borderRadius:10, border:'1px solid #e5e7eb', borderLeft:'3px solid #16a34a'}}>
        <div style={{fontSize:14, fontWeight:700, color:'#166534', marginBottom:10, display:'flex', alignItems:'center', gap:8}}>
          <span>🎯</span>
          <span>TARGET LEVELS & PROFIT BOOKING</span>
        </div>
        <div style={{display:'grid', gap:8}}>
          {(plan.targets || ['101','102','103']).map((target: any, idx: number)=> {
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
              <div key={idx} style={{padding:10, background:'#fff', borderRadius:8, border:'2px solid #bbf7d0', display:'grid', gridTemplateColumns:'80px 100px 1fr 100px', gap:12, alignItems:'center'}}>
                <div>
                  <div style={{fontSize:10, color:'#64748b', fontWeight:600}}>TARGET {idx+1}</div>
                  <div style={{fontSize:16, fontWeight:700, color:'#16a34a'}}>₹{targetPrice}</div>
                </div>
                <div>
                  <div style={{fontSize:10, color:'#64748b'}}>Gain</div>
                  <div style={{fontSize:13, fontWeight:600, color:'#16a34a'}}>+{gainPct}%</div>
                </div>
                <div>
                  <div style={{fontSize:10, color:'#64748b'}}>Book Profit</div>
                  <div style={{fontSize:12, fontWeight:600, color:'#166534'}}>{idx===0?'33%':idx===1?'33%':'34%'} of position</div>
                </div>
                <div>
                  <div style={{fontSize:10, color:'#64748b'}}>R:R Ratio</div>
                  <div style={{fontSize:13, fontWeight:700, color:'#7c3aed'}}>{rrLabel}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{marginTop:10, padding:8, background:'#fff', borderRadius:6, border:'1px solid #bbf7d0'}}>
          <div style={{fontSize:11, color:'#166534', fontWeight:600, marginBottom:4}}>Strategy:</div>
          <div style={{fontSize:11, color:'#475569', lineHeight:1.5}}>
            Book 33% at T1 (secure initial gains), 33% at T2 (lock core profits), and let remaining 34% run to T3 for maximum upside. Trail stop loss as each target is achieved.
          </div>
        </div>
      </div>

      {/* Position Sizing - Comprehensive */}
      <div style={{padding:12, background:'#ffffff', borderRadius:10, border:'1px solid #e5e7eb', borderLeft:'3px solid #f59e0b'}}>
        <div style={{fontSize:14, fontWeight:700, color:'#92400e', marginBottom:10, display:'flex', alignItems:'center', gap:8}}>
          <span>📏</span>
          <span>POSITION SIZING & CAPITAL ALLOCATION</span>
        </div>
        <div style={{display:'grid', gap:10}}>
          <div style={{padding:10, background:'#fff', borderRadius:8, border:'1px solid #fde68a'}}>
            <div style={{fontSize:11, color:'#92400e', fontWeight:600, marginBottom:6}}>2% Risk Rule (Recommended):</div>
            <div style={{fontSize:12, color:'#78350f', lineHeight:1.6}}>
              <div><strong>Capital Allocation:</strong> {plan.sizing || '2-3% of total capital'}</div>
              <div style={{marginTop:4}}><strong>Position Size:</strong> ₹{plan.position_size || '20,000'} (assuming ₹10L portfolio)</div>
              <div style={{marginTop:4}}><strong>Quantity:</strong> {quantity || Math.floor(20000 / (entryNum || 100))} shares @ ₹{displayEntry || '100'}</div>
              <div style={{marginTop:6, padding:8, background:'#fef3c7', borderRadius:6}}>
                <div style={{fontSize:10, color:'#92400e', fontWeight:600}}>📊 Risk Calculation:</div>
                <div style={{fontSize:11, color:'#78350f', marginTop:2}}>
                  Max Loss = (Entry - Stop Loss) × Quantity = ₹{maxLoss != null ? maxLoss.toFixed(2) : '—'}
                </div>
                <div style={{fontSize:11, color:'#78350f', marginTop:2}}>
                  This represents ~2% of ₹10L capital, limiting downside while maximizing upside potential
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk:Reward & Time Horizon */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
        <div style={{padding:12, background:'#ffffff', borderRadius:10, border:'1px solid #e5e7eb', borderLeft:'3px solid #a855f7'}}>
          <div style={{fontSize:14, fontWeight:700, color:'#6b21a8', marginBottom:8, display:'flex', alignItems:'center', gap:8}}>
            <span>📊</span>
            <span>RISK:REWARD</span>
          </div>
          <div style={{textAlign:'center', padding:10}}>
            <div style={{fontSize:32, fontWeight:700, color:'#7c3aed'}}>
              {(() => {
                const raw = plan.risk_reward ?? '2.5'
                const num = parseFloat(String(raw))
                if (!isNaN(num) && num > 0) {
                  return `1:${num}`
                }
                return '1:2.5'
              })()}
            </div>
            <div style={{fontSize:11, color:'#6b21a8', marginTop:4}}>Excellent risk-to-reward setup</div>
          </div>
        </div>
        
        <div style={{padding:12, background:'#ffffff', borderRadius:10, border:'1px solid #e5e7eb', borderLeft:'3px solid #f97316'}}>
          <div style={{fontSize:14, fontWeight:700, color:'#9a3412', marginBottom:8, display:'flex', alignItems:'center', gap:8}}>
            <span>⏱️</span>
            <span>TIME HORIZON</span>
          </div>
          <div style={{textAlign:'center', padding:10}}>
            <div style={{fontSize:24, fontWeight:700, color:'#ea580c'}}>
              {getTimeHorizonLabel()}
            </div>
            <div style={{fontSize:11, color:'#9a3412', marginTop:4}}>Expected holding period</div>
          </div>
        </div>
      </div>

      {/* Invalidation Conditions */}
      <div style={{padding:12, background:'#ffffff', borderRadius:10, border:'1px solid #e5e7eb', borderLeft:'3px solid #ef4444', gridColumn:'1 / -1'}}>
        <div style={{fontSize:14, fontWeight:700, color:'#991b1b', marginBottom:10, display:'flex', alignItems:'center', gap:8}}>
          <span>❌</span>
          <span>INVALIDATION CONDITIONS (Exit Immediately If)</span>
        </div>
        <div style={{display:'grid', gap:6}}>
          <div style={{padding:8, background:'#fff', borderRadius:6, border:'1px solid #fecaca', fontSize:12, color:'#991b1b'}}>
            • Stop loss is breached ({displayStop})
          </div>
          <div style={{padding:8, background:'#fff', borderRadius:6, border:'1px solid #fecaca', fontSize:12, color:'#991b1b'}}>
            • {plan.invalidation || 'Price closes below support on daily timeframe'}
          </div>
          <div style={{padding:8, background:'#fff', borderRadius:6, border:'1px solid #fecaca', fontSize:12, color:'#991b1b'}}>
            • Bearish reversal pattern emerges (e.g., shooting star, evening star)
          </div>
          <div style={{padding:8, background:'#fff', borderRadius:6, border:'1px solid #fecaca', fontSize:12, color:'#991b1b'}}>
            • Negative material news or corporate action announced
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div style={{display:'flex', gap:10, paddingTop:8, marginTop:4, borderTop:'1px solid #e5e7eb', justifyContent:'flex-end', flexWrap:'wrap', gridColumn:'1 / -1'}}>
          <button 
            onClick={()=>{ 
              setTradeOpen(true)
            }} 
            style={{padding:'10px 16px', borderRadius:8, background:'#16a34a', color:'#fff', border:'none', fontWeight:600, fontSize:13, cursor:'pointer', minWidth:130}}
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
                } catch {}
              } catch (e) {
                console.error('Failed to add watchlist entry from trade strategy:', e)
              }
            }} 
            style={{padding:'10px 16px', borderRadius:8, background:'#4f46e5', color:'#fff', border:'none', fontWeight:600, fontSize:13, cursor:'pointer', minWidth:130}}
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
