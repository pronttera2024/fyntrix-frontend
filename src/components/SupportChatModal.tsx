import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getSupportConversation, postSupportChat, postSupportTicket, postSupportFeedback } from '../api'


type SupportMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export function SupportChatModal(props: { isOpen: boolean; onClose: () => void; sessionId: string; accountName?: string; accountId?: string }) {
  const { isOpen, onClose, sessionId, accountName, accountId } = props

  const identity = useMemo(() => {
    const pickFirstString = (keys: string[]) => {
      for (const k of keys) {
        try {
          const v = localStorage.getItem(k)
          if (typeof v === 'string' && v.trim()) return v.trim()
        } catch {}
      }
      return ''
    }

    const tryParseProfile = (keys: string[]) => {
      for (const k of keys) {
        try {
          const raw = localStorage.getItem(k)
          if (!raw) continue
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') return parsed as any
        } catch {}
      }
      return null
    }

    const profile = tryParseProfile(['arise_profile', 'fyntrix_profile', 'user_profile'])
    const nameFromProfile =
      profile && typeof profile.name === 'string'
        ? profile.name
        : profile && typeof profile.full_name === 'string'
          ? profile.full_name
          : profile && typeof profile.user_name === 'string'
            ? profile.user_name
            : ''

    const accountIdFromProfile =
      profile && typeof profile.account_id === 'string'
        ? profile.account_id
        : profile && typeof profile.client_id === 'string'
          ? profile.client_id
          : profile && typeof profile.user_id === 'string'
            ? profile.user_id
            : ''

    const userName = nameFromProfile || pickFirstString(['arise_user_name', 'fyntrix_user_name', 'full_name', 'user_name', 'username', 'name'])
    const accountId = accountIdFromProfile || pickFirstString(['account_id', 'client_id', 'user_id', 'arise_account_id', 'arise_client_id'])

    return { userName, accountId }
  }, [sessionId])

  const [conversationId, setConversationId] = useState<string>('')
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestTicket, setSuggestTicket] = useState(false)
  const [ticketCreated, setTicketCreated] = useState<string | null>(null)
  const [feedbackChoice, setFeedbackChoice] = useState<'up' | 'down' | null>(null)

  const effectiveName = (accountName || identity.userName || '').trim()
  const effectiveAccountId = (accountId || identity.accountId || '').trim()

  const lastConversationKey = useMemo(() => {
    const keyBase = effectiveAccountId || sessionId || 'local'
    return `arise_support_last_conversation_v1_${keyBase}`
  }, [effectiveAccountId, sessionId])

  const initGreetingMessage = useMemo<SupportMessage>(() => {
    const greeting = effectiveName ? `Dear ${effectiveName}` : 'Hello'
    return {
      id: 'hello',
      role: 'assistant',
      text:
        `${greeting}, I'm FYNTRIX support. I can help with product questions, account help, feedback, or grievances.\n\nWe value your privacy so please don't share passwords/OTPs/tokens or any personal details here. What can I help you with?`,
    }
  }, [effectiveName])

  const startNewConversation = useCallback(() => {
    const newId = `support_${sessionId}_${Date.now()}`
    setTicketCreated(null)
    setFeedbackChoice(null)
    setSuggestTicket(false)
    setMessages([initGreetingMessage])
    setConversationId(newId)
    try {
      localStorage.setItem(lastConversationKey, newId)
    } catch {}
  }, [initGreetingMessage, lastConversationKey, sessionId])

  const endRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    const run = async () => {
      let lastId = ''
      try {
        lastId = String(localStorage.getItem(lastConversationKey) || '')
      } catch {
        lastId = ''
      }

      if (!lastId) {
        startNewConversation()
        return
      }

      setLoading(true)
      try {
        const r = await getSupportConversation({
          conversation_id: lastId,
          session_id: sessionId,
          account_id: effectiveAccountId || undefined,
          limit: 200,
        })
        if (cancelled) return
        const items = Array.isArray(r?.items) ? r.items : []
        const mapped: SupportMessage[] = []
        for (const it of items) {
          if (!it || typeof it !== 'object') continue
          const role = it.role === 'user' ? 'user' : it.role === 'assistant' ? 'assistant' : null
          if (!role) continue
          const text = typeof it.content === 'string' ? it.content : ''
          if (!text) continue
          mapped.push({ id: String(it.ts || Math.random()), role, text })
        }

        setTicketCreated(null)
        setFeedbackChoice(null)
        setSuggestTicket(false)
        setConversationId(lastId)
        if (mapped.length > 0) {
          setMessages(mapped)
        } else {
          setMessages([initGreetingMessage])
        }
      } catch {
        if (cancelled) return
        startNewConversation()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    setTimeout(() => {
      try {
        inputRef.current?.focus()
      } catch {}
    }, 50)

    return () => {
      cancelled = true
    }
  }, [effectiveAccountId, initGreetingMessage, isOpen, lastConversationKey, sessionId, startNewConversation])

  useEffect(() => {
    if (!isOpen) return
    try {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch {}
  }, [messages, isOpen])

  const send = async () => {
    const t = input.trim()
    if (!t || loading) return

    const msg: SupportMessage = { id: String(Date.now()), role: 'user', text: t }
    setMessages(m => [...m, msg])
    setInput('')

    try {
      setLoading(true)
      const r = await postSupportChat({
        session_id: sessionId,
        conversation_id: conversationId,
        message: t,
        account_id: effectiveAccountId || undefined,
        user_name: effectiveName || undefined,
        context: {},
      })

      try {
        if (conversationId) localStorage.setItem(lastConversationKey, conversationId)
      } catch {}

      const respText = String(r?.response || '').trim() || 'I’m here — could you share a little more detail?'
      setMessages(m => [...m, { id: String(Date.now() + 1), role: 'assistant', text: respText }])
      setSuggestTicket(Boolean(r?.suggest_ticket))
    } catch (e) {
      setMessages(m => [
        ...m,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          text: 'I’m having trouble connecting right now. Please try again in a moment.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const createTicket = async () => {
    if (!conversationId) return

    const userTexts = messages.filter(m => m.role === 'user').map(m => m.text)
    const details = userTexts.join('\n')

    try {
      setLoading(true)
      const r = await postSupportTicket({
        conversation_id: conversationId,
        session_id: sessionId,
        account_id: effectiveAccountId || undefined,
        user_name: effectiveName || undefined,
        summary: userTexts[0] || 'Support request',
        details: details || 'No details provided',
        category: 'general',
        severity: 'normal',
      })
      const id = r?.ticket_id ? String(r.ticket_id) : null
      setTicketCreated(id)
      setSuggestTicket(false)
      setMessages(m => [
        ...m,
        {
          id: String(Date.now() + 2),
          role: 'assistant',
          text: id
            ? `Done. I’ve created a support ticket: ${id}.\n\nTo protect your privacy, please don’t share personal details here. If needed, our team will ask for verification via a secure channel.`
            : 'Done. I’ve created a support ticket. Our team will follow up.',
        },
      ])
    } catch {
      setMessages(m => [
        ...m,
        {
          id: String(Date.now() + 2),
          role: 'assistant',
          text: 'I couldn’t create a ticket right now. Please try again in a moment.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const shouldShowFeedback = messages.filter(m => m.role === 'assistant').length >= 2

  const submitFeedback = async (choice: 'up' | 'down') => {
    if (feedbackChoice) return
    setFeedbackChoice(choice)
    try {
      await postSupportFeedback({
        conversation_id: conversationId,
        session_id: sessionId,
        account_id: effectiveAccountId || undefined,
        user_name: effectiveName || undefined,
        rating: choice === 'up' ? 1 : -1,
      })
    } catch {}
  }

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
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 520,
          maxWidth: '92vw',
          height: 640,
          maxHeight: '86vh',
          background: '#fff',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1f2937 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Support and Feedback</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => startNewConversation()}
              style={{
                border: 'none',
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                height: 34,
                padding: '0 12px',
                borderRadius: 10,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 800,
                fontSize: 12,
                opacity: loading ? 0.6 : 1,
              }}
              disabled={loading}
              title="Start a new support conversation"
            >
              New
            </button>
            <button
              onClick={onClose}
              style={{
                border: 'none',
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                width: 34,
                height: 34,
                borderRadius: 10,
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 16px',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {messages.map(m => (
            <div
              key={m.id}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '84%',
                background: m.role === 'user' ? '#2563eb' : '#ffffff',
                color: m.role === 'user' ? '#fff' : '#0f172a',
                border: m.role === 'user' ? 'none' : '1px solid #e5e7eb',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '10px 12px',
                fontSize: 13,
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.text}
            </div>
          ))}

          {loading && (
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '84%',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px 16px 16px 4px',
                padding: '10px 12px',
                fontSize: 13,
                color: '#0f172a',
              }}
            >
              Working on it…
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') send()
              }}
              placeholder="Describe your issue or share feedback (no personal details)"
              style={{
                flex: 1,
                height: 40,
                borderRadius: 999,
                border: '1px solid #d1d5db',
                padding: '0 14px',
                fontSize: 13,
                outline: 'none',
              }}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                height: 40,
                padding: '0 16px',
                borderRadius: 999,
                border: 'none',
                background: loading || !input.trim() ? '#e5e7eb' : '#2563eb',
                color: loading || !input.trim() ? '#64748b' : '#fff',
                fontWeight: 700,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Send
            </button>
          </div>

          {(suggestTicket || ticketCreated) && (
            <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={createTicket}
                disabled={loading || Boolean(ticketCreated)}
                style={{
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: '1px solid #94a3b8',
                  background: '#fff',
                  cursor: loading || Boolean(ticketCreated) ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                Create ticket
              </button>
              <div style={{ fontSize: 12, color: '#475569' }}>
                Creates a support ticket from this chat.
              </div>
            </div>
          )}

          {shouldShowFeedback && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#475569' }}>Did we resolve your query?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => submitFeedback('up')}
                  disabled={loading || Boolean(feedbackChoice)}
                  style={{
                    height: 30,
                    width: 40,
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    background: feedbackChoice === 'up' ? '#dcfce7' : '#fff',
                    cursor: loading || Boolean(feedbackChoice) ? 'not-allowed' : 'pointer',
                    fontSize: 16,
                  }}
                  title="Yes"
                >
                  👍
                </button>
                <button
                  onClick={() => submitFeedback('down')}
                  disabled={loading || Boolean(feedbackChoice)}
                  style={{
                    height: 30,
                    width: 40,
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    background: feedbackChoice === 'down' ? '#fee2e2' : '#fff',
                    cursor: loading || Boolean(feedbackChoice) ? 'not-allowed' : 'pointer',
                    fontSize: 16,
                  }}
                  title="No"
                >
                  👎
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
