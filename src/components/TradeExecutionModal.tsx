import React, { useEffect, useMemo, useRef, useState } from 'react'

import { postTradingExecute, postTradingOrdersSync } from '../api'

export type TradeSource = 'CHART' | 'STRATEGY'

export type BrokerName = 'ZERODHA' | 'ANGEL_ONE' | 'ICICI_DIRECT' | 'HDFC_SECURITIES'

export type ExecuteTradePayload = {
  account_id?: string
  session_id?: string

  source: TradeSource
  broker?: BrokerName

  symbol: string
  exchange?: string

  segment: string
  product: string

  side: string
  qty: number
  order_type: string

  limit_price?: number
  trigger_price?: number

  stop_loss?: number
  target?: number
}

type PreviewResponse = {
  status: string
  requires_confirmation?: boolean
  trade_intent_id?: string
  broker?: string
  preview?: any
}

type PreviewTicket = {
  trade_intent_id?: string
  state?: string
  broker?: string
  source?: string
  symbol?: string
  exchange?: string
  segment?: string
  side?: string
  qty?: number
  product?: string
  order_type?: string
  limit_price?: number | null
  trigger_price?: number | null
  stop_loss?: number | null
  target?: number | null
  created_at?: string | null
}

type ConfirmResponse = {
  status: string
  trade_intent_id?: string
  broker?: string
  broker_order_id?: string
  note?: string
}

type SyncResponse = {
  status?: string
  trade_intent_id?: string
  intent_state?: string
  order?: {
    broker?: string
    broker_order_id?: string
    status?: string
    filled_qty?: number
    average_price?: number
    updated_at?: string
  }
}

export function TradeExecutionModal(props: {
  isOpen: boolean
  onClose: () => void
  accountId?: string
  sessionId?: string
  initialPayload: ExecuteTradePayload
  availableBrokers?: BrokerName[]
}) {
  const { isOpen, onClose, accountId, sessionId, initialPayload, availableBrokers } = props

  const resolvedAccountId = useMemo(() => {
    if (accountId && accountId.trim()) return accountId.trim()
    return 'NFP517'
  }, [accountId])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tradeIntentId, setTradeIntentId] = useState<string | null>(null)
  const [preview, setPreview] = useState<any | null>(null)

  const [draftQty, setDraftQty] = useState<string>(() => String(initialPayload.qty ?? 1))
  const [draftOrderType, setDraftOrderType] = useState<string>(() => String(initialPayload.order_type || 'MARKET'))
  const [draftProduct, setDraftProduct] = useState<string>(() => String(initialPayload.product || 'CNC'))
  const [draftLimitPrice, setDraftLimitPrice] = useState<string>(() =>
    initialPayload.limit_price == null ? '' : String(initialPayload.limit_price),
  )
  const [draftTriggerPrice, setDraftTriggerPrice] = useState<string>(() =>
    initialPayload.trigger_price == null ? '' : String(initialPayload.trigger_price),
  )

  const [finalConfirmOpen, setFinalConfirmOpen] = useState(false)

  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [brokerOrderId, setBrokerOrderId] = useState<string | null>(null)

  const brokerOptions = useMemo(() => {
    const opts = Array.isArray(availableBrokers) && availableBrokers.length > 0 ? availableBrokers : (['ZERODHA'] as BrokerName[])
    const seen = new Set<string>()
    return opts.filter((b) => {
      if (seen.has(b)) return false
      seen.add(b)
      return true
    })
  }, [availableBrokers])

  const [selectedBroker, setSelectedBroker] = useState<BrokerName>(() => {
    return (initialPayload?.broker as BrokerName) || 'ZERODHA'
  })

  const [syncing, setSyncing] = useState(false)
  const [intentState, setIntentState] = useState<string | null>(null)
  const [orderStatus, setOrderStatus] = useState<string | null>(null)

  const previewTicket = useMemo((): PreviewTicket | null => {
    const t = (preview as any)?.ticket
    if (!t || typeof t !== 'object') return null
    return t as PreviewTicket
  }, [preview])

  const displayedTicketState = previewTicket?.state ?? null
  const displayedGeneratedAt = useMemo(() => {
    const raw = previewTicket?.created_at
    if (!raw) return null
    try {
      const d = new Date(raw)
      if (Number.isNaN(d.getTime())) return raw
      return d.toLocaleString('en-IN')
    } catch {
      return raw
    }
  }, [previewTicket?.created_at])

  const pollRef = useRef<number | null>(null)

  const clearPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const resetState = () => {
    setLoading(false)
    setError(null)
    setTradeIntentId(null)
    setPreview(null)
    setDraftQty(String(initialPayload.qty ?? 1))
    setDraftOrderType(String(initialPayload.order_type || 'MARKET'))
    setDraftProduct(String(initialPayload.product || 'CNC'))
    setDraftLimitPrice(initialPayload.limit_price == null ? '' : String(initialPayload.limit_price))
    setDraftTriggerPrice(initialPayload.trigger_price == null ? '' : String(initialPayload.trigger_price))
    setFinalConfirmOpen(false)
    setConfirming(false)
    setConfirmed(false)
    setBrokerOrderId(null)
    setSyncing(false)
    setIntentState(null)
    setOrderStatus(null)
    setSelectedBroker((initialPayload?.broker as BrokerName) || 'ZERODHA')
    clearPolling()
  }

  const close = () => {
    resetState()
    onClose()
  }

  useEffect(() => {
    if (!isOpen) {
      resetState()
      return
    }

    let cancelled = false

    ;(async () => {
      setDraftQty(String(initialPayload.qty ?? 1))
      setDraftOrderType(String(initialPayload.order_type || 'MARKET'))
      setDraftProduct(String(initialPayload.product || 'CNC'))
      setDraftLimitPrice(initialPayload.limit_price == null ? '' : String(initialPayload.limit_price))
      setDraftTriggerPrice(initialPayload.trigger_price == null ? '' : String(initialPayload.trigger_price))
    })()

    return () => {
      cancelled = true
      clearPolling()
    }
  }, [isOpen, initialPayload])

  const parsedQty = useMemo(() => {
    const n = Number.parseInt(String(draftQty || '0'), 10)
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  }, [draftQty])

  const parsedLimitPrice = useMemo(() => {
    if (draftLimitPrice == null || String(draftLimitPrice).trim() === '') return null
    const n = Number(String(draftLimitPrice))
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  }, [draftLimitPrice])

  const parsedTriggerPrice = useMemo(() => {
    if (draftTriggerPrice == null || String(draftTriggerPrice).trim() === '') return null
    const n = Number(String(draftTriggerPrice))
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  }, [draftTriggerPrice])

  const draftPayload = useMemo((): ExecuteTradePayload => {
    const orderType = String(draftOrderType || initialPayload.order_type || 'MARKET')
    const product = String(draftProduct || initialPayload.product || 'CNC')
    const qty = parsedQty ?? (initialPayload.qty || 1)

    const needsLimit = orderType === 'LIMIT'
    const needsTrigger = orderType === 'SL' || orderType === 'SL-M'

    return {
      ...initialPayload,
      broker: selectedBroker,
      account_id: resolvedAccountId,
      session_id: sessionId,
      qty,
      order_type: orderType,
      product,
      limit_price: needsLimit ? (parsedLimitPrice ?? undefined) : undefined,
      trigger_price: needsTrigger ? (parsedTriggerPrice ?? undefined) : undefined,
    }
  }, [draftOrderType, draftProduct, initialPayload, parsedLimitPrice, parsedQty, parsedTriggerPrice, resolvedAccountId, selectedBroker, sessionId])

  const previewKey = useMemo(() => {
    const p = draftPayload
    return JSON.stringify({
      broker: p.broker,
      symbol: p.symbol,
      exchange: p.exchange,
      segment: p.segment,
      product: p.product,
      side: p.side,
      qty: p.qty,
      order_type: p.order_type,
      limit_price: p.limit_price ?? null,
      trigger_price: p.trigger_price ?? null,
      stop_loss: p.stop_loss ?? null,
      target: p.target ?? null,
    })
  }, [draftPayload])

  useEffect(() => {
    if (!isOpen) return
    if (confirmed) return

    let cancelled = false
    const t = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      setTradeIntentId(null)
      setPreview(null)

      try {
        const r = await postTradingExecute({ ...draftPayload, confirm: false })
        const pr = r as PreviewResponse
        if (cancelled) return
        if (!pr?.trade_intent_id) {
          throw new Error('Preview did not return trade_intent_id')
        }
        setTradeIntentId(pr.trade_intent_id)
        setPreview(pr.preview || null)

        try {
          const ticket = (pr.preview as any)?.ticket as PreviewTicket | undefined
          if (ticket && !confirmed) {
            if (typeof ticket.qty === 'number') setDraftQty(String(ticket.qty))
            if (typeof ticket.order_type === 'string') setDraftOrderType(String(ticket.order_type))
            if (typeof ticket.product === 'string') setDraftProduct(String(ticket.product))
            if (ticket.limit_price == null) setDraftLimitPrice('')
            else setDraftLimitPrice(String(ticket.limit_price))
            if (ticket.trigger_price == null) setDraftTriggerPrice('')
            else setDraftTriggerPrice(String(ticket.trigger_price))
          }
        } catch {}
      } catch (e: any) {
        if (cancelled) return
        setError(e?.message || 'Preview failed')
      } finally {
        if (cancelled) return
        setLoading(false)
      }
    }, 450)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [isOpen, confirmed, previewKey, draftPayload])

  const startPolling = (intentId: string) => {
    clearPolling()

    const pollOnce = async () => {
      setSyncing(true)
      try {
        const r = (await postTradingOrdersSync({ account_id: resolvedAccountId, trade_intent_id: intentId })) as SyncResponse
        const nextState = r?.intent_state || null
        const nextOrderStatus = r?.order?.status || null

        setIntentState(nextState)
        setOrderStatus(nextOrderStatus)

        const finalStates = ['FILLED', 'REJECTED', 'CANCELLED']
        if (nextState && finalStates.includes(String(nextState).toUpperCase())) {
          clearPolling()
        }
      } catch (e: any) {
        const msg = String(e?.message || 'Status sync failed')
        const looksLikePendingOrder =
          confirmed &&
          !brokerOrderId &&
          (msg.toLowerCase().includes('broker order not found') || msg.toLowerCase().includes('order not found'))

        if (!looksLikePendingOrder) {
          setError(msg)
        }
      } finally {
        setSyncing(false)
      }
    }

    // immediate poll
    pollOnce()
    pollRef.current = window.setInterval(pollOnce, 2000)
  }

  const onConfirm = async () => {
    if (!tradeIntentId) return

    setConfirming(true)
    setError(null)

    try {
      const req = {
        ...draftPayload,
        confirm: true,
        trade_intent_id: tradeIntentId,
      }

      const r = (await postTradingExecute(req)) as ConfirmResponse

      setConfirmed(true)
      setBrokerOrderId(r?.broker_order_id || null)
      setFinalConfirmOpen(false)

      startPolling(tradeIntentId)
    } catch (e: any) {
      setError(e?.message || 'Confirm failed')
    } finally {
      setConfirming(false)
    }
  }

  const waitingForBrokerOrder = confirmed && !brokerOrderId

  const displayedQty = previewTicket?.qty ?? draftPayload.qty
  const displayedOrderType = previewTicket?.order_type ?? draftPayload.order_type
  const displayedProduct = previewTicket?.product ?? draftPayload.product
  const displayedLimit = previewTicket && 'limit_price' in previewTicket ? (previewTicket.limit_price ?? null) : (draftPayload.limit_price ?? null)
  const displayedTrigger = previewTicket && 'trigger_price' in previewTicket ? (previewTicket.trigger_price ?? null) : (draftPayload.trigger_price ?? null)
  const displayedStopLoss = previewTicket?.stop_loss ?? draftPayload.stop_loss ?? null
  const displayedTarget = previewTicket?.target ?? draftPayload.target ?? null

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 10001,
      }}
      onClick={close}
    >
      <div
        style={{
          width: 'min(720px, 94vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 14,
          border: '1px solid #e5e7eb',
          boxShadow: '0 24px 70px rgba(15,23,42,0.4)',
          padding: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Execute trade</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
              Review the trade ticket below. Orders are placed only after final confirmation.
            </div>
          </div>
          <button
            onClick={close}
            style={{ border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer', color: '#64748b' }}
          >
            &times;
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: 12,
              marginBottom: 10,
              whiteSpace: 'pre-wrap',
            }}
          >
            {error}
          </div>
        )}

        {waitingForBrokerOrder && !error && (
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              fontSize: 12,
              marginBottom: 10,
              whiteSpace: 'pre-wrap',
            }}
          >
            Waiting for broker order id…
          </div>
        )}

        <div style={{ padding: 12, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, fontSize: 12 }}>
            <div style={{ color: '#64748b', fontWeight: 700 }}>Account</div>
            <div style={{ color: '#0f172a', fontWeight: 700 }}>{resolvedAccountId}</div>

            <div style={{ color: '#64748b', fontWeight: 700 }}>Broker</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={selectedBroker}
                disabled={confirmed || brokerOptions.length <= 1}
                onChange={(e) => setSelectedBroker(e.target.value as BrokerName)}
                style={{
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#0f172a',
                  background: confirmed || brokerOptions.length <= 1 ? '#f8fafc' : '#fff',
                }}
              >
                {brokerOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              {confirmed && <div style={{ fontSize: 11, color: '#64748b' }}>Locked</div>}
            </div>

            <div style={{ color: '#64748b', fontWeight: 700 }}>Symbol</div>
            <div style={{ color: '#0f172a', fontWeight: 700 }}>{draftPayload.symbol}</div>

            <div style={{ color: '#64748b', fontWeight: 700 }}>Side</div>
            <div style={{ color: '#0f172a', fontWeight: 700 }}>{draftPayload.side}</div>

            <div style={{ color: '#64748b', fontWeight: 700 }}>Qty</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                value={draftQty}
                disabled={confirmed}
                onChange={(e) => setDraftQty(e.target.value)}
                inputMode="numeric"
                style={{
                  width: 110,
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#0f172a',
                  background: confirmed ? '#f8fafc' : '#fff',
                }}
              />
              {parsedQty == null && !confirmed && (
                <div style={{ fontSize: 11, color: '#b91c1c' }}>Enter qty</div>
              )}
              {previewTicket && (
                <div style={{ fontSize: 11, color: '#64748b' }}>Backend: {displayedQty}</div>
              )}
            </div>

            <div style={{ color: '#64748b', fontWeight: 700 }}>Order Type</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select
                value={draftOrderType}
                disabled={confirmed}
                onChange={(e) => setDraftOrderType(e.target.value)}
                style={{
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#0f172a',
                  background: confirmed ? '#f8fafc' : '#fff',
                }}
              >
                {['MARKET', 'LIMIT', 'SL', 'SL-M'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {previewTicket && (
                <div style={{ fontSize: 11, color: '#64748b' }}>Backend: {displayedOrderType}</div>
              )}
            </div>

            <div style={{ color: '#64748b', fontWeight: 700 }}>Product</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select
                value={draftProduct}
                disabled={confirmed}
                onChange={(e) => setDraftProduct(e.target.value)}
                style={{
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#0f172a',
                  background: confirmed ? '#f8fafc' : '#fff',
                }}
              >
                {['CNC', 'MIS', 'NRML'].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {previewTicket && (
                <div style={{ fontSize: 11, color: '#64748b' }}>Backend: {displayedProduct}</div>
              )}
            </div>

            {(draftOrderType === 'LIMIT' || draftOrderType === 'SL') && (
              <>
                <div style={{ color: '#64748b', fontWeight: 700 }}>Limit Price</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    value={draftLimitPrice}
                    disabled={confirmed}
                    onChange={(e) => setDraftLimitPrice(e.target.value)}
                    inputMode="decimal"
                    style={{
                      width: 140,
                      borderRadius: 10,
                      border: '1px solid #e5e7eb',
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#0f172a',
                      background: confirmed ? '#f8fafc' : '#fff',
                    }}
                  />
                  {draftOrderType === 'LIMIT' && parsedLimitPrice == null && !confirmed && (
                    <div style={{ fontSize: 11, color: '#b91c1c' }}>Enter price</div>
                  )}
                </div>
              </>
            )}

            {(draftOrderType === 'SL' || draftOrderType === 'SL-M') && (
              <>
                <div style={{ color: '#64748b', fontWeight: 700 }}>Trigger Price</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    value={draftTriggerPrice}
                    disabled={confirmed}
                    onChange={(e) => setDraftTriggerPrice(e.target.value)}
                    inputMode="decimal"
                    style={{
                      width: 140,
                      borderRadius: 10,
                      border: '1px solid #e5e7eb',
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#0f172a',
                      background: confirmed ? '#f8fafc' : '#fff',
                    }}
                  />
                  {parsedTriggerPrice == null && !confirmed && (
                    <div style={{ fontSize: 11, color: '#b91c1c' }}>Enter trigger</div>
                  )}
                </div>
              </>
            )}

            <div style={{ color: '#64748b', fontWeight: 700 }}>Stop Loss</div>
            <div style={{ color: '#0f172a', fontWeight: 700 }}>{displayedStopLoss ?? '—'}</div>

            <div style={{ color: '#64748b', fontWeight: 700 }}>Target</div>
            <div style={{ color: '#0f172a', fontWeight: 700 }}>{displayedTarget ?? '—'}</div>

            <div style={{ color: '#64748b', fontWeight: 700 }}>Trade Intent</div>
            <div style={{ color: '#0f172a' }}>{tradeIntentId || (loading ? 'Creating…' : '—')}</div>

            <div style={{ color: '#64748b', fontWeight: 700 }}>Intent State</div>
            <div style={{ color: '#0f172a', fontWeight: 700 }}>{displayedTicketState ?? '—'}</div>

            <div style={{ color: '#64748b', fontWeight: 700 }}>Generated At</div>
            <div style={{ color: '#0f172a', fontWeight: 700 }}>{displayedGeneratedAt ?? '—'}</div>

            {brokerOrderId && (
              <>
                <div style={{ color: '#64748b', fontWeight: 700 }}>Broker Order ID</div>
                <div style={{ color: '#0f172a' }}>{brokerOrderId}</div>
              </>
            )}

            {intentState && (
              <>
                <div style={{ color: '#64748b', fontWeight: 700 }}>Intent State</div>
                <div style={{ color: '#0f172a', fontWeight: 700 }}>{intentState}</div>
              </>
            )}

            {orderStatus && (
              <>
                <div style={{ color: '#64748b', fontWeight: 700 }}>Order Status</div>
                <div style={{ color: '#0f172a', fontWeight: 700 }}>{orderStatus}</div>
              </>
            )}
          </div>

          {preview && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>
              Preview received from broker adapter. Please verify before placing the order.
            </div>
          )}
          {!preview && !error && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>
              {loading ? 'Updating preview…' : 'Preparing preview…'}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <button
            onClick={close}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              background: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              color: '#0f172a',
            }}
          >
            Cancel
          </button>

          <button
            disabled={
              loading ||
              !tradeIntentId ||
              confirming ||
              confirmed ||
              parsedQty == null ||
              (draftOrderType === 'LIMIT' && parsedLimitPrice == null) ||
              ((draftOrderType === 'SL' || draftOrderType === 'SL-M') && parsedTriggerPrice == null)
            }
            onClick={() => setFinalConfirmOpen(true)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              background: confirmed ? '#64748b' : '#16a34a',
              color: '#fff',
              cursor: loading || !tradeIntentId || confirming || confirmed ? 'not-allowed' : 'pointer',
              fontWeight: 800,
              fontSize: 13,
              minWidth: 190,
            }}
          >
            {loading ? 'Preparing…' : confirming ? 'Placing…' : confirmed ? 'Order Submitted' : 'Place Order'}
          </button>
        </div>

        {finalConfirmOpen && !confirmed && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              zIndex: 10002,
            }}
            onClick={() => setFinalConfirmOpen(false)}
          >
            <div
              style={{
                width: 'min(520px, 92vw)',
                background: '#fff',
                borderRadius: 14,
                border: '1px solid #e5e7eb',
                boxShadow: '0 24px 70px rgba(15,23,42,0.4)',
                padding: 16,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>Are you sure?</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                You are about to place this order via {selectedBroker}.
              </div>

              <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, fontSize: 12 }}>
                  <div style={{ color: '#64748b', fontWeight: 800 }}>Symbol</div>
                  <div style={{ color: '#0f172a', fontWeight: 900 }}>{draftPayload.symbol}</div>

                  <div style={{ color: '#64748b', fontWeight: 800 }}>Side</div>
                  <div style={{ color: '#0f172a', fontWeight: 900 }}>{draftPayload.side}</div>

                  <div style={{ color: '#64748b', fontWeight: 800 }}>Qty</div>
                  <div style={{ color: '#0f172a', fontWeight: 900 }}>{displayedQty}</div>

                  <div style={{ color: '#64748b', fontWeight: 800 }}>Order Type</div>
                  <div style={{ color: '#0f172a', fontWeight: 900 }}>{displayedOrderType}</div>

                  <div style={{ color: '#64748b', fontWeight: 800 }}>Product</div>
                  <div style={{ color: '#0f172a', fontWeight: 900 }}>{displayedProduct}</div>

                  <div style={{ color: '#64748b', fontWeight: 800 }}>Limit</div>
                  <div style={{ color: '#0f172a', fontWeight: 900 }}>{displayedLimit ?? '—'}</div>

                  <div style={{ color: '#64748b', fontWeight: 800 }}>Trigger</div>
                  <div style={{ color: '#0f172a', fontWeight: 900 }}>{displayedTrigger ?? '—'}</div>

                  <div style={{ color: '#64748b', fontWeight: 800 }}>Intent State</div>
                  <div style={{ color: '#0f172a', fontWeight: 900 }}>{displayedTicketState ?? '—'}</div>

                  <div style={{ color: '#64748b', fontWeight: 800 }}>Generated At</div>
                  <div style={{ color: '#0f172a', fontWeight: 900 }}>{displayedGeneratedAt ?? '—'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                <button
                  onClick={() => setFinalConfirmOpen(false)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: 13,
                    color: '#0f172a',
                  }}
                >
                  Back
                </button>
                <button
                  disabled={confirming || !tradeIntentId}
                  onClick={onConfirm}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#16a34a',
                    color: '#fff',
                    cursor: confirming || !tradeIntentId ? 'not-allowed' : 'pointer',
                    fontWeight: 900,
                    fontSize: 13,
                    minWidth: 170,
                  }}
                >
                  {confirming ? 'Placing…' : 'Yes, place order'}
                </button>
              </div>
            </div>
          </div>
        )}

        {(syncing || pollRef.current) && (
          <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>
            Syncing status{syncing ? '…' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
