export type PickDirection =
  | { side: 'long'; strength: 'strong' | 'normal'; label: 'Strong Buy' | 'Buy'; scoreNorm: number }
  | { side: 'short'; strength: 'strong' | 'normal'; label: 'Strong Sell' | 'Sell'; scoreNorm: number }

export type PickThresholds = {
  strongBuyMin: number
  buyMin: number
  sellMax: number | null
  strongSellMax: number | null
  hasShorts: boolean
}

export const getPickThresholds = (primaryMode: string): PickThresholds => {
  const mode = (primaryMode || '').toLowerCase()

  let strongBuyMin = 50 + 0.4 * 50 // 70
  let buyMin = 50 + 0.2 * 50 // 60
  let sellMax: number | null = 50 + -0.1 * 50 // 45
  let strongSellMax: number | null = 50 + -0.3 * 50 // 35
  let hasShorts = true

  if (mode === 'swing') {
    strongSellMax = null
    sellMax = null
    hasShorts = false
  }

  return {
    strongBuyMin,
    buyMin,
    sellMax,
    strongSellMax,
    hasShorts,
  }
}

export const classifyPickDirection = (scoreBlend: number | undefined, primaryMode: string): PickDirection | null => {
  const score = typeof scoreBlend === 'number' ? scoreBlend : 0
  const scoreNorm = (score - 50) / 50
  const mode = (primaryMode || '').toLowerCase()

  if (mode === 'scalping') {
    if (scoreNorm >= 0.4) return { side: 'long', strength: 'strong', label: 'Strong Buy', scoreNorm }
    if (scoreNorm >= 0.2) return { side: 'long', strength: 'normal', label: 'Buy', scoreNorm }
    if (scoreNorm <= -0.3) return { side: 'short', strength: 'strong', label: 'Strong Sell', scoreNorm }
    if (scoreNorm <= -0.1) return { side: 'short', strength: 'normal', label: 'Sell', scoreNorm }
    return null
  }

  if (mode === 'intraday' || mode === 'futures') {
    if (scoreNorm >= 0.4) return { side: 'long', strength: 'strong', label: 'Strong Buy', scoreNorm }
    if (scoreNorm >= 0.2) return { side: 'long', strength: 'normal', label: 'Buy', scoreNorm }
    if (scoreNorm <= -0.3) return { side: 'short', strength: 'strong', label: 'Strong Sell', scoreNorm }
    if (scoreNorm <= -0.1) return { side: 'short', strength: 'normal', label: 'Sell', scoreNorm }
    return null
  }

  if (mode === 'swing') {
    // Long-only behavior using the same positive thresholds as Intraday
    if (scoreNorm >= 0.4) return { side: 'long', strength: 'strong', label: 'Strong Buy', scoreNorm }
    if (scoreNorm >= 0.2) return { side: 'long', strength: 'normal', label: 'Buy', scoreNorm }
    return null
  }

  if (scoreNorm >= 0.4) return { side: 'long', strength: 'strong', label: 'Strong Buy', scoreNorm }
  if (scoreNorm >= 0.2) return { side: 'long', strength: 'normal', label: 'Buy', scoreNorm }
  if (scoreNorm <= -0.3) return { side: 'short', strength: 'strong', label: 'Strong Sell', scoreNorm }
  if (scoreNorm <= -0.1) return { side: 'short',strength: 'normal', label: 'Sell', scoreNorm }
  return null
}

export const isOptionPick = (row: any): boolean => {
  if (!row) return false
  const mode = String(row.mode || row.primary_mode || '').toLowerCase()
  if (mode === 'options') return true

  const instrumentType = String(row.instrument_type || row.instrument || row.product_type || '').toUpperCase()
  if (instrumentType.includes('OPT')) return true

  const optionType = String(row.option_type || row.optionType || '').toUpperCase()
  if (optionType === 'CE' || optionType === 'PE' || optionType === 'CALL' || optionType === 'PUT') return true

  const symbol = String(row.symbol || '').toUpperCase().trim()
  if (/(\b|_)(CE|PE)$/.test(symbol)) return true
  if (symbol.includes('CE') || symbol.includes('PE')) {
    // Heuristic: many option symbols contain CE/PE near the end.
    // Avoid false positives for equities by requiring digits too.
    if (/\d/.test(symbol) && (symbol.includes('CE') || symbol.includes('PE'))) return true
  }

  const strike = row.strike || row.strike_price || row.strikePrice
  const expiry = row.expiry || row.expiry_date || row.expiryDate
  if ((typeof strike === 'number' && Number.isFinite(strike)) || typeof expiry === 'string') {
    return true
  }

  return false
}

export const getOptionType = (row: any): 'CE' | 'PE' | null => {
  if (!row) return null
  const raw = String(row.option_type || row.optionType || '').toUpperCase()
  if (raw === 'CE' || raw === 'CALL') return 'CE'
  if (raw === 'PE' || raw === 'PUT') return 'PE'

  const symbol = String(row.symbol || '').toUpperCase().trim()
  if (/(\b|_)(CE)$/.test(symbol)) return 'CE'
  if (/(\b|_)(PE)$/.test(symbol)) return 'PE'
  if (/\d.*CE\b/.test(symbol) || /CE\d/.test(symbol)) return 'CE'
  if (/\d.*PE\b/.test(symbol) || /PE\d/.test(symbol)) return 'PE'
  return null
}

export const formatRecommendationLabel = (
  row: any,
  baseRecommendation: string,
  dir?: PickDirection | null,
): string => {
  const rec = String(baseRecommendation || '').trim()
  if (!rec) return ''

  // For options, keep the UI phrasing aligned with direction.
  if (isOptionPick(row)) {
    if (dir?.side === 'short') return 'Buy Put'
    if (dir?.side === 'long') return 'Buy Call'
    // If we can't infer direction, fall back to a generic label.
    return rec
  }

  return rec
}
