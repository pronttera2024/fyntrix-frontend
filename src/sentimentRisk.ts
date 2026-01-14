export type SentimentRiskLevel = {
  label: 'Low' | 'Medium' | 'High'
  score: number
  color: string
}

export function computeSentimentRiskLevel(rawScore: any): SentimentRiskLevel | null {
  const score = typeof rawScore === 'number' ? rawScore : parseFloat(String(rawScore || ''))
  if (!Number.isFinite(score) || score <= 0) return null

  let label: SentimentRiskLevel['label'] = 'Medium'
  let color = '#eab308'
  if (score >= 75) {
    label = 'High'
    color = '#ef4444'
  } else if (score < 60) {
    label = 'Low'
    color = '#16a34a'
  }

  return { label, score, color }
}
