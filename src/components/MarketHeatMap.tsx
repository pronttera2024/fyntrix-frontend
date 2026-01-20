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
    <div className="bg-white rounded-xl p-2.5 border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
        <div>
          <div className="font-semibold text-base mb-0.5">
            📊 Top Picks Map
            {modeLabel ? (
              <span className="text-xs italic ml-1">
                ({modeLabel})
              </span>
            ) : null}
          </div>
          <div className="text-xs text-slate-500">
            Visual score distribution • {stocks.length} stocks • {universeLabel}
          </div>
        </div>
        <div className="text-xs text-slate-500 text-right">
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

      <div className="flex overflow-x-auto gap-2.5">
        {sortedStocks.map((stock) => {
          const band = getBand(stock.score)
          const colors = getColors(band)
          const bandLabel = getBandLabel(band)

          return (
            <div
              key={stock.symbol}
              onClick={() => onStockClick?.(stock.symbol)}
              className="bg-white min-w-[48%] md:min-w-[18%] rounded-lg p-1.5 mt-1 gap-4 cursor-pointer transition-all duration-200 shadow-sm border border-gray-200 border-l-[3px] flex flex-col hover:shadow-lg hover:border-sky-500"
              style={{ borderLeftColor: colors.border }}
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
              <div className="flex justify-between items-center gap-16">
                <span
                  className="text-sm font-bold uppercase truncate text-ellipsis whitespace-nowrap leading-[14px]"
                  style={{ color: colors.text }}
                >
                  {stock.symbol}
                </span>
                {band !== 'neutral' && (
                  <span
                    className="text-sm font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap inline-flex items-center leading-[14px]"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {bandLabel}
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center gap-1">
                <div
                  className="flex items-center gap-0.5 text-lg font-bold mb-0.5"
                  style={{ color: band === 'strong-buy' || band === 'buy' ? '#166534' : band === 'neutral' ? '#111827' : '#b91c1c' }}
                >
                  {stock.score.toFixed(1)}%
                  {typeof stock.change === 'number' && (
                        <div
                          className="text-xs font-semibold flex items-center justify-start gap-0.5 mt-0.5"
                          style={{ color: stock.change >= 0 ? '#16a34a' : '#ef4444' }}
                        >
                          <span>{stock.change >= 0 ? '▲' : '▼'}</span>
                          <span>{Math.abs(stock.change).toFixed(2)}%</span>
                        </div>
                      )}
                </div>
                {typeof stock.price === 'number' && Number.isFinite(stock.price) && (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <div className='flex flex-col'>
                      <span className="text-sm font-semibold text-slate-900">
                        ₹{stock.price.toFixed(2)}
                      </span>
                      {typeof stock.live === 'boolean' && (
                        <span
                          className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border text-green-600 bg-green-50"
                          style={{ borderColor: stock.live ? '#86efac' : '#cbd5e1', backgroundColor: stock.live ? '#dcfce7' : '#f1f5f9', color: stock.live ? '#166534' : '#475569' }}
                        >
                          {stock.live ? 'LIVE' : 'DELAYED'}
                        </span>
                      )}
                    </div>
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {stocks.length === 0 && (
        <div className="text-center py-10 text-slate-400 text-sm">
          📊 No stocks to display
        </div>
      )}
    </div>
  )
}
