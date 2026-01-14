import React from 'react'

interface AgentVote {
  name: string
  icon: string
  vote: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  score: number
}

interface AgentConsensusProps {
  symbol: string
  agents: AgentVote[]
  consensus: 'bullish' | 'bearish' | 'mixed'
  consensusStrength: number
}

export const AgentConsensus: React.FC<AgentConsensusProps> = ({
  symbol,
  agents,
  consensus,
  consensusStrength
}) => {
  const getConsensusColor = () => {
    if (consensus === 'bullish') return { bg: '#dcfce7', text: '#166534', icon: '📈' }
    if (consensus === 'bearish') return { bg: '#fecaca', text: '#991b1b', icon: '📉' }
    return { bg: '#fef3c7', text: '#92400e', icon: '⚖️' }
  }

  const getVoteIcon = (vote: string) => {
    if (vote === 'bullish') return '👍'
    if (vote === 'bearish') return '👎'
    return '🤷'
  }

  const colors = getConsensusColor()
  const bullishCount = agents.filter(a => a.vote === 'bullish').length
  const bearishCount = agents.filter(a => a.vote === 'bearish').length
  const neutralCount = agents.filter(a => a.vote === 'neutral').length

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 16,
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
            🤖 Agent Consensus: {symbol}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {agents.length} scoring agents analyzed
          </div>
        </div>
        
        {/* Consensus Badge */}
        <div style={{
          background: colors.bg,
          color: colors.text,
          padding: '6px 14px',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span style={{ fontSize: 16 }}>{colors.icon}</span>
          {consensus.toUpperCase()}
          <span style={{ fontSize: 11, opacity: 0.8 }}>
            ({consensusStrength}%)
          </span>
        </div>
      </div>

      {/* Vote Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        marginBottom: 16
      }}>
        <div style={{
          background: '#dcfce7',
          padding: '8px 12px',
          borderRadius: 8,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 20, marginBottom: 2 }}>👍</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>
            {bullishCount}
          </div>
          <div style={{ fontSize: 11, color: '#166534', opacity: 0.8 }}>
            Bullish
          </div>
        </div>

        <div style={{
          background: '#fef3c7',
          padding: '8px 12px',
          borderRadius: 8,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 20, marginBottom: 2 }}>🤷</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#92400e' }}>
            {neutralCount}
          </div>
          <div style={{ fontSize: 11, color: '#92400e', opacity: 0.8 }}>
            Neutral
          </div>
        </div>

        <div style={{
          background: '#fecaca',
          padding: '8px 12px',
          borderRadius: 8,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 20, marginBottom: 2 }}>👎</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#991b1b' }}>
            {bearishCount}
          </div>
          <div style={{ fontSize: 11, color: '#991b1b', opacity: 0.8 }}>
            Bearish
          </div>
        </div>
      </div>

      {/* Individual Agent Votes */}
      <div style={{
        display: 'grid',
        gap: 8
      }}>
        {agents.map((agent, idx) => (
          <div
            key={idx}
            style={{
              background: '#f9fafb',
              padding: '10px 12px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>{agent.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  Score: {agent.score}% • Conf: {agent.confidence}%
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              {/* Confidence bar */}
              <div style={{
                width: 60,
                height: 6,
                background: '#e5e7eb',
                borderRadius: 3,
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${agent.confidence}%`,
                  height: '100%',
                  background: agent.vote === 'bullish' ? '#16a34a' : 
                             agent.vote === 'bearish' ? '#ef4444' : '#f59e0b',
                  borderRadius: 3
                }} />
              </div>

              {/* Vote icon */}
              <div style={{
                fontSize: 18,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: agent.vote === 'bullish' ? '#dcfce7' : 
                           agent.vote === 'bearish' ? '#fecaca' : '#fef3c7',
                borderRadius: 6
              }}>
                {getVoteIcon(agent.vote)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Consensus Explanation */}
      <div style={{
        marginTop: 12,
        padding: 12,
        background: colors.bg,
        borderRadius: 8,
        fontSize: 12,
        color: colors.text,
        lineHeight: 1.5
      }}>
        <strong>Analysis:</strong> {bullishCount} agents are bullish, {bearishCount} bearish, 
        and {neutralCount} neutral. Overall consensus is <strong>{consensus}</strong> with 
        {consensusStrength}% strength.
      </div>
    </div>
  )
}
