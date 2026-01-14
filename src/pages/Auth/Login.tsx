import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Lock, Eye, EyeOff, TrendingUp, Shield, Zap, AlertCircle } from 'lucide-react'
import { FyntrixLogo } from '../../components/FyntrixLogo'
import { BRANDING } from '../../branding'
import { useLogin } from '../../hooks/useLogin'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [showOtpField, setShowOtpField] = useState(false)
  
  const navigate = useNavigate()
  const {
    isLoading,
    error,
    sessionData,
    handleGenerateOtp,
    handleVerifyOtp,
    clearError,
    isAuthenticated
  } = useLogin()

  // Get full phone number with +91 prefix
  const getFullPhoneNumber = (phone: string) => {
    // Remove any existing +91 prefix and spaces, then add +91
    const cleanPhone = phone.replace(/^(\+91|91)?\s*/, '').replace(/\s/g, '')
    return cleanPhone ? `+91${cleanPhone}` : ''
  }

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  // Show OTP field when session data is available
  useEffect(() => {
    if (sessionData) {
      setShowOtpField(true)
    }
  }, [sessionData])

  const handleGenerateOtpClick = async () => {
    const fullPhoneNumber = getFullPhoneNumber(phone)
    if (!fullPhoneNumber) {
      clearError()
      return
    }
    
    clearError()
    await handleGenerateOtp(fullPhoneNumber)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    if (!showOtpField) {
      // Generate OTP phase
      await handleGenerateOtpClick()
      return
    }
    
    // Login phase with OTP
    if (!otp) {
      return
    }
    
    // Verify OTP and complete login
    const fullPhoneNumber = getFullPhoneNumber(phone)
    await handleVerifyOtp(fullPhoneNumber, otp)
  }

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
        zIndex: 1
      }}>
        {/* Logo and Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: 40
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
            Welcome Back
          </h1>
          <p style={{
            fontSize: 14,
            color: '#64748b',
            margin: 0,
            lineHeight: 1.5
          }}>
            Sign in to access your AI-powered trading dashboard
          </p>
        </div>

        {/* Features */}
        <div style={{
          display: 'flex',
          gap: 16,
          marginBottom: 32,
          justifyContent: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            background: '#f0fdf4',
            borderRadius: 8,
            border: '1px solid #dcfce7'
          }}>
            <TrendingUp size={14} color="#16a34a" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>AI Picks</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            background: '#eff6ff',
            borderRadius: 8,
            border: '1px solid #dbeafe'
          }}>
            <Shield size={14} color="#3b82f6" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6' }}>Secure</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            background: '#fef3c7',
            borderRadius: 8,
            border: '1px solid #fde68a'
          }}>
            <Zap size={14} color="#d97706" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706' }}>Real-time</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={onSubmit} style={{ marginBottom: 24 }}>
          {/* Error Display */}
          {error && (
            <div style={{
              marginBottom: 20,
              padding: '12px 16px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} color="#dc2626" />
              <span style={{
                fontSize: 13,
                color: '#dc2626',
                fontWeight: 500
              }}>
                {error}
              </span>
            </div>
          )}
          {/* Phone Number Field */}
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#374151',
              marginBottom: 8
            }}>
              Phone Number
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Phone size={18} color="#6b7280" style={{
                position: 'absolute',
                left: 14,
                zIndex: 1
              }} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                maxLength={10}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 44px',
                  border: '1px solid #d1d5db',
                  color: '#6b7280',
                  borderRadius: 12,
                  fontSize: 14,
                  outline: 'none',
                  transition: 'all 0.2s',
                  background: '#fff',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0095FF'
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 149, 255, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
          </div>

          {/* OTP Field - Only visible after Generate OTP is clicked */}
          {showOtpField && (
            <div style={{ marginBottom: 28 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 8
              }}>
                Enter OTP
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Lock size={18} color="#6b7280" style={{
                  position: 'absolute',
                  left: 14,
                  zIndex: 1
                }} />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter the 6-digit OTP"
                  maxLength={6}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 44px',
                    border: '1px solid #d1d5db',
                    color: '#6b7280',
                    borderRadius: 12,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'all 0.2s',
                    background: '#fff',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0095FF'
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 149, 255, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
            </div>
          )}

          {/* Generate OTP / Login Button */}
          <button
            type="submit"
            disabled={isLoading || !phone || (showOtpField && !otp)}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: isLoading || !phone || (showOtpField && !otp)
                ? '#94a3b8'
                : 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: isLoading || !phone || (showOtpField && !otp) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: isLoading || !phone || (showOtpField && !otp)
                ? 'none'
                : '0 4px 12px rgba(0, 149, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: 16,
                  height: 16,
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                {showOtpField ? 'Signing in...' : 'Generating OTP...'}
              </>
            ) : (
              showOtpField ? 'Login Now' : 'Generate OTP'
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: 24,
          borderTop: '1px solid #e5e7eb',
          fontSize: 13,
          color: '#64748b'
        }}>
          <div style={{ marginBottom: 8 }}>
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/create-account')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0095FF',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Create Account
            </button>
          </div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            Licensed to {BRANDING.owner}
          </div>
        </div>
      </div>

      {/* Add CSS animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}