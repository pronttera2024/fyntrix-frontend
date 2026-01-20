import React, { useEffect, useRef, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { reportError } from '../utils/errorReporting'

type ChatLayout = 'left-fixed' | 'bottom-docked'

interface AIResearchChatProps {
  chatInput: string
  setChatInput: (input: string) => void
  chat: Array<{ role: 'user' | 'assistant', text: string }>
  setChat: (chat: Array<{ role: 'user' | 'assistant', text: string }>) => void
  chatLayout: ChatLayout
  setChatLayout: (layout: ChatLayout) => void
  chatLoading: boolean
  setChatLoading: (loading: boolean) => void
  onSend: () => void
  isMobile: boolean
  chatKeyboardInset: number
  picks: any[]
  market: any
  sentiment: any
  risk: string
  primaryMode: string
  universe: string
  sessionId: string
  onToggleChat?: () => void // For mobile floating button
  showChat?: boolean // For mobile chat visibility
}

export const AIResearchChat: React.FC<AIResearchChatProps> = ({
  chatInput,
  setChatInput,
  chat,
  setChat,
  chatLayout,
  setChatLayout,
  chatLoading,
  setChatLoading,
  onSend,
  isMobile,
  chatKeyboardInset,
  picks,
  market,
  sentiment,
  risk,
  primaryMode,
  universe,
  sessionId,
  onToggleChat,
  showChat
}) => {
  const chatMessagesRef = useRef<HTMLDivElement | null>(null)
  const chatInputElRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 76, y: window.innerHeight - 180 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = chatMessagesRef.current
    if (!el || chat.length === 0) return
    el.scrollTop = el.scrollHeight
  }, [chat.length])

  // Mobile floating button drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isMobile) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isMobile, isDragging, dragStart])

  // Mobile: Show floating button
  if (isMobile && !showChat) {
    return (
      <button
        onClick={onToggleChat}
        onMouseDown={handleMouseDown}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: 56,
          height: 56,
          borderRadius: 999,
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          border: '2px solid #ffffff',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: isDragging ? 'none' : 'all 0.2s ease',
          transform: isDragging ? 'scale(1.05)' : 'scale(1)'
        }}
      >
        <MessageCircle size={24} color="#ffffff" />
      </button>
    )
  }

  // Desktop: Show full chat OR Mobile: Show chat when opened
  return (
    <section style={{
      background: '#ffffff',
      borderRadius: 16,
      border: '2px solid #e5e7eb',
      marginBottom: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      height: chat.length === 0
        ? 200
        : 380, // More compact when empty in bottom-docked mode
      display: 'flex',
      flexDirection: 'column',
      transition: 'height 0.3s ease', // Smooth height transition
      order: 2
    }}>
      {/* Header with Clear Button */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '2px solid #e5e7eb',
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#1e40af', marginBottom: 2 }}>
            AI Research and Trade Strategist
          </div>
          <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>Ask me about markets, picks, or strategies</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {chat.length > 0 && (
            <button
              onClick={() => setChat([])}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 999,
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(15,23,42,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#e2e8f0'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 3px 6px rgba(15,23,42,0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#f8fafc'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.15)'
              }}
            >
              <span style={{ fontSize: 14 }}>🧹</span>
              <span>Clear chat</span>
            </button>
          )}
          {isMobile && (
            <button
              onClick={onToggleChat}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 999,
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(15,23,42,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#e2e8f0'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 3px 6px rgba(15,23,42,0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#f8fafc'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.15)'
              }}
            >
              <X size={14} />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages - Fixed height with FORCED scroll */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0, // Critical for flex scrolling
        overflow: 'hidden' // Contain scrollable child
      }}>
        <div
          ref={(el) => {
            chatMessagesRef.current = el
          }}
          style={{
            flex: '1 1 auto',
            height: '100%', // Explicit height
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            padding: '16px 20px',
            background: '#f9fafb',
            fontSize: 14,
            WebkitOverflowScrolling: 'touch'
          }}
          className="aris-chat-messages"
        >
          <style>{`
            /* Webkit browsers - Chrome, Edge, Safari */
            .aris-chat-messages::-webkit-scrollbar {
              -webkit-appearance: none !important;
              width: 14px !important;
              display: block !important;
            }
           
            .aris-chat-messages::-webkit-scrollbar-track {
              background-color: #e2e8f0 !important;
              border-radius: 8px;
              margin: 4px 0;
            }
           
            .aris-chat-messages::-webkit-scrollbar-thumb {
              background-color: #475569 !important;
              border-radius: 8px;
              border: 3px solid #e2e8f0;
              min-height: 50px !important;
              cursor: pointer;
            }
           
            .aris-chat-messages::-webkit-scrollbar-thumb:hover {
              background-color: #334155 !important;
            }
           
            .aris-chat-messages::-webkit-scrollbar-thumb:active {
              background-color: #1e293b !important;
            }
           
            /* Force scrollbar button visibility */
            .aris-chat-messages::-webkit-scrollbar-button {
              display: none;
            }
          `}</style>
          {/* Chat messages - streamlined without redundant labels */}
          {chat.length === 0 ? (
            <div style={{ padding: '8px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
              Start a conversation by asking a question below
            </div>
          ) : (
            chat.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 14
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: m.role === 'user' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#ffffff',
                  color: m.role === 'user' ? '#ffffff' : '#0f172a',
                  maxWidth: '85%',
                  lineHeight: 1.7,
                  wordBreak: 'break-word',
                  boxShadow: m.role === 'user' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                  border: m.role === 'assistant' ? '1px solid #e5e7eb' : 'none'
                }}>
                  {m.text}
                </div>
              </div>
            ))
          )}
          {chatLoading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              marginBottom: 8
            }}>
              <div style={{
                padding: '8px 12px',
                borderRadius: 999,
                background: '#e5e7eb',
                color: '#4b5563',
                fontSize: 12,
                fontStyle: 'italic'
              }}>
                Fyntrix is thinking…
              </div>
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #e5e7eb',
          background: '#ffffff',
          display: 'flex',
          gap: 10,
          paddingBottom: isMobile
            ? `calc(env(safe-area-inset-bottom) + ${chatKeyboardInset}px + 12px)`
            : undefined,
        }}>
          <input
            ref={chatInputElRef}
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && onSend()}
            placeholder="Ask Fyntrix…"
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              outline: 'none',
              transition: 'all 0.15s',
              background: '#f9fafb'
            }}
            onFocus={e => {
              e.target.style.borderColor = '#3b82f6'
              e.target.style.background = '#ffffff'
              if (isMobile) {
                try {
                  requestAnimationFrame(() => {
                    chatInputElRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                  })
                } catch { }
              }
            }}
            onBlur={e => {
              e.target.style.borderColor = '#e5e7eb'
              e.target.style.background = '#f9fafb'
            }}
          />
          <button
            onClick={onSend}
            disabled={!chatInput.trim()}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: chatInput.trim() ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#e5e7eb',
              color: chatInput.trim() ? '#ffffff' : '#94a3b8',
              border: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
              boxShadow: chatInput.trim() ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none',
              transition: 'all 0.15s',
              minWidth: 70
            }}
            onMouseEnter={e => {
              if (chatInput.trim()) {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 3px 6px rgba(59, 130, 246, 0.3)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = chatInput.trim() ? '0 2px 4px rgba(59, 130, 246, 0.2)' : 'none'
            }}
          >
            Send
          </button>
        </div>
      </div>
    </section>
  )
}
