import React, { useEffect, useRef, useState } from 'react'
import { BotMessageSquare, BrushCleaning, MessageCircle, Send, Trash, X } from 'lucide-react'
import { reportError } from '../../utils/errorReporting'

import tradeGpt from '../../../assets/trade-gpt.png'

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
  const [position, setPosition] = useState({ x: window.innerWidth - 198, y: window.innerHeight - 180 })
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
        className="fixed flex items-center w-fit justify-between gap-1 px-4 transition-all duration-200"
        style={{
          left: position.x,
          top: position.y,
          // width: 120,
          height: 50,
          borderRadius: 25,
          background: 'rgb(1 158 151)',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
          cursor: isDragging ? 'grabbing' : 'grab',
          transform: isDragging ? 'scale(1.05)' : 'scale(1)'
        }}
      >
        {/* TradeGPT Icon */}
        <div className=" rounded-full">
          <img src={tradeGpt} className="w-10 h-10"/>
        </div>
        <span className="text-sm font-semibold text-white whitespace-nowrap">
          Fyntrix Strategist
        </span>
      </button>
    )
  }

  // Desktop: Show full chat OR Mobile: Show chat when opened
  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 mb-5 shadow-sm overflow-hidden flex flex-col transition-all duration-300 order-2"
      style={{
        height: chat.length === 0 ? 200 : 380
      }}
    >
      {/* Header with Clear Button */}
      <div className="px-5 py-3.5 border-b-2 border-gray-200 text-white bg-[#019e97ff] flex items-center justify-between">
        <div>
          <div className="font-bold text-lg mb-0.5">
            Fyntrix AI Strategist
          </div>
          <div className="text-xs text-slate-100 italic">Ask me about markets, trade ideas, or strategies</div>
        </div>
        <div className="flex items-center gap-2">
          {chat.length > 0 && (
            <button
              onClick={() => setChat([])}
              className="px-3.5 py-2 text-xs font-semibold rounded-full bg-slate-600 text-white cursor-pointer transition-all duration-200 shadow-sm flex items-center gap-1.5 hover:shadow-md"
            >
              <span className="text-sm">
                <BrushCleaning size={16}/>
                </span>
              <span>Clear chat</span>
            </button>
          )}
          {isMobile && (
            <button
              onClick={onToggleChat}
              className="p-2 text-xs font-semibold rounded-full border border-gray-300 bg-[#019e97ff] text-white cursor-pointer transition-all duration-200 shadow-sm flex items-center gap-1.5 hover:bg-slate-600 hover:shadow-md"
            >
              <X size={18}/>
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages - Fixed height with FORCED scroll */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div
          ref={(el) => {
            chatMessagesRef.current = el
          }}
          className="flex-1 h-full  bg-gray-50 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 bg-gray-50 text-sm aris-chat-messages"
          style={{ WebkitOverflowScrolling: 'touch' }}
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
            <div className="px-4 py-2 font-medium text-center text-slate-400 text-xs italic">
           Type your question below to get started
            </div>
          ) : (
            chat.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} mb-3.5`}>
                <div 
                  className={`px-4 py-3 rounded-xl max-w-[85%] leading-relaxed break-words ${
                    m.role === 'user' 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' 
                      : 'bg-white text-slate-900 border border-gray-200 shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
          {chatLoading && (
            <div className="flex flex-col items-start mb-2">
              <div className="px-3 py-2 rounded-full bg-gray-200 text-gray-600 text-xs italic">
                Fyntrix is thinking…
              </div>
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className={`px-4 py-3 border-t border-gray-200 bg-white flex gap-2.5 ${
          isMobile ? `pb-[calc(env(safe-area-inset-bottom)+${chatKeyboardInset}px+12px)]` : ''
        }`}>
          <input
            ref={chatInputElRef}
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && onSend()}
            placeholder="Ask Fyntrix…"
            className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm font-system outline-none transition-all duration-150 bg-gray-50 focus:border-blue-500 focus:bg-white"
            onFocus={e => {
              if (isMobile) {
                try {
                  requestAnimationFrame(() => {
                    chatInputElRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
                  })
                } catch { }
              }
            }}
          />
  

          <button
            onClick={onSend}
            disabled={!chatInput.trim()}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-150 p-2 ${
              chatInput.trim() 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm cursor-pointer hover:shadow-md' 
                : 'bg-gray-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send size={16}/>
          </button>
        </div>
      </div>
    </section>
  )
}
