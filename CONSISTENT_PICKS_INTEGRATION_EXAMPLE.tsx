/**
 * Example: How to use Consistent Rankings in Frontend
 * 
 * This shows how to integrate the new /agents/picks-consistent endpoint
 * to ensure consistent rankings when users switch between universes.
 * 
 * BENEFIT: Users will see consistent rankings - if SBIN > ICICI in BankNifty,
 * the same order is maintained when viewing Nifty 50.
 */

import { useState, useEffect } from 'react'
import { getAgentsPicksConsistent } from './api'

// Example 1: Simple Universe Selector with Consistent Rankings
export function ConsistentUniverseSelector() {
  const [selectedUniverse, setSelectedUniverse] = useState<'NIFTY50' | 'BANKNIFTY'>('NIFTY50')
  const [picksData, setPicksData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Fetch picks for BOTH universes at once (single API call)
  useEffect(() => {
    const fetchPicks = async () => {
      setLoading(true)
      try {
        const response = await getAgentsPicksConsistent({
          universes: 'NIFTY50,BANKNIFTY',  // Fetch both at once
          limit: 5,
          refresh: false  // Use 6-hour cache for performance
        })
        setPicksData(response.universes)
      } catch (error) {
        console.error('Failed to fetch consistent picks:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPicks()
  }, [])  // Fetch once on mount

  // Get picks for currently selected universe
  const currentPicks = picksData?.[selectedUniverse]?.items || []

  return (
    <div style={{ padding: 20 }}>
      <h2>Top Stock Picks</h2>
      
      {/* Universe Selector */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setSelectedUniverse('NIFTY50')}
          style={{
            padding: '10px 20px',
            marginRight: 10,
            background: selectedUniverse === 'NIFTY50' ? '#3b82f6' : '#e5e7eb',
            color: selectedUniverse === 'NIFTY50' ? 'white' : 'black',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer'
          }}
        >
          Nifty 50
        </button>
        <button
          onClick={() => setSelectedUniverse('BANKNIFTY')}
          style={{
            padding: '10px 20px',
            background: selectedUniverse === 'BANKNIFTY' ? '#3b82f6' : '#e5e7eb',
            color: selectedUniverse === 'BANKNIFTY' ? 'white' : 'black',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer'
          }}
        >
          Bank Nifty
        </button>
      </div>

      {/* Consistency Indicator */}
      {picksData && (
        <div style={{ 
          padding: 10, 
          background: '#f0fdf4', 
          border: '1px solid #86efac',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 14
        }}>
          ✅ Rankings guaranteed consistent across universes
        </div>
      )}

      {/* Picks Display */}
      {loading ? (
        <div>Loading picks...</div>
      ) : (
        <div>
          {currentPicks.map((pick: any) => (
            <div
              key={pick.symbol}
              style={{
                padding: 16,
                marginBottom: 12,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                background: 'white'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    #{pick.rank} {pick.symbol}
                  </div>
                  <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                    Score: {pick.blend_score.toFixed(1)} • {pick.confidence} Confidence
                  </div>
                </div>
                <div
                  style={{
                    padding: '6px 12px',
                    background: pick.recommendation === 'Buy' ? '#dcfce7' : '#fef3c7',
                    color: pick.recommendation === 'Buy' ? '#166534' : '#854d0e',
                    borderRadius: 6,
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  {pick.recommendation}
                </div>
              </div>

              {/* Key Findings */}
              {pick.key_findings && (
                <div style={{ marginTop: 12, fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                  {pick.key_findings}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// Example 2: Side-by-Side Comparison View
export function UniverseComparisonView() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      const response = await getAgentsPicksConsistent({
        universes: 'NIFTY50,BANKNIFTY',
        limit: 5
      })
      setData(response)
    }
    fetchData()
  }, [])

  if (!data) return <div>Loading...</div>

  const niftyPicks = data.universes.NIFTY50?.items || []
  const bankNiftyPicks = data.universes.BANKNIFTY?.items || []

  // Find common stocks
  const niftySymbols = new Set(niftyPicks.map((p: any) => p.symbol))
  const bankNiftySymbols = new Set(bankNiftyPicks.map((p: any) => p.symbol))
  const commonSymbols = [...niftySymbols].filter(s => bankNiftySymbols.has(s))

  return (
    <div style={{ padding: 20 }}>
      <h2>Universe Comparison</h2>
      
      {/* Consistency Badge */}
      <div style={{ 
        padding: 12, 
        background: '#f0fdf4', 
        border: '1px solid #86efac',
        borderRadius: 8,
        marginBottom: 20
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>✅ Consistency Guaranteed</div>
        <div style={{ fontSize: 14, color: '#166534' }}>
          All stocks use the same global score across both universes
        </div>
      </div>

      {/* Side-by-Side View */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Nifty 50 */}
        <div>
          <h3>Nifty 50 Top 5</h3>
          {niftyPicks.map((pick: any) => (
            <div key={pick.symbol} style={{ 
              padding: 12, 
              marginBottom: 8, 
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              background: commonSymbols.includes(pick.symbol) ? '#fef3c7' : 'white'
            }}>
              <div style={{ fontWeight: 600 }}>#{pick.rank} {pick.symbol}</div>
              <div style={{ fontSize: 14, color: '#64748b' }}>
                Score: {pick.blend_score.toFixed(1)}
              </div>
              {commonSymbols.includes(pick.symbol) && (
                <div style={{ fontSize: 12, color: '#854d0e', marginTop: 4 }}>
                  ⭐ Also in Bank Nifty
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bank Nifty */}
        <div>
          <h3>Bank Nifty Top 5</h3>
          {bankNiftyPicks.map((pick: any) => (
            <div key={pick.symbol} style={{ 
              padding: 12, 
              marginBottom: 8, 
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              background: commonSymbols.includes(pick.symbol) ? '#fef3c7' : 'white'
            }}>
              <div style={{ fontWeight: 600 }}>#{pick.rank} {pick.symbol}</div>
              <div style={{ fontSize: 14, color: '#64748b' }}>
                Score: {pick.blend_score.toFixed(1)}
              </div>
              {commonSymbols.includes(pick.symbol) && (
                <div style={{ fontSize: 12, color: '#854d0e', marginTop: 4 }}>
                  ⭐ Also in Nifty 50
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Common Stocks Summary */}
      {commonSymbols.length > 0 && (
        <div style={{ 
          marginTop: 20, 
          padding: 16, 
          background: '#f9fafb', 
          borderRadius: 8 
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            Common Stocks ({commonSymbols.length})
          </div>
          <div style={{ fontSize: 14, color: '#64748b' }}>
            These stocks appear in both universes with the SAME global score:
          </div>
          <div style={{ marginTop: 8 }}>
            {commonSymbols.map(symbol => {
              const niftyPick = niftyPicks.find((p: any) => p.symbol === symbol)
              const bankPick = bankNiftyPicks.find((p: any) => p.symbol === symbol)
              return (
                <div key={symbol} style={{ fontSize: 14, marginTop: 4 }}>
                  <strong>{symbol}</strong>: Score {niftyPick.blend_score.toFixed(1)} 
                  (Nifty rank #{niftyPick.rank}, Bank Nifty rank #{bankPick.rank})
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


// Example 3: Integration into Existing App.tsx
// Add this to your existing App.tsx where you have the universe selector

/*
// In your App.tsx state:
const [allUniversePicks, setAllUniversePicks] = useState<any>(null)

// Update your fetchPicks function:
const fetchConsistentPicks = async () => {
  try {
    const response = await getAgentsPicksConsistent({
      universes: 'NIFTY50,BANKNIFTY',  // Add all universes you support
      limit: 5,
      refresh: false  // Use cache for performance
    })
    setAllUniversePicks(response.universes)
  } catch (error) {
    console.error('Failed to fetch consistent picks:', error)
    // Fallback to old endpoint
    const response = await getAgentsPicks({ universe: 'NIFTY50', limit: 5 })
    setAllUniversePicks({ NIFTY50: { items: response.items } })
  }
}

// In your universe selector handler:
const handleUniverseChange = (newUniverse: string) => {
  setSelectedUniverse(newUniverse)
  // No need to re-fetch! Just use cached data
  const picks = allUniversePicks?.[newUniverse]?.items || []
  setDisplayedPicks(picks)
}

// Benefits:
// ✅ Single API call for all universes
// ✅ Instant universe switching (no loading)
// ✅ Guaranteed consistent rankings
// ✅ 6-hour cache for performance
*/


// Example 4: Refresh Button
export function RefreshPicksButton({ onRefresh }: { onRefresh: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const response = await getAgentsPicksConsistent({
        universes: 'NIFTY50,BANKNIFTY',
        limit: 5,
        refresh: true  // Force fresh analysis
      })
      onRefresh(response.universes)
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      style={{
        padding: '10px 20px',
        background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontWeight: 600
      }}
    >
      {loading ? '🔄 Refreshing...' : '🔄 Refresh All Picks'}
    </button>
  )
}
