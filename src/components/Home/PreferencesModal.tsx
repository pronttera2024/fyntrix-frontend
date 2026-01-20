import React from 'react'

interface PreferencesModalProps {
  prefsOpen: boolean
  risk: 'Aggressive' | 'Moderate' | 'Conservative'
  primaryMode: string
  availableModes: Array<{
    value: string
    display_name: string
    icon: string
    horizon: string
    description: string
  }>
  setRisk: React.Dispatch<React.SetStateAction<'Aggressive' | 'Moderate' | 'Conservative'>>
  setPrimaryMode: React.Dispatch<React.SetStateAction<string>>
  setPrefsOpen: (open: boolean) => void
  updateMemory: (data: { session_id: string; data: any }) => Promise<void>
  showPicks: boolean
  onFetchPicks: () => void
  reportError: (error: any, context: { feature: string; action: string }) => void
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  prefsOpen,
  risk,
  primaryMode,
  availableModes,
  setRisk,
  setPrimaryMode,
  setPrefsOpen,
  updateMemory,
  showPicks,
  onFetchPicks,
  reportError,
}) => {
  if (!prefsOpen) return null

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:1000}} onClick={()=>setPrefsOpen(false)}>
      <div style={{width:'min(600px, 90vw)', maxHeight:'90vh', overflowY:'auto', background:'#fff', borderRadius:16, padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
          <div>
            <div style={{fontWeight:700, fontSize:22, color:'#1e293b', marginBottom:4}}>⚙️ Trading Preferences</div>
            <div style={{fontSize:13, color:'#64748b'}}>Customize your trading strategy and risk profile</div>
          </div>
          <button onClick={()=>setPrefsOpen(false)} style={{border:'none', background:'transparent', fontSize:28, cursor:'pointer', color:'#64748b'}}>&times;</button>
        </div>

        {/* Risk Profile */}
        <div style={{marginBottom:28}}>
          <div style={{fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:12}}>Risk Profile</div>
          <div style={{fontSize:12, color:'#64748b', marginBottom:12}}>
            Choose how strict you want system to be on risk control and entry quality.
          </div>

          <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
            {( 
              [
                {
                  key: 'Conservative' as const,
                  title: 'Conservative',
                  accent: '#16a34a',
                  bullets: [
                    'Focus on higher-conviction setups; fewer but cleaner trades',
                    'Tighter risk control; avoid chasing extended moves',
                    'Smaller targets; faster profit booking; prioritizes consistency',
                    'Stricter stop-loss discipline; favors lower drawdowns',
                    'Reference Risk/Reward: ~1:1.0 to ~1:1.6',
                    'Reference volatility tolerance: ~0.8% to ~1.6% typical daily move',
                    'Example sizing: SL ~0.6%–1.0%, Target ~0.9%–1.6%',
                  ],
                },
                {
                  key: 'Moderate' as const,
                  title: 'Moderate',
                  accent: '#2563eb',
                  bullets: [
                    'Balanced trade frequency and quality',
                    'Balanced risk/reward settings and stop-loss buffers',
                    'Targets and stops sized to typical volatility',
                    'Suitable default for most users',
                    'Reference Risk/Reward: ~1:1.4 to ~1:2.2',
                    'Reference volatility tolerance: ~1.2% to ~2.5% typical daily move',
                    'Example sizing: SL ~0.9%–1.6%, Target ~1.6%–3.5%',
                  ],
                },
                {
                  key: 'Aggressive' as const,
                  title: 'Aggressive',
                  accent: '#ef4444',
                  bullets: [
                    'More opportunity-seeking; accepts higher volatility',
                    'Wider stop-loss buffers where needed; aims for larger moves',
                    'Higher target ambition; may hold longer within mode horizon',
                    'Requires comfort with deeper swings and quicker decision-making',
                    'Reference Risk/Reward: ~1:1.8 to ~1:3.0+',
                    'Reference volatility tolerance: ~2.0% to ~4.0%+ typical daily move',
                    'Example sizing: SL ~1.2%–2.5%, Target ~2.2%–6.0%+',
                  ],
                },
              ]
            ).map((p) => {
              const selected = risk === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => {
                    setRisk(p.key)
                    try { localStorage.setItem('arise_risk', p.key) } catch {}
                  }}
                  style={{
                    flex: '1 1 170px',
                    minWidth: 170,
                    textAlign: 'left',
                    padding: 14,
                    borderRadius: 12,
                    border: selected ? `2px solid ${p.accent}` : '1px solid #e5e7eb',
                    background: selected ? '#f8fafc' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
                    <div style={{fontSize:14, fontWeight:700, color:'#0f172a'}}>{p.title}</div>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: p.accent,
                        boxShadow: selected ? `0 0 0 4px ${p.accent}22` : 'none',
                      }}
                    />
                  </div>
                  <div style={{fontSize:12, color:'#475569', lineHeight:1.55}}>
                    <ul style={{margin:0, paddingLeft:18}}>
                      {p.bullets.map((b) => (
                        <li key={b} style={{marginBottom:6}}>{b}</li>
                      ))}
                    </ul>
                    <div style={{marginTop:8, fontSize:10, color:'#64748b', fontStyle:'italic'}}>
                      Reference ranges are illustrative examples; actual targets/stops vary by mode and volatility.
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Primary Trading Mode */}
        <div style={{marginBottom:28}}>
          <div style={{fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:8}}>
            Primary Trading Mode <span style={{fontSize:11, fontWeight:400, color:'#ef4444'}}>*Required</span>
          </div>
          <div style={{fontSize:12, color:'#64748b', marginBottom:12}}>
            Select ONE primary mode for focused strategy generation. This determines your trade horizon and targets.
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {availableModes
              .filter(mode => mode.value !== 'Commodity')
              .map(mode => (
              <label key={mode.value} style={{
                display:'flex',
                alignItems:'start',
                padding:12,
                border: primaryMode===mode.value ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius:10,
                background: primaryMode===mode.value ? '#eff6ff' : '#f9fafb',
                cursor:'pointer',
                transition:'all 0.2s'
              }}>
                <input
                  type="radio"
                  name="primary_mode"
                  value={mode.value}
                  checked={primaryMode === mode.value}
                  onChange={(e) => {
                    setPrimaryMode(e.target.value)
                    try{localStorage.setItem('arise_primary_mode', e.target.value)}catch{}
                  }}
                  style={{marginTop:2, marginRight:10}}
                />
                <div style={{flex:1}}>
                  <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
                    <span style={{fontSize:18}}>{mode.icon}</span>
                    <span style={{fontWeight:600, fontSize:14, color:'#1e293b'}}>{mode.display_name}</span>
                    <span style={{fontSize:11, color:'#64748b'}}>({mode.horizon})</span>
                  </div>
                  <div style={{fontSize:12, color:'#64748b', lineHeight:1.5}}>{mode.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div style={{display:'flex', gap:12}}>
          <button
            onClick={async ()=>{
              try {
                // Sync with backend
                await updateMemory({
                  session_id: 'local',
                  data: {
                    risk,
                    primary_mode: primaryMode,
                  }
                })
                setPrefsOpen(false)
                // Refresh picks if they're showing
                if (showPicks) {
                  onFetchPicks()
                }
              } catch (err) {
                reportError(err, { feature: 'preferences', action: 'save' })
                alert('Failed to save preferences. Please try again.')
              }
            }}
            style={{
              flex:1,
              padding:'10px 20px',
              borderRadius:10,
              background:'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color:'#fff',
              fontSize:14,
              fontWeight:600,
              cursor:'pointer',
              boxShadow:'0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            ✓ Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
