import React from 'react'

interface MarketHeatMapProps {
  stocks: Array<{
    symbol: string
    score: number
    change?: number
    price?: number
    live?: boolean
  }>
  onStockClick?: (symbol: string) => void
  universe?: string
  modeLabel?: string
}

type HeatBand = 'strong-buy' | 'buy' | 'sell' | 'strong-sell' | 'neutral'

export const MarketHeatMap: React.FC<MarketHeatMapProps> = ({
  stocks,
  onStockClick,
  universe,
  modeLabel,
}) => {
  const mode = (modeLabel || '').toLowerCase()
  const isOptionsMode = mode === 'options'

  let strongBuyMin = 50 + 0.4 * 50 // 70
  let buyMin = 50 + 0.2 * 50 // 60
  let sellMax: number | null = 50 + -0.1 * 50 // 45
  let strongSellMax: number | null = 50 + -0.3 * 50 // 35
  let hasShorts = true

  if (mode === 'scalping') {
    strongBuyMin = 50 + 0.4 * 50 // 70
    buyMin = 50 + 0.2 * 50 // 60
    strongSellMax = 50 + -0.3 * 50 // 35
    sellMax = 50 + -0.1 * 50 // 45
  } else if (mode === 'intraday' || mode === 'futures' || mode === 'options') {
    strongBuyMin = 50 + 0.4 * 50 // 70
    buyMin = 50 + 0.2 * 50 // 60
    strongSellMax = 50 + -0.3 * 50 // 35
    sellMax = 50 + -0.1 * 50 // 45
  } else if (mode === 'swing') {
    strongBuyMin = 50 + 0.4 * 50 // 70
    buyMin = 50 + 0.2 * 50 // 60
    strongSellMax = null
    sellMax = null
    hasShorts = false
  } else {
    strongBuyMin = 50 + 0.4 * 50 // 70
    buyMin = 50 + 0.2 * 50 // 60
    strongSellMax = 50 + -0.3 * 50 // 35
    sellMax = 50 + -0.1 * 50 // 45
  }

  const strongBuyLabel = Math.round(strongBuyMin)
  const buyLabel = Math.round(buyMin)
  const sellLabel = sellMax != null ? Math.round(sellMax) : null
  const strongSellLabel = strongSellMax != null ? Math.round(strongSellMax) : null

  const getBand = (score: number): HeatBand => {
    if (score >= strongBuyMin) return 'strong-buy'
    if (score >= buyMin) return 'buy'
    if (hasShorts && strongSellMax != null && score <= strongSellMax) return 'strong-sell'
    if (hasShorts && sellMax != null && score <= sellMax) return 'sell'
    return 'neutral'
  }

  const getColors = (band: HeatBand) => {
    if (band === 'strong-buy') {
      return { bg: '#ecfdf5', text: '#166534', border: '#16a34a' }
    }
    if (band === 'buy') {
      return { bg: '#f0fdf4', text: '#15803d', border: '#22c55e' }
    }
    if (band === 'strong-sell') {
      return { bg: '#fef2f2', text: '#b91c1c', border: '#b91c1c' }
    }
    if (band === 'sell') {
      return { bg: '#fef2f2', text: '#b91c1c', border: '#ef4444' }
    }
    return { bg: '#eef2ff', text: '#1f2933', border: '#cbd5e1' }
  }

  const getBandLabel = (band: HeatBand) => {
    if (band === 'strong-buy') return 'Strong Buy'
    if (band === 'buy') return 'Buy'
    if (band === 'strong-sell') return isOptionsMode ? 'Strong Buy Put' : 'Strong Sell'
    if (band === 'sell') return isOptionsMode ? 'Buy Put' : 'Sell'
    return 'Neutral'
  }

  const sortedStocks = [...stocks].sort((a, b) => b.score - a.score)

  const universeLabel =
    universe === 'BANKNIFTY'
      ? 'Bank Nifty'
      : universe === 'NIFTY100'
      ? 'Nifty 100'
      : universe === 'NIFTY500'
      ? 'Nifty 500'
      : 'Nifty 50'

  const showShortLegend = hasShorts && sellLabel != null && strongSellLabel != null

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 12,
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2 }}>
            📊 Top Picks Map
            {modeLabel ? (
              <span style={{ fontSize: 12, fontStyle: 'italic', marginLeft: 4 }}>
                ({modeLabel})
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Visual score distribution • {stocks.length} stocks • {universeLabel}
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right' }}>
          <div>
            🚀 Strong Buy ≥{strongBuyLabel} • ✅ Buy ≥{buyLabel}
          </div>
          {showShortLegend ? (
            <div>
              {isOptionsMode ? '📉 Buy Put' : '📉 Sell'}
              {' '}≤{sellLabel} • {isOptionsMode ? '🛑 Strong Buy Put' : '🛑 Strong Sell'}
              {' '}≤{strongSellLabel}
            </div>
          ) : (
            <div>Long-only mode • no short/sell signals</div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10,
        }}
      >
        {sortedStocks.map((stock) => {
          const band = getBand(stock.score)
          const colors = getColors(band)
          const bandLabel = getBandLabel(band)

          return (
            <div
              key={stock.symbol}
              onClick={() => onStockClick?.(stock.symbol)}
              style={{
                background: '#ffffff',
                borderRadius: 10,
                padding: '10px 12px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
                boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                border: '1px solid #e5e7eb',
                borderLeft: `3px solid ${colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(15,23,42,0.15)'
                e.currentTarget.style.borderColor = '#0ea5e9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.06)'
                e.currentTarget.style.borderColor = '#e5e7eb'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: colors.text,
                    textTransform: 'uppercase',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: '14px',
                  }}
                >
                  {stock.symbol}
                </span>
                {band !== 'neutral' && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 999,
                      background: colors.bg,
                      color: colors.text,
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      lineHeight: '14px',
                    }}
                  >
                    {bandLabel}
                  </span>
                )}
              </div>

              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap: 8}}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 2,
                    color: band === 'strong-buy' || band === 'buy' ? '#166534' : band === 'neutral' ? '#111827' : '#b91c1c',
                  }}
                >
                  {stock.score.toFixed(1)}%
                </div>
                {typeof stock.price === 'number' && Number.isFinite(stock.price) && (
                  <span style={{display:'inline-flex', alignItems:'center', gap:6, whiteSpace:'nowrap'}}>
                    <span style={{fontSize:11, fontWeight:600, color:'#0f172a'}}>
                      ₹{stock.price.toFixed(2)}
                    </span>
                    {typeof stock.live === 'boolean' && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 999,
                          border: '1px solid ' + (stock.live ? '#86efac' : '#cbd5e1'),
                          background: stock.live ? '#dcfce7' : '#f1f5f9',
                          color: stock.live ? '#166534' : '#475569',
                        }}
                      >
                        {stock.live ? 'LIVE' : 'DELAYED'}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {typeof stock.change === 'number' && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: stock.change >= 0 ? '#16a34a' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: 4,
                    marginTop: 2,
                  }}
                >
                  <span>{stock.change >= 0 ? '▲' : '▼'}</span>
                  <span>{Math.abs(stock.change).toFixed(2)}%</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {stocks.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 40,
            color: '#94a3b8',
            fontSize: 14,
          }}
        >
          📊 No stocks to display
        </div>
      )}
    </div>
  )
}
