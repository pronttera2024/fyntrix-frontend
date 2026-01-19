import React from 'react'
import { formatIstTime } from '../utils/time'

interface WatchlistEntry {
  symbol: string
  urgency: string
  timeframe: string
  desired_entry: number
  current_price: number
  price_source: string
  distance_to_entry_pct: number
}

interface WatchlistSummary {
  entries?: number
  avg_health_score?: number
}

interface WatchlistData {
  as_of: string
  entries: WatchlistEntry[]
  summary: WatchlistSummary
}

interface WatchlistProps {
  watchlistMonitor: WatchlistData | null
  loadingWatchlist: boolean
}

export const Watchlist: React.FC<WatchlistProps> = ({
  watchlistMonitor,
  loadingWatchlist
}) => {
  if (loadingWatchlist) {
    return <div style={{ fontSize: 12, color: '#64748b', padding: 8 }}>Loading watchlist snapshot…</div>
  }

  const data = watchlistMonitor
  if (!data || !Array.isArray(data.entries) || data.entries.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#64748b', padding: 8 }}>
        No active watchlist entries.
        <br />
        Use Set Alert from Charts or Trade Strategy to add symbols.
      </div>
    )
  }

  const summary = data.summary || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: 8, background: '#f9fafb' }}>
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
          Snapshot as of {data.as_of ? formatIstTime(data.as_of) : '–'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11 }}>
          <div style={{ flex: '1 1 45%' }}>
            <div style={{ color: '#4b5563' }}>Entries</div>
            <div style={{ fontWeight: 600 }}>{summary.entries ?? data.entries.length}</div>
          </div>
          <div style={{ flex: '1 1 45%' }}>
            <div style={{ color: '#4b5563' }}>Avg Health</div>
            <div style={{ fontWeight: 600 }}>{summary.avg_health_score ?? 100}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Watchlist</div>
        {data.entries.map((w: WatchlistEntry, idx: number) => {
          const urgency = String(w.urgency || 'LOW').toUpperCase()
          let urgencyColor = '#10b981'
          if (urgency === 'CRITICAL') urgencyColor = '#ef4444'
          else if (urgency === 'HIGH') urgencyColor = '#f97316'
          else if (urgency === 'MEDIUM') urgencyColor = '#eab308'
          const dist = typeof w.distance_to_entry_pct === 'number' ? w.distance_to_entry_pct : 0
          const distColor = dist > 0 ? '#dc2626' : dist < 0 ? '#16a34a' : '#6b7280'
          return (
            <div key={idx} style={{ borderRadius: 8, border: '1px solid #e5e7eb', padding: 8, background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{w.symbol}</div>
                <div style={{ fontSize: 11, padding: '2px 6px', borderRadius: 999, border: `1px solid ${urgencyColor}40`, color: urgencyColor }}>
                  {urgency}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4b5563' }}>
                <div>
                  <div>{w.timeframe || '—'}</div>
                  <div>Desired ₹{w.desired_entry != null ? Number(w.desired_entry).toFixed(2) : '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>₹{Number(w.current_price || 0).toFixed(2)} <span style={{ fontSize: 10, color: '#9ca3af' }}>({w.price_source || 'tick'})</span></div>
                  <div style={{ color: distColor }}>{dist.toFixed(2)}%</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
