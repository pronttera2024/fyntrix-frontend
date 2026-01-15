import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Lock, Eye, EyeOff, TrendingUp, Shield, Zap, AlertCircle, ArrowLeft } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { FyntrixLogo } from '../../components/FyntrixLogo'
import { BRANDING } from '../../branding'
import { useLogin } from '../../hooks/useLogin'
import { useGoogleAuth } from '../../hooks/useGoogleAuth'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [showOtpField, setShowOtpField] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  
  const navigate = useNavigate()
  const {
    isLoading,
    error,
    sessionData,
    handleGenerateOtp,
    handleVerifyOtp,
    handleResendOtp,
    clearError,
    isAuthenticated
  } = useLogin()
  
  const {
    isLoading: isGoogleLoading,
    error: googleError,
    handleGoogleSuccess,
    handleGoogleError,
    clearError: clearGoogleError
  } = useGoogleAuth()

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
      setResendTimer(30) // Start 30 second timer
    }
  }, [sessionData])

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handleGenerateOtpClick = async () => {
    const fullPhoneNumber = getFullPhoneNumber(phone)
    if (!fullPhoneNumber) {
      clearError()
      return
    }
    
    clearError()
    await handleGenerateOtp(fullPhoneNumber)
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    
    clearError()
    const fullPhoneNumber = getFullPhoneNumber(phone)
    await handleResendOtp(fullPhoneNumber)
    
    // Restart timer
    if (!error) {
      setResendTimer(30)
    }
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

  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: isMobile 
        ? 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
        : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: isMobile ? 'flex-start' : 'center',
      padding: isMobile ? '0' : 20,
      position: 'relative',
      overflow: 'hidden',
      width: '100%'
    }}>
      {/* Mobile Header Bar */}

      {/* Background decorative elements - simplified for mobile */}
      {!isMobile && (
        <>
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
        </>
      )}

      <div style={{
        width: isMobile ? '100%' : '100%',
        maxWidth: isMobile ? 'none' : 420,
        background: isMobile 
          ? 'transparent'
          : 'rgba(255, 255, 255, 0.98)',
        backdropFilter: isMobile ? 'none' : 'blur(20px)',
        borderRadius: isMobile ? '0' : 24,
        padding: isMobile ? '20px 20px 30px 20px' : 40,
        boxShadow: isMobile 
          ? 'none'
          : '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        position: 'relative',
        zIndex: 1,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        {/* Logo and Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: isMobile ? 30 : 40,
          marginTop: isMobile ? 20 : 0
        }}>
          <div style={{ marginBottom: 16 }}>
            <FyntrixLogo height={56} width={160} />
          </div>
          <h1 style={{
            fontSize: isMobile ? 28 : 24,
            fontWeight: 800,
            color: isMobile ? '#1f2937' : '#1e293b',
            marginBottom: 8,
            margin: 0,
            lineHeight: 1.2
          }}>
            Welcome Back
          </h1>
          <p style={{
            fontSize: isMobile ? 16 : 14,
            color: isMobile ? 'rgba(31, 41, 55, 0.8)' : '#64748b',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: isMobile ? '280px' : 'none',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Sign in to access your AI-powered trading dashboard
          </p>
        </div>

        {/* Features - Hidden on mobile for cleaner look */}
        {!isMobile && (
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
        )}

        {/* Login Form */}
        <form onSubmit={onSubmit} style={{ marginBottom: isMobile ? 20 : 24 }}>
          {/* Error Display */}
          {error && (
            <div style={{
              marginBottom: 20,
              padding: isMobile ? '16px 20px' : '12px 16px',
              background: isMobile ? '#fef2f2' : '#fef2f2',
              border: isMobile ? '1px solid #fecaca' : '1px solid #fecaca',
              borderRadius: isMobile ? 16 : 8,
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 12 : 8
            }}>
              <AlertCircle size={isMobile ? 20 : 16} color="#dc2626" />
              <span style={{
                fontSize: isMobile ? 14 : 13,
                color: '#dc2626',
                fontWeight: 500,
                lineHeight: 1.4
              }}>
                {error}
              </span>
            </div>
          )}
          {/* Phone Number Field */}
          <div style={{ marginBottom: isMobile ? 24 : 20 }}>
            <label style={{
              display: 'block',
              fontSize: isMobile ? 16 : 13,
              fontWeight: 600,
              color: isMobile ? '#1f2937' : '#374151',
              marginBottom: isMobile ? 12 : 8
            }}>
              Phone Number
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Phone size={isMobile ? 20 : 18} color={isMobile ? 'rgba(31, 41, 55, 0.6)' : '#6b7280'} style={{
                position: 'absolute',
                left: isMobile ? 18 : 14,
                zIndex: 1
              }} />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                maxLength={10}
                required
                style={{
                  width: '100%',
                  padding: isMobile ? '16px 20px 16px 52px' : '12px 14px 12px 44px',
                  border: isMobile ? '1px solid rgba(0, 0, 0, 0.2)' : '1px solid #d1d5db',
                  color: isMobile ? '#1f2937' : '#1f2937',
                  borderRadius: isMobile ? 16 : 12,
                  fontSize: isMobile ? 16 : 14,
                  outline: 'none',
                  transition: 'all 0.2s',
                  background: isMobile ? 'rgba(0, 0, 0, 0.05)' : '#fff',
                  boxSizing: 'border-box',
                  height: isMobile ? 52 : 'auto',
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield'
                }}
                onFocus={(e) => {
                  if (isMobile) {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.target.style.borderColor = 'rgba(0, 149, 255, 0.5)'
                  } else {
                    e.target.style.borderColor = '#0095FF'
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 149, 255, 0.1)'
                  }
                }}
                onBlur={(e) => {
                  if (isMobile) {
                    e.target.style.background = 'rgba(0, 0, 0, 0.05)'
                    e.target.style.borderColor = 'rgba(0, 0, 0, 0.2)'
                  } else {
                    e.target.style.borderColor = '#d1d5db'
                    e.target.style.boxShadow = 'none'
                  }
                }}
              />
            </div>
          </div>

          {/* OTP Field - Only visible after Generate OTP is clicked */}
          {showOtpField && (
            <div style={{ marginBottom: isMobile ? 24 : 20 }}>
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
              {/* Resend OTP Button */}
              <div style={{
                marginTop: 8,
                textAlign: 'center'
              }}>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendTimer > 0 || isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendTimer > 0 ? '#9ca3af' : '#0095FF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: resendTimer > 0 || isLoading ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}

          {/* Generate OTP / Login Button */}
          <button
            type="submit"
            disabled={isLoading || phone.length !== 10 || (showOtpField && !otp)}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: isLoading || phone.length !== 10 || (showOtpField && !otp)
                ? '#94a3b8'
                : 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: isLoading || phone.length !== 10 || (showOtpField && !otp) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: isLoading || phone.length !== 10 || (showOtpField && !otp)
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

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          margin: '24px 0'
        }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>

        {/* Google Sign-In */}
        <div style={{ marginBottom: 24 }}>
          {googleError && (
            <div style={{
              marginBottom: 16,
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
                {googleError}
              </span>
            </div>
          )}
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            opacity: isGoogleLoading ? 0.6 : 1,
            pointerEvents: isGoogleLoading ? 'none' : 'auto'
          }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
              width="340"
            />
          </div>
        </div>

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