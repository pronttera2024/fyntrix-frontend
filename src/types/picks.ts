export interface ExitStrategy {
  entry_price?: number
  mode?: string
  risk_profile?: string
  targets?: any[]
  target_price?: number
  target_pct?: number
  stop_loss?: { price?: number } | null
  stop_loss_price?: number
  time_exit?: {
    max_hold_mins?: number
    eod_exit?: boolean
  }
}

export interface Pick {
  symbol: string
  // Overall scores
  score_blend: number
  blend_score: number
  scores: Record<string, number>

  // Narrative
  rationale?: string

  // Trade & risk
  mode?: string
  risk_profile?: string
  exit_strategy?: ExitStrategy
  trade_plan?: any

  // Price info (used in performance views)
  entry_price?: number
  current_price?: number
  return_pct?: number

  // Misc
  [key: string]: any
}

export type ExitStrategyModel = ExitStrategy
