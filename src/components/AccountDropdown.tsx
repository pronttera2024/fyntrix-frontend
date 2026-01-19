import React from 'react'
import { User, LogOut } from 'lucide-react'

interface AccountDropdownProps {
  isAccountDropdownOpen: boolean
  setIsAccountDropdownOpen: (open: boolean) => void
  setIsAccountOpen: (open: boolean) => void
  setIsLogoutConfirmOpen: (open: boolean) => void
  accountProfile: {
    name: string
    account_id: string
  }
}

export const AccountDropdown: React.FC<AccountDropdownProps> = ({
  isAccountDropdownOpen,
  setIsAccountDropdownOpen,
  setIsAccountOpen,
  setIsLogoutConfirmOpen,
  accountProfile
}) => {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {accountProfile.name && (
          <div
            title={accountProfile.name}
            style={{
              maxWidth: 140,
              padding: '4px 10px',
              borderRadius: 999,
              background: 'rgba(15,23,42,0.75)',
              border: '1px solid rgba(148,163,184,0.55)',
              color: '#e5e7eb',
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {accountProfile.name}
          </div>
        )}
        <button
          title={accountProfile.name ? `Account: ${accountProfile.name}` : 'Account'}
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'rgba(15,23,42,0.95)',
            border: '1px solid rgba(148,163,184,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.15s ease, transform 0.1s ease, boxShadow 0.15s ease'
          }}
          onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
          onMouseEnter={e => { 
            e.currentTarget.style.background = 'rgba(30,64,175,0.95)'; 
            e.currentTarget.style.boxShadow = '0 3px 8px rgba(37,99,235,0.5)'; 
            e.currentTarget.style.transform = 'translateY(-1px)' 
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.background = 'rgba(15,23,42,0.95)'; 
            e.currentTarget.style.boxShadow = 'none'; 
            e.currentTarget.style.transform = 'translateY(0)' 
          }}
        >
          <User size={16} color="#e5e7eb" />
        </button>
      </div>

      {/* Account Dropdown Menu */}
      {isAccountDropdownOpen && (
        <div
          data-account-dropdown="true"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: 200,
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setIsAccountDropdownOpen(false)
              setIsAccountOpen(true)
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              fontSize: 14,
              color: '#0f172a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <User size={16} color="#64748b" />
            <span>Account Details</span>
          </button>

          <div style={{ height: 1, background: '#e5e7eb' }} />

          <button
            onClick={() => {
              setIsAccountDropdownOpen(false)
              setIsLogoutConfirmOpen(true)
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              fontSize: 14,
              color: '#dc2626',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={16} color="#dc2626" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </>
  )
}
