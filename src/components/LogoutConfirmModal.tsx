import React from 'react'
import { LogOut } from 'lucide-react'
import { removeAccessToken, removeIdToken, removeRefreshToken, removeTokenExpiresAt, removeUserData } from '../utils/authStorage'

interface LogoutConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
}

export default function LogoutConfirmModal({ isOpen, onClose, onLogout }: LogoutConfirmModalProps) {
  const handleLogout = () => {
    // Clear all auth data
    removeAccessToken()
    removeIdToken()
    removeRefreshToken()
    removeTokenExpiresAt()
    removeUserData()
    
    // Close modal and trigger logout callback
    onClose()
    onLogout()
  }

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 20
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: 24,
          borderBottom: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <LogOut size={24} color="#dc2626" />
          </div>
          <h3 style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#1e293b',
            margin: '0 0 8px'
          }}>
            Sign Out
          </h3>
          <p style={{
            fontSize: 14,
            color: '#64748b',
            margin: 0,
            lineHeight: 1.5
          }}>
            Are you sure you want to sign out? You'll need to log in again to access your account.
          </p>
        </div>

        {/* Actions */}
        <div style={{
          padding: 16,
          display: 'flex',
          gap: 12
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: 'white',
              color: '#374151',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f9fafb'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'white'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid #dc2626',
              background: '#dc2626',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#b91c1c'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#dc2626'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
