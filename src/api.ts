import { reportError } from './utils/errorReporting'

// API Base URL from environment variable or inferred backend (for IDE preview proxy).
const API_BASE_URL = (() => {
  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined
  if (envBase) return envBase

  try {
    if (!import.meta.env.PROD && typeof window !== 'undefined') {
      // When running inside IDE browser preview, the origin can be a proxy port
      // (not the Vite dev server). In that case, route API calls directly to
      // the backend.
      //
      // On normal Vite dev (commonly :5173) we prefer same-origin /v1 so that
      // Vite's proxy can handle backend routing without CORS.
      const p = window.location.port
      const isViteDevPort = p === '5173' || p === '5174' || p === '5175' || p === '3000'
      if (p && !isViteDevPort && p !== '8000') {
        return `${window.location.protocol}//${window.location.hostname}:8000`
      }
    }
  } catch {}

  return ''
})()

export async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  // Prepend API_BASE_URL if input is a string starting with /v1
  const url = typeof input === 'string' && input.startsWith('/v1') 
    ? `${API_BASE_URL}${input}` 
    : input
  
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
  if (!res.ok) {
    let bodyText = ''
    try {
      bodyText = await res.text()
    } catch {}

    reportError(new Error(`${res.status} ${res.statusText}`), {
      feature: 'api',
      action: 'fetch',
      url: typeof url === 'string' ? url : undefined,
      extra: {
        status: res.status,
        statusText: res.statusText,
        method: (init as any)?.method || 'GET',
        body: bodyText ? bodyText.slice(0, 2000) : '',
      },
    })
    throw new Error(`${res.status} ${res.statusText}`)
  }

  try {
    return (await res.json()) as T
  } catch (e) {
    reportError(e, {
      feature: 'api',
      action: 'parse_json',
      url: typeof url === 'string' ? url : undefined,
      extra: {
        method: (init as any)?.method || 'GET',
      },
    })
    throw e
  }
}

export function getMarketSummary(region?: string){
  const p = new URLSearchParams()
  if (region) p.set('region', region)
  const qs = p.toString()
  return json<any>(`/v1/market/summary${qs?`?${qs}`:''}`)
}
export function getFlows(){
  return json<any>('/v1/flows')
}
export function postAgentTopPicks(body:{symbols:string[], timeframe:string, horizon:number}){
  return json<any>('/v1/agents/top-picks', { method:'POST', body: JSON.stringify(body) })
}
export function postStrategySimulate(body:{strategy:string, symbol:string, timeframe:string, params:any}){
  return json<any>('/v1/strategy/simulate', { method:'POST', body: JSON.stringify(body) })
}

export function getNews(params?: { category?: string; limit?: number; symbol?: string }){
  const p = new URLSearchParams()
  if (params?.category) p.set('category', params.category)
  if (typeof params?.limit === 'number') p.set('limit', String(params.limit))
  if (params?.symbol) p.set('symbol', params.symbol)
  const qs = p.toString()
  return json<any>(`/v1/news${qs?`?${qs}`:''}`)
}

export function getMiniSeries(symbols: string, points = 20, region?: string){
  const p = new URLSearchParams({ symbols, points: String(points) })
  if (region) p.set('region', region)
  return json<any>(`/v1/mini/series?${p.toString()}`)
}

export function postChat(body: { session_id: string; conversation_id?: string; message: string; context?: any }){
  return json<any>('/v1/chat', { method: 'POST', body: JSON.stringify(body) })
}

export function postSupportChat(body: { session_id: string; conversation_id?: string; message: string; account_id?: string; user_name?: string; context?: any }){
  return json<any>('/v1/support/chat', { method: 'POST', body: JSON.stringify(body) })
}

export function postSupportTicket(body: { conversation_id: string; session_id?: string; account_id?: string; user_name?: string; summary: string; details: string; category?: string; severity?: string }){
  return json<any>('/v1/support/tickets', { method: 'POST', body: JSON.stringify(body) })
}

export function postSupportFeedback(body: { conversation_id: string; session_id?: string; account_id?: string; user_name?: string; rating: 1 | -1 }){
  return json<any>('/v1/support/feedback', { method: 'POST', body: JSON.stringify(body) })
}

export function getSupportConversation(params: { conversation_id: string; session_id?: string; account_id?: string; limit?: number }){
  const p = new URLSearchParams()
  p.set('conversation_id', params.conversation_id)
  if (params.session_id) p.set('session_id', params.session_id)
  if (params.account_id) p.set('account_id', params.account_id)
  if (typeof params.limit === 'number') p.set('limit', String(params.limit))
  return json<any>(`/v1/support/conversations?${p.toString()}`)
}

export function getAgentsPicks(params?: { limit?: number; universe?: string; session_id?: string; refresh?: boolean; primary_mode?: string }){
  const p = new URLSearchParams()
  if (typeof params?.limit === 'number') p.set('limit', String(params.limit))
  if (params?.universe) p.set('universe', params.universe)
  if (params?.session_id) p.set('session_id', params.session_id)
  if (params?.refresh) p.set('refresh', 'true')
  if (params?.primary_mode) p.set('primary_mode', params.primary_mode)
  const qs = p.toString()
  return json<any>(`/v1/agents/picks${qs?`?${qs}`:''}`)
}

export function postStrategySuggest(body: { symbol: string; session_id: string; risk: string; modes: any; context?: any }){
  return json<any>('/v1/strategy/suggest', { method:'POST', body: JSON.stringify(body) })
}

export function postAnalyze(body: { symbol: string; timeframe?: string }){
  return json<any>('/v1/analyze', { method:'POST', body: JSON.stringify(body) })
}

export function getChartData(symbol: string, timeframe: string){
  const p = new URLSearchParams({ timeframe })
  return json<any>(`/v1/chart/${symbol}?${p.toString()}`)
}

export function getWinningTrades(params?: { lookback_days?: number; universe?: string }){
  const p = new URLSearchParams()
  if (typeof params?.lookback_days === 'number') p.set('lookback_days', String(params.lookback_days))
  if (params?.universe) p.set('universe', params.universe)
  const qs = p.toString()
  return json<any>(`/v1/performance/winning-trades${qs?`?${qs}`:''}`)
}

// Backward-compatible alias; prefer getWinningTrades in new code
export function getWinningStrategies(params?: { lookback_days?: number; universe?: string }){
  return getWinningTrades(params)
}

export function getPortfolioMonitor(params?: { scope?: 'positions' | 'watchlist' }){
  const p = new URLSearchParams()
  if (params?.scope) p.set('scope', params.scope)
  const qs = p.toString()
  return json<any>(`/v1/cache/redis/portfolio-monitor${qs?`?${qs}`:''}`)
}

export function getTopPicksPositionsMonitor(){
  return json<any>('/v1/cache/redis/top-picks-positions-monitor')
}

export function getDashboardOverview(){
  return json<any>('/v1/dashboard/overview')
}

export function addWatchlistEntry(body: {
  symbol: string
  timeframe?: string
  desired_entry?: number
  stop_loss?: number
  target?: number
  notes?: string
  source?: string
}){
  return json<any>('/v1/watchlist', { method:'POST', body: JSON.stringify(body) })
}

export function updateWatchlistStatus(id: string, status: string){
  return json<any>(`/v1/watchlist/${id}`, { method:'PATCH', body: JSON.stringify({ status }) })
}

/**
 * Get consistent top picks across multiple universes
 * GUARANTEES: Rankings are consistent - if Stock A > Stock B globally, order maintained in ALL universes
 * 
 * @param params.universes - Comma-separated list (e.g., "NIFTY50,BANKNIFTY")
 * @param params.limit - Top N picks per universe (default: 5)
 * @param params.refresh - Force refresh scores (default: false, uses 6-hour cache)
 * @returns Object with picks per universe, guaranteed consistent rankings
 */
export function getAgentsPicksConsistent(params?: { universes?: string; limit?: number; refresh?: boolean }){
  const p = new URLSearchParams()
  if (params?.universes) p.set('universes', params.universes)
  if (typeof params?.limit === 'number') p.set('limit', String(params.limit))
  if (params?.refresh) p.set('refresh', 'true')
  const qs = p.toString()
  return json<any>(`/v1/agents/picks-consistent${qs?`?${qs}`:''}`)
}

/**
 * Get top picks with mode-specific agent selection
 * 
 * @param params.universe - Stock universe (nifty50, banknifty, etc.)
 * @param params.mode - Trading mode (Scalping, Intraday, Swing, Options, etc.)
 * @param params.limit - Number of picks to return
 * @param params.min_confidence - Minimum confidence filter
 * @param params.refresh - Force refresh (bypass cache)
 */
export function getTopPicks(params?: { universe?: string; mode?: string; limit?: number; min_confidence?: string; refresh?: boolean }){
  const p = new URLSearchParams()
  if (params?.universe) p.set('universe', params.universe)
  if (params?.mode) p.set('mode', params.mode)
  if (typeof params?.limit === 'number') p.set('limit', String(params.limit))
  if (params?.min_confidence) p.set('min_confidence', params.min_confidence)
  if (params?.refresh) p.set('refresh', 'true')
  const qs = p.toString()
  return json<any>(`/v1/top-picks${qs?`?${qs}`:''}`)
}

/**
 * Get all available trading modes with configurations
 */
export function getTradingModes(){
  return json<any>('/v1/trading-modes')
}

/**
 * Validate trading mode combination
 */
export function validateTradingModes(body: { primary_mode: string; auxiliary_modes: string[] }){
  return json<any>('/v1/trading-modes/validate', { method: 'POST', body: JSON.stringify(body) })
}

/**
 * Get strategy parameters for a specific mode
 */
export function getStrategyParameters(params: { primary_mode: string; score: number; current_price?: number }){
  const p = new URLSearchParams({
    primary_mode: params.primary_mode,
    score: String(params.score)
  })
  if (params.current_price) p.set('current_price', String(params.current_price))
  return json<any>(`/v1/strategy/parameters?${p.toString()}`)
}

/**
 * Log user interaction with a pick
 */
export function logPickInteraction(body: {
  symbol: string
  action: string
  universe: string
  recommendation: string
  score: number
  session_id?: string
}){
  return json<any>('/v1/analytics/interaction', { method: 'POST', body: JSON.stringify(body) })
}

/**
 * Log user feedback on a pick
 */
export function logPickFeedback(body: {
  symbol: string
  feedback_type: string
  rating?: number
  comment?: string
  recommendation?: string
  session_id?: string
}){
  return json<any>('/v1/analytics/feedback', { method: 'POST', body: JSON.stringify(body) })
}

/**
 * Update user preferences in memory
 */
export function updateMemory(body: { session_id: string; data: any }){
  return json<any>('/v1/memory/upsert', { method: 'POST', body: JSON.stringify(body) })
}

/**
 * Get strategy exits for a given date and strategy_id (e.g. NEWS_EXIT)
 */
export function getStrategyExits(params?: { date?: string; strategy_id?: string }){
  const p = new URLSearchParams()
  if (params?.date) p.set('date', params.date)
  if (params?.strategy_id) p.set('strategy_id', params.strategy_id)
  const qs = p.toString()
  return json<any>(`/v1/analytics/strategy-exits${qs ? `?${qs}` : ''}`)
}

export function getRlMetrics(params?: { mode?: string; view?: 'policy' | 'daily'; start_date?: string; end_date?: string }){
  const p = new URLSearchParams()
  if (params?.mode) p.set('mode', params.mode)
  if (params?.view) p.set('view', params.view)
  if (params?.start_date) p.set('start_date', params.start_date)
  if (params?.end_date) p.set('end_date', params.end_date)
  const qs = p.toString()
  return json<any>(`/v1/analytics/rl-metrics${qs ? `?${qs}` : ''}`)
}

export function postTradingExecute(body: any) {
  return json<any>('/v1/trading/execute', { method: 'POST', body: JSON.stringify(body) })
}

export function postTradingOrdersSync(body: { account_id?: string; trade_intent_id: string }) {
  return json<any>('/v1/trading/orders/sync', { method: 'POST', body: JSON.stringify(body) })
}
