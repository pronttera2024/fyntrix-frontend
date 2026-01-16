import React, { useState } from 'react'
import { formatIstTime } from '../../utils/time'
import { useBreakpoint } from '../../utils/responsive'

interface NewsItem {
  title: string
  url?: string
  source?: string
  description?: string
  ts?: string
}

interface NewsProps {
  news: NewsItem[]
  newsAsOf: string
  newsExpanded: boolean
  setNewsExpanded: (expanded: boolean) => void
}

const cleanNewsList = (items: any[]): any[] => {
  try {
    return items.filter((n: any) => {
      const titleRaw = (n && n.title != null ? String(n.title) : '').trim()
      const descRaw = (n && n.description != null ? String(n.description) : '').trim()
      
      const title = titleRaw.toLowerCase()
      const desc = descRaw.toLowerCase()
      
      // Filter out exchange filings and circulars
      if (title.includes('filing') || title.includes('circular') || 
          desc.includes('filing') || desc.includes('circular')) {
        return false
      }
      
      // Filter out very short titles (likely errors or incomplete)
      if (titleRaw.length < 15) {
        return false
      }
      
      // Filter out titles with too many special characters (likely garbage)
      const specialCharCount = (titleRaw.match(/[^a-zA-Z0-9\s.,-]/g) || []).length
      if (specialCharCount > titleRaw.length * 0.3) {
        return false
      }
      
      return true
    })
  } catch {
    return []
  }
}

export const News: React.FC<NewsProps> = ({
  news,
  newsAsOf,
  newsExpanded,
  setNewsExpanded
}) => {
  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === 'sm'

  return (
    <section style={{padding:12, border:'1px solid #e5e7eb', borderRadius:8, background:'#fff'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
        <div style={{fontWeight:600}}>News</div>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{fontSize:11, color:'#64748b'}}>{newsAsOf ? formatIstTime(newsAsOf) : ''}</div>
          {isMobile && (
            <button
              type="button"
              onClick={() => setNewsExpanded(!newsExpanded)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#1d4ed8',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 10,
              }}
            >
              {newsExpanded ? 'Less' : 'More'}
            </button>
          )}
        </div>
      </div>
      <div style={{maxHeight: isMobile ? (newsExpanded ? '60dvh' : 220) : 400, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, paddingRight:4}}>
        {(() => {
          const cleaned = cleanNewsList(news)
          const nonExchange = cleaned.filter((n:any) => {
            const src = String(n.source || '').toLowerCase()
            return !src.includes('nse') && !src.includes('bse')
          })
          if (!nonExchange.length) {
            return <div style={{fontSize:12, opacity:0.7}}>No news</div>
          }

          // Light diversification: avoid a wall of a single source.
          // Prefer at most 3 MoneyControl headlines and at most 2 from
          // any other single outlet in this compact rail.
          const sourceCounts: Record<string, number> = {}
          const diversified: any[] = []
          const MAX_TOTAL = 5

          for (const n of nonExchange) {
            const src = String(n.source || '')
            const lower = src.toLowerCase() || 'other'
            let cap = 2
            if (lower.includes('moneycontrol')) cap = 3

            const count = sourceCounts[lower] || 0
            if (count >= cap) continue

            diversified.push(n)
            sourceCounts[lower] = count + 1
            if (diversified.length >= MAX_TOTAL) break
          }

          const items = diversified.length ? diversified : nonExchange.slice(0, 5)

          return items.map((n:any, idx:number) => {
            const src = String(n.source || '')
            let bg = '#e5e7eb'
            let fg = '#111827'
            const lower = src.toLowerCase()
            if (lower.includes('nse')) { bg = '#e6f6ec'; fg = '#166534' }
            else if (lower.includes('yahoo')) { bg = '#eef2ff'; fg = '#3730a3' }
            else if (lower.includes('alpha')) { bg = '#fef3c7'; fg = '#92400e' }
            else if (lower.includes('finnhub')) { bg = '#f1f5f9'; fg = '#0f172a' }

            return (
              <a
                key={idx}
                href={n.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize:12,
                  lineHeight:1.3,
                  textDecoration:'none',
                  color:'inherit',
                  cursor:n.url ? 'pointer' : 'default',
                  padding:4,
                  borderRadius:4,
                  transition:'background 0.15s'
                }}
                onMouseEnter={e => { if (n.url) e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{fontWeight:500}}>
                  {n.title} {n.url && <span style={{fontSize:10, color:'#3b82f6'}}>↗</span>}
                </div>
                <div style={{color:'#64748b', marginTop:2}}>
                  <span style={{padding:'2px 6px', borderRadius:10, display:'inline-block', background:bg, color:fg}}>
                    {src}
                  </span>
                </div>
              </a>
            )
          })
        })()}
      </div>
    </section>
  )
}

export default News
