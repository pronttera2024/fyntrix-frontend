import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FyntrixLogo } from '../components/FyntrixLogo'
import { BRANDING } from '../branding'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decorative elements */}
      <div style={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        background: 'radial-gradient(circle, rgba(0, 149, 255, 0.1) 0%, transparent 70%)',
        borderRadius: '50%'
      }} />
      <div style={{
        position: 'absolute',
        bottom: -150,
        left: -150,
        width: 400,
        height: 400,
        background: 'radial-gradient(circle, rgba(16, 200, 169, 0.08) 0%, transparent 70%)',
        borderRadius: '50%'
      }} />

      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        padding: 40,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        position: 'relative',
        zIndex: 1,
        textAlign: 'center'
      }}>
        {/* Logo and Header */}
        <div style={{
          marginBottom: 32
        }}>
          <div style={{ marginBottom: 16 }}>
            <FyntrixLogo fontSize={32} fontWeight={900} />
          </div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#1e293b',
            marginBottom: 8,
            margin: 0
          }}>
            404 - Page Not Found
          </h1>
          <p style={{
            fontSize: 16,
            color: '#64748b',
            margin: 0,
            lineHeight: 1.5
          }}>
            Oops! The page you're looking for doesn't exist.
          </p>
        </div>

        {/* Error Illustration */}
        <div style={{
          fontSize: 64,
          marginBottom: 32
        }}>
          🤷‍♂️
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0, 149, 255, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 149, 255, 0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 149, 255, 0.3)'
            }}
          >
            Go to Homepage
          </button>
          
          <button
            onClick={() => navigate(-1)}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'transparent',
              color: '#0095FF',
              border: '2px solid #0095FF',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(0, 149, 255, 0.05)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Go Back
          </button>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: 24,
          borderTop: '1px solid #e5e7eb',
          fontSize: 13,
          color: '#64748b'
        }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            Licensed to {BRANDING.owner}
          </div>
        </div>
      </div>
    </div>
  )
}
