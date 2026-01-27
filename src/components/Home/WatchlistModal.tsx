import React, { useRef } from 'react'

interface WatchlistModalProps {
  showWatchlist: boolean
  isMobile: boolean
  watchlistMonitor: any
  loadingWatchlist: boolean
  loadingWatchlistEntriesAll: boolean
  watchlistEntriesAll: any[]
  watchlistShowAllEntries: boolean
  watchlistExpanded: Record<string, boolean>
  watchlistMutatingId: string | null
  watchlistTooltip: { text: string; x: number; y: number } | null
  livePrices: any
  closeWatchlist: () => void
  fetchWatchlistMonitor: () => void
  fetchWatchlistEntriesAll: () => void
  setWatchlistShowAllEntries: (show: boolean) => void
  setWatchlistExpanded: (expanded: Record<string, boolean>) => void
  mutateWatchlistStatus: (id: string, status: string) => void
  setWatchlistTooltip: (tooltip: { text: string; x: number; y: number } | null) => void
  setChartView: (view: { symbol: string; analysis?: any }) => void
  setChartReturnTo: (returnTo: 'watchlist' | null) => void
  setChatInput: (input: string) => void
  watchlistDialogRef: React.RefObject<HTMLDivElement>
  watchlistCloseRef: React.RefObject<HTMLButtonElement>
  watchlistScrollElRef: React.RefObject<HTMLDivElement>
  swipeCloseWatchlist: any
  arisChatSectionRef: React.RefObject<HTMLDivElement>
  watchlistScrollTopRef: React.RefObject<number>
  watchlistRestoreScrollRef: React.RefObject<boolean>
}

const formatIstTime = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

export const WatchlistModal: React.FC<WatchlistModalProps> = ({
  showWatchlist,
  isMobile,
  watchlistMonitor,
  loadingWatchlist,
  loadingWatchlistEntriesAll,
  watchlistEntriesAll,
  watchlistShowAllEntries,
  watchlistExpanded,
  watchlistMutatingId,
  watchlistTooltip,
  livePrices,
  closeWatchlist,
  fetchWatchlistMonitor,
  fetchWatchlistEntriesAll,
  setWatchlistShowAllEntries,
  setWatchlistExpanded,
  mutateWatchlistStatus,
  setWatchlistTooltip,
  setChartView,
  setChartReturnTo,
  setChatInput,
  watchlistDialogRef,
  watchlistCloseRef,
  watchlistScrollElRef,
  swipeCloseWatchlist,
  arisChatSectionRef,
  watchlistScrollTopRef,
  watchlistRestoreScrollRef,
}) => {
  if (!showWatchlist) return null

  const urgencyColor = (urgency: string) => {
    const u = String(urgency || 'LOW').toUpperCase()
    if (u === 'CRITICAL') return '#ef4444'
    if (u === 'HIGH') return '#f97316'
    if (u === 'MEDIUM') return '#eab308'
    return '#10b981'
  }

  const healthColor = (s: number) => {
    if (s >= 85) return '#16a34a'
    if (s >= 70) return '#eab308'
    return '#ef4444'
  }

  const getLivePriceNumber = (sym: string) => {
    const v: any = livePrices?.[sym]
    if (typeof v === 'number') return v
    if (v && typeof v === 'object') {
      if (typeof v.last_price === 'number') return v.last_price
      if (typeof v.price === 'number') return v.price
      if (typeof v.ltp === 'number') return v.ltp
    }
    return NaN
  }

  const showTip = (e: any, text: string) => {
    if (isMobile) return
    try {
      const rect = e?.currentTarget?.getBoundingClientRect?.()
      if (!rect) return
      setWatchlistTooltip({
        text,
        x: rect.left + rect.width / 2,
        y: rect.top,
      })
    } catch {}
  }

  const hideTip = () => {
    if (isMobile) return
    setWatchlistTooltip(null)
  }

  const urgencyRank = (urgency: string) => {
    const u = String(urgency || 'LOW').toUpperCase()
    if (u === 'CRITICAL') return 0
    if (u === 'HIGH') return 1
    if (u === 'MEDIUM') return 2
    if (u === 'LOW') return 3
    return 4
  }

  const monitor = watchlistMonitor
  const monitorEntries: any[] = Array.isArray(monitor?.entries) ? monitor.entries : []
  const monitorById = new Map<string, any>()
  monitorEntries.forEach((e: any) => {
    const id = String(e?.id || '')
    if (id) monitorById.set(id, e)
  })

  const allEntries: any[] = Array.isArray(watchlistEntriesAll) ? watchlistEntriesAll : []
  const showEntries = watchlistShowAllEntries
    ? allEntries
    : allEntries.filter((e: any) => String(e?.status || 'active') === 'active')

  const dedupedEntries = (() => {
    try {
      const bySymbol = new Map<string, any>()
      for (const e of showEntries) {
        const sym = String(e?.symbol || '').toUpperCase().trim()
        if (!sym) continue

        const existing = bySymbol.get(sym)
        if (!existing) {
          bySymbol.set(sym, e)
          continue
        }

        const statusRank = (x: any) => {
          const st = String(x?.status || 'active')
          if (st === 'active') return 2
          if (st === 'paused') return 1
          return 0
        }
        const ts = (x: any) => {
          const raw = String(x?.updated_at || x?.created_at || '')
          const t = raw ? new Date(raw).getTime() : NaN
          return Number.isNaN(t) ? 0 : t
        }

        const rNew = statusRank(e)
        const rOld = statusRank(existing)
        if (rNew > rOld) {
          bySymbol.set(sym, e)
          continue
        }
        if (rNew < rOld) continue

        if (ts(e) > ts(existing)) {
          bySymbol.set(sym, e)
        }
      }
      return Array.from(bySymbol.values())
    } catch {
      return showEntries
    }
  })()

  const sortedEntries = [...dedupedEntries].sort((a: any, b: any) => {
    const aId = String(a?.id || '')
    const bId = String(b?.id || '')
    const aEnriched = aId ? (monitorById.get(aId) || a) : a
    const bEnriched = bId ? (monitorById.get(bId) || b) : b
    const aUrg = String(aEnriched?.urgency || 'LOW')
    const bUrg = String(bEnriched?.urgency || 'LOW')
    const ra = urgencyRank(aUrg)
    const rb = urgencyRank(bUrg)
    if (ra !== rb) return ra - rb
    const aSym = String(aEnriched?.symbol || a?.symbol || '').toUpperCase()
    const bSym = String(bEnriched?.symbol || b?.symbol || '').toUpperCase()
    return aSym.localeCompare(bSym)
  })

  const summary = monitor?.summary || {}
  const asOf = monitor?.as_of
  const contentMaxWidth = isMobile ? undefined : 600

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: isMobile ? '#ffffff' : 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: isMobile ? 'stretch' : 'center',
        padding: isMobile ? 0 : 20,
        zIndex: 1001,
        overscrollBehavior: isMobile ? 'contain' : undefined,
      }}
      onClick={closeWatchlist}
    >
      <div
        ref={watchlistDialogRef}
        role="dialog"
        aria-modal={true}
        aria-label="Watchlist"
        tabIndex={-1}
        style={{
          width: isMobile ? '100vw' : 'min(980px, 92vw)',
          height: isMobile ? '100dvh' : undefined,
          maxHeight: isMobile ? '100dvh' : '90vh',
          background: '#ffffff',
          borderRadius: isMobile ? 0 : 16,
          padding: isMobile
            ? 'calc(env(safe-area-inset-top) + 12px) 16px calc(env(safe-area-inset-bottom) + 16px) 16px'
            : 22,
          border: isMobile ? 'none' : '1px solid #e2e8f0',
          boxShadow: isMobile ? 'none' : '0 18px 50px rgba(2,6,23,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!isMobile && watchlistTooltip && (
          <div
            style={{
              position: 'fixed',
              left: watchlistTooltip.x,
              top: watchlistTooltip.y,
              transform: 'translate(-50%, calc(-100% - 10px))',
              zIndex: 1005,
              pointerEvents: 'none',
              background: '#0f172a',
              color: '#ffffff',
              padding: '8px 10px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              maxWidth: 320,
              lineHeight: 1.35,
              boxShadow: '0 10px 30px rgba(2,6,23,0.35)',
            }}
          >
            {watchlistTooltip.text}
          </div>
        )}
        <div
          {...swipeCloseWatchlist}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 14,
            position: isMobile ? 'sticky' : 'static',
            top: isMobile ? 0 : undefined,
            background: '#ffffff',
            zIndex: 2,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 26 }}>🔔</span>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#0f172a' }}>Watchlist Alerts</div>
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Track symbols you marked via Set Alert and get timely signals when setups become actionable.
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => {
                  fetchWatchlistMonitor()
                  fetchWatchlistEntriesAll()
                }}
                style={{
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  borderRadius: 10,
                  padding: '8px 10px',
                  fontWeight: 800,
                  fontSize: 12,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                Refresh
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#334155' }}>
                <input
                  type="checkbox"
                  checked={watchlistShowAllEntries}
                  onChange={(e) => setWatchlistShowAllEntries(e.target.checked)}
                />
                Show paused/removed
              </label>
            </div>
          </div>

          <button
            ref={watchlistCloseRef}
            onClick={closeWatchlist}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 28,
              cursor: 'pointer',
              color: '#64748b',
              lineHeight: 1,
              padding: 0,
              marginTop: -6,
            }}
          >
            &times;
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            background: isMobile ? '#ffffff' : '#e2e8f0',
            padding: isMobile ? 0 : 12,
          }}
          ref={watchlistScrollElRef}
          onScroll={() => {
            if (!isMobile) setWatchlistTooltip(null)
            try {
              if (watchlistScrollElRef.current) {
                (watchlistScrollTopRef as any).current = watchlistScrollElRef.current.scrollTop
              }
            } catch {}
          }}
        >
          {(() => {
            if ((loadingWatchlist || loadingWatchlistEntriesAll) && !dedupedEntries.length) {
              return <div style={{ fontSize: 12, color: '#64748b', padding: 8 }}>Loading watchlist…</div>
            }

            if (!dedupedEntries.length) {
              return (
                <div style={{ fontSize: 12, color: '#64748b', padding: 8 }}>
                  No watchlist entries.
                  <br />
                  Use Set Alert from Charts or Trade Strategy to add symbols.
                </div>
              )
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    borderRadius: 12,
                    border: '2px solid #cbd5e1',
                    borderLeft: '6px solid #14b8a6',
                    padding: 12,
                    background: isMobile ? '#f9fafb' : 'rgba(255,255,255,0.9)',
                    width: '100%',
                    maxWidth: contentMaxWidth,
                    margin: isMobile ? undefined : '0 auto',
                    boxShadow: isMobile ? undefined : '0 2px 10px rgba(15,23,42,0.12)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                      Snapshot as of {asOf ? formatIstTime(asOf) : '–'}
                    </div>
                    <button
                      onClick={() => {
                        closeWatchlist()
                        window.setTimeout(() => {
                          try {
                            arisChatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          } catch {}
                          try {
                            const input = document.querySelector('input[placeholder="Ask Fyntrix…"]') as HTMLInputElement | null
                            if (input) input.focus()
                          } catch {}
                        }, 0)
                      }}
                      style={{
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        borderRadius: 999,
                        padding: '7px 10px',
                        fontWeight: 900,
                        fontSize: 12,
                        color: '#0f172a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>💬</span>
                      <span>AI Strategist</span>
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 13 }}>
                    <div style={{ flex: '1 1 160px' }}>
                      <div style={{ color: '#4b5563' }}>Active entries</div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{typeof summary.entries === 'number' ? summary.entries : showEntries.length}</div>
                    </div>
                    <div style={{ flex: '1 1 160px' }}>
                      <div style={{ color: '#4b5563' }}>Avg Health</div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{typeof summary.avg_health_score === 'number' ? summary.avg_health_score : '–'}</div>
                    </div>
                    <div style={{ flex: '1 1 160px' }}>
                      <div style={{ color: '#4b5563' }}>Critical/High</div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{(typeof summary.critical === 'number' ? summary.critical : 0) + (typeof summary.high === 'number' ? summary.high : 0)}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {sortedEntries.map((raw: any) => {
                    const id = String(raw?.id || '')
                    const status = String(raw?.status || 'active')
                    const enriched = id ? (monitorById.get(id) || raw) : raw
                    const symbol = String(enriched?.symbol || raw?.symbol || '').toUpperCase()
                    const timeframe = enriched?.timeframe || raw?.timeframe
                    const desired = enriched?.desired_entry
                    const current = enriched?.current_price
                    const priceSource = enriched?.price_source
                    const desiredNum = desired != null && desired !== '' ? Number(desired) : NaN
                    const currentNum =
                      current != null && current !== ''
                        ? Number(current)
                        : getLivePriceNumber(symbol)

                    const dist =
                      typeof enriched?.distance_to_entry_pct === 'number'
                        ? enriched.distance_to_entry_pct
                        : (Number.isFinite(desiredNum) && Number.isFinite(currentNum) && desiredNum !== 0
                            ? ((currentNum - desiredNum) / desiredNum) * 100
                            : NaN)
                    const distColor = dist > 0 ? '#dc2626' : dist < 0 ? '#16a34a' : '#6b7280'

                    let readinessLabel = '–'
                    let readinessColor = '#64748b'
                    if (Number.isFinite(desiredNum) && Number.isFinite(currentNum) && desiredNum !== 0) {
                      const deltaPct = ((currentNum - desiredNum) / desiredNum) * 100
                      const absPct = Math.abs(deltaPct)
                      const nearThresholdPct = 0.35
                      if (absPct <= nearThresholdPct) {
                        readinessLabel = `Near entry (${deltaPct.toFixed(2)}%)` 
                        readinessColor = '#2563eb'
                      } else if (deltaPct > 0) {
                        readinessLabel = `Above entry (+${absPct.toFixed(2)}%)` 
                        readinessColor = '#f97316'
                      } else {
                        readinessLabel = `Below entry (-${absPct.toFixed(2)}%)` 
                        readinessColor = '#16a34a'
                      }
                    }

                    const urgency = String(enriched?.urgency || 'LOW').toUpperCase()
                    const uColor = urgencyColor(urgency)
                    const healthScoreRaw = (enriched as any)?.health_score
                    const healthScoreNum =
                      typeof healthScoreRaw === 'number'
                        ? healthScoreRaw
                        : (healthScoreRaw != null && healthScoreRaw !== '' && !Number.isNaN(Number(healthScoreRaw))
                            ? Number(healthScoreRaw)
                            : null)
                    const alerts: any[] = Array.isArray(enriched?.alerts) ? enriched.alerts : []
                    const topAlerts = alerts.slice(0, 3)

                    const entryKey = id || `${symbol}-${timeframe || 'na'}` 
                    const isExpanded = !!watchlistExpanded[entryKey]
                    const isBusy = watchlistMutatingId === id

                    return (
                      <div key={id || `${symbol}-${timeframe || 'na'}`}
                        style={{
                          borderRadius: 12,
                          border: '2px solid #cbd5e1',
                          borderLeft: `6px solid ${uColor}`,
                          padding: 12,
                          background: '#ffffff',
                          width: '100%',
                          maxWidth: contentMaxWidth,
                          margin: isMobile ? undefined : '0 auto',
                          boxShadow: isMobile ? undefined : '0 2px 10px rgba(15,23,42,0.12)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ fontWeight: 900, fontSize: 17, color: '#0f172a' }}>{symbol || '—'}</div>
                            <div style={{ fontSize: 13, color: '#64748b' }}>
                              {timeframe || '—'}
                              {status !== 'active' ? ` • ${status}` : ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              tabIndex={0}
                              onMouseEnter={(e) => showTip(e, 'Urgency: how close this setup is to becoming actionable (CRITICAL/HIGH/MEDIUM/LOW).')}
                              onMouseLeave={hideTip}
                              onFocus={(e) => showTip(e, 'Urgency: how close this setup is to becoming actionable (CRITICAL/HIGH/MEDIUM/LOW).')}
                              onBlur={hideTip}
                              style={{ fontSize: 13, padding: '3px 10px', borderRadius: 999, border: `1px solid ${uColor}40`, color: uColor, fontWeight: 900 }}
                            >
                              {urgency}
                            </div>
                            {healthScoreNum != null && (
                              <div
                                tabIndex={0}
                                onMouseEnter={(e) => showTip(e, 'Health score (0-100): overall setup quality from monitoring signals.')}
                                onMouseLeave={hideTip}
                                onFocus={(e) => showTip(e, 'Health score (0-100): overall setup quality from monitoring signals.')}
                                onBlur={hideTip}
                                style={{ fontSize: 13, padding: '3px 10px', borderRadius: 999, border: `1px solid ${healthColor(healthScoreNum)}40`, color: healthColor(healthScoreNum), fontWeight: 900 }}
                              >
                                {Math.round(healthScoreNum)}/100
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14, color: '#334155' }}>
                          <div>
                            <div style={{ fontSize: 13, color: '#64748b' }}>Desired entry</div>
                            <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 15 }}>₹{desired != null ? Number(desired).toFixed(2) : '—'}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, color: '#64748b' }}>Current</div>
                            <div style={{ fontWeight: 900, color: '#0f172a', fontSize: 15 }}>
                              ₹{Number.isFinite(currentNum) ? Number(currentNum).toFixed(2) : '—'}
                              {priceSource ? <span style={{ fontSize: 10, color: '#94a3b8' }}> ({priceSource})</span> : null}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 900, color: distColor }}>{Number.isFinite(dist) ? `${dist.toFixed(2)}%` : '—'}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                          <div style={{ color: '#64748b' }}>Action readiness</div>
                          <div style={{ fontWeight: 900, color: readinessColor }}>{readinessLabel}</div>
                        </div>

                        {topAlerts.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>Signals</div>
                            <div style={{ display: 'grid', gap: 6 }}>
                              {topAlerts.map((a: any, j: number) => {
                                const t = String(a?.type || '').replace(/_/g, ' ').trim()
                                const msg = String(a?.message || a?.signal || a?.summary || a?.text || '').trim()
                                const label = (msg || t || 'Alert').slice(0, 140)
                                return (
                                  <div key={j} style={{ padding: '9px 10px', borderRadius: 10, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', fontSize: 13, lineHeight: 1.35 }}>
                                    {label}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <button
                            onClick={() => {
                              if (symbol) {
                                try {
                                  if (watchlistScrollElRef.current) {
                                    (watchlistScrollTopRef as any).current = watchlistScrollElRef.current.scrollTop
                                  }
                                  (watchlistRestoreScrollRef as any).current = true
                                } catch {}
                                setChartReturnTo('watchlist')
                                setChartView({ symbol })
                                closeWatchlist()
                              }
                            }}
                            style={{
                              border: '1px solid #e2e8f0',
                              background: '#f1f5f9',
                              borderRadius: 10,
                              padding: '8px 10px',
                              fontWeight: 900,
                              fontSize: 12,
                              color: '#0f172a',
                              cursor: 'pointer',
                            }}
                          >
                            Open Chart
                          </button>

                          <button
                            onClick={() => {
                              const prompt = `Explain the latest signals for ${symbol || 'this symbol'} (${timeframe || '—'}).` 
                              try {
                                setChatInput(prompt)
                              } catch {}
                              closeWatchlist()
                              window.setTimeout(() => {
                                try {
                                  arisChatSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                } catch {}
                                try {
                                  const input = document.querySelector('input[placeholder="Ask Fyntrix…"]') as HTMLInputElement | null
                                  if (input) input.focus()
                                } catch {}
                              }, 0)
                            }}
                            style={{
                              border: '1px solid #e2e8f0',
                              background: '#f1f5f9',
                              borderRadius: 10,
                              padding: '8px 10px',
                              fontWeight: 900,
                              fontSize: 12,
                              color: '#0f172a',
                              cursor: 'pointer',
                            }}
                          >
                            Ask
                          </button>

                          <button
                            onClick={() => {
                              // @ts-ignore
                              setWatchlistExpanded((prev) => ({
                                ...prev,
                                [entryKey]: !prev[entryKey],
                              }))
                            }}
                            style={{
                              border: '1px solid #e2e8f0',
                              background: isExpanded ? '#e2e8f0' : '#f1f5f9',
                              borderRadius: 10,
                              padding: '8px 10px',
                              fontWeight: 900,
                              fontSize: 12,
                              color: '#0f172a',
                              cursor: 'pointer',
                            }}
                          >
                            {isExpanded ? 'Hide Details' : 'Details'}
                          </button>

                          {status === 'active' ? (
                            <button
                              disabled={isBusy || !id}
                              onClick={() => mutateWatchlistStatus(id, 'paused')}
                              style={{
                                border: '1px solid #e2e8f0',
                                background: isBusy ? '#e2e8f0' : '#f1f5f9',
                                borderRadius: 10,
                                padding: '8px 10px',
                                fontWeight: 900,
                                fontSize: 12,
                                color: '#0f172a',
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                              }}
                            >
                              Pause
                            </button>
                          ) : (
                            <button
                              disabled={isBusy || !id}
                              onClick={() => mutateWatchlistStatus(id, 'active')}
                              style={{
                                border: '1px solid #bbf7d0',
                                background: isBusy ? '#f1f5f9' : '#f0fdf4',
                                borderRadius: 10,
                                padding: '8px 10px',
                                fontWeight: 900,
                                fontSize: 12,
                                color: '#166534',
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                              }}
                            >
                              Resume
                            </button>
                          )}

                          <button
                            disabled={isBusy || !id}
                            onClick={() => {
                              try {
                                const ok = window.confirm('Remove this watchlist entry?')
                                if (!ok) return
                              } catch {}
                              mutateWatchlistStatus(id, 'removed')
                            }}
                            style={{
                              border: '1px solid #fecaca',
                              background: isBusy ? '#f1f5f9' : '#fef2f2',
                              borderRadius: 10,
                              padding: '8px 10px',
                              fontWeight: 900,
                              fontSize: 12,
                              color: '#991b1b',
                              cursor: isBusy ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </div>

                        {isExpanded && (
                          <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 10, display: 'grid', gap: 10 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#334155' }}>
                              <div>
                                <div style={{ fontSize: 13, color: '#64748b' }}>Stop loss</div>
                                <div style={{ fontWeight: 900, color: '#0f172a' }}>₹{enriched?.stop_loss != null ? Number(enriched.stop_loss).toFixed(2) : '—'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 13, color: '#64748b' }}>Target</div>
                                <div style={{ fontWeight: 900, color: '#0f172a' }}>₹{enriched?.target != null ? Number(enriched.target).toFixed(2) : '—'}</div>
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>All signals</div>
                              {alerts.length > 0 ? (
                                <div style={{ display: 'grid', gap: 6 }}>
                                  {alerts.map((a: any, j: number) => {
                                    const t = String(a?.type || '').replace(/_/g, ' ').trim()
                                    const msg = String(a?.message || a?.signal || a?.summary || a?.text || '').trim()
                                    const label = (msg || t || 'Alert').slice(0, 220)
                                    return (
                                      <div key={j} style={{ padding: '9px 10px', borderRadius: 10, background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', fontSize: 13, lineHeight: 1.35 }}>
                                        {label}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div style={{ fontSize: 13, color: '#64748b' }}>No signals yet.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
