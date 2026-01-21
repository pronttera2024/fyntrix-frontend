import React, { useEffect, useState } from 'react'
import { User, Lock, Phone, Eye, EyeOff, TrendingUp, Shield, Zap, Check, X, AlertCircle } from 'lucide-react'
import { FyntrixLogo } from '../../components/FyntrixLogo'
import { BRANDING } from '../../branding'
import { useNavigate } from 'react-router-dom'
import { useSignup } from '../../hooks/useSignup'
import { useGoogleAuth } from '../../hooks/useGoogleAuth'
import { GoogleLogin } from '@react-oauth/google'

export default function CreateAccount() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    otp: '',
    acceptTerms: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [resendTimer, setResendTimer] = useState(0)

  const navigate = useNavigate()
  const {
    isLoading,
    error,
    signupData,
    handleSignup,
    handleVerifySignup,
    handleResendOtp,
    clearError,
    isAuthenticated
  } = useSignup()

  const {
    isLoading: isGoogleLoading,
    error: googleError,
    handleGoogleSuccess,
    handleGoogleError,
    clearError: clearGoogleError
  } = useGoogleAuth()

  // Show OTP field when signup data is available
  const showOtpField = !!signupData

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Invalid phone number format'
    }

    if (showOtpField && !formData.otp.trim()) {
      newErrors.otp = 'OTP is required'
    } else if (showOtpField && formData.otp.length !== 6) {
      newErrors.otp = 'OTP must be 6 digits'
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const getFullPhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/^(\+91|91)?\s*/, '').replace(/\s/g, '')
    return cleanPhone ? `+91${cleanPhone}` : ''
  }

  const handleGenerateOtp = async () => {
    if (!validateForm()) {
      return
    }

    clearError()

    const fullPhoneNumber = getFullPhoneNumber(formData.phone)
    await handleSignup({
      phone_number: fullPhoneNumber,
      name: formData.name
    })

    // Start resend timer (30 seconds)
    if (!error) {
      setResendTimer(30)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!showOtpField) {
      // Generate OTP phase
      await handleGenerateOtp()
      return
    }

    // Account creation phase with OTP
    if (!validateForm()) {
      return
    }

    clearError()

    const fullPhoneNumber = getFullPhoneNumber(formData.phone)
    await handleVerifySignup(fullPhoneNumber, formData.otp)
  }

  const handleResend = async () => {
    if (resendTimer > 0) return

    clearError()
    const fullPhoneNumber = getFullPhoneNumber(formData.phone)
    await handleResendOtp(fullPhoneNumber)

    // Restart timer
    if (!error) {
      setResendTimer(30)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
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
     display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: isMobile ? 'flex-start' : 'center',
      padding: isMobile ? '0' : 20,
      position: 'relative',
      overflow: 'hidden',
      width: '100%'
    }}
    className='bg-gradient-to-br from-purple-100 to-teal-100'
    
    >
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
        maxWidth: isMobile ? 'none' : 480,
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
          marginTop: isMobile ? 20 : 0,
        }}
        className='pt-[80px] md:pt-0'
        
        >
          <div style={{ marginBottom: 16, display: 'grid', placeContent: 'center' }}>
            <FyntrixLogo height={56} width={160} />
          </div>
          <h1 style={{
            fontSize: 18,
            fontWeight: 600,
            color: isMobile ? '#1f2937' : '#1e293b',
            marginBottom: 8,
            margin: 0,
            lineHeight: 1.2
          }}>
            Get Started 
          </h1>
          <p style={{
            fontSize: isMobile ? 14 : 12,
            color: isMobile ? 'rgba(31, 41, 55, 0.8)' : '#64748b',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: isMobile ? '280px' : 'none',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Create your free account to get started
          </p>
        </div>

        {/* Features - Hidden on mobile for cleaner look */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            gap: 16,
            marginBottom: 28,
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: '#f0fdf4',
              borderRadius: 6,
              border: '1px solid #dcfce7'
            }}>
              <TrendingUp size={12} color="#16a34a" />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#16a34a' }}>AI Picks</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: '#eff6ff',
              borderRadius: 6,
              border: '1px solid #dbeafe'
            }}>
              <Shield size={12} color="#3b82f6" />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#3b82f6' }}>Secure</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: '#fef3c7',
              borderRadius: 6,
              border: '1px solid #fde68a'
            }}>
              <Zap size={12} color="#d97706" />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#d97706' }}>Real-time</span>
            </div>
          </div>
        )}

        {/* Create Account Form */}
        <form className='mt-auto' onSubmit={handleSubmit} style={{ marginBottom: isMobile ? 20 : 24 }}>
          {/* API Error Display */}
          {error && (
            <div style={{
              marginBottom: isMobile ? 16 : 20,
              padding: isMobile ? '16px 20px' : '12px 16px',
              background: isMobile ? 'rgba(220, 38, 38, 0.1)' : '#fef2f2',
              border: isMobile ? '1px solid rgba(220, 38, 38, 0.2)' : '1px solid #fecaca',
              borderRadius: isMobile ? 16 : 8,
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 12 : 8
            }}>
              <AlertCircle size={isMobile ? 20 : 16} color={isMobile ? '#fff' : '#dc2626'} />
              <span style={{
                fontSize: isMobile ? 14 : 13,
                color: isMobile ? '#fff' : '#dc2626',
                fontWeight: 500,
                lineHeight: 1.4
              }}>
                {error}
              </span>
            </div>
          )}
          {/* Name Field */}
          <div style={{ marginBottom: isMobile ? 16 : 16 }}>
            <label style={{
              display: 'block',
              fontSize: isMobile ? 12 : 13,
              color: isMobile ? '#1f2937' : '#374151',
              marginBottom: isMobile ? 4 : 8
            }}>
              Full Name
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <User size={isMobile ? 14 : 18} color={isMobile ? 'rgba(31, 41, 55, 0.6)' : '#6b7280'} style={{
                position: 'absolute',
                left: isMobile ? 18 : 14,
                zIndex: 1
              }} />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                required
                style={{
                    width: '100%',
                    padding: isMobile ? '8px 14px 8px 44px' : '12px 14px 12px 44px',
                    border: '1px solid #d1d5db',
                    color: '#6b7280',
                    borderRadius: isMobile ? 8 : 12,
                    fontSize: isMobile ? 12 : 14,
                    outline: 'none',
                    background: '#fff',
                    boxSizing: 'border-box'
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
            {errors.name && (
              <div style={{
                fontSize: 11,
                color: '#ef4444',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <X size={12} />
                {errors.name}
              </div>
            )}
          </div>

          {/* Phone Number Field */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: isMobile ? 12 : 13,
              color: isMobile ? '#1f2937' : '#374151',
              marginBottom: isMobile ? 4 : 8
            }}>
              Phone Number
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Phone size={isMobile ? 14 : 18} color={isMobile ? 'rgba(31, 41, 55, 0.6)' : '#6b7280'} style={{
                position: 'absolute',
                left: isMobile ? 18 : 14,
                zIndex: 1
              }} />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter your phone number"
                required
                 style={{
                    width: '100%',
                    padding: isMobile ? '8px 14px 8px 44px' : '12px 14px 12px 44px',
                    border: '1px solid #d1d5db',
                    color: '#6b7280',
                    borderRadius: isMobile ? 8 : 12,
                    fontSize: isMobile ? 12 : 14,
                    outline: 'none',
                    background: '#fff',
                    boxSizing: 'border-box'
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
            {errors.phone && (
              <div style={{
                fontSize: 11,
                color: '#ef4444',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <X size={12} />
                {errors.phone}
              </div>
            )}
          </div>

          {/* OTP Field - Only visible after Generate OTP is clicked */}
          {showOtpField && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                marginBottom: 12,
                padding: '12px 16px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 8,
                fontSize: 12,
                color: '#0369a1',
                lineHeight: 1.4
              }}>
                After verification, you'll be redirected to login page to access your account.
              </div>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                marginBottom: 6
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
                  value={formData.otp}
                  onChange={(e) => handleInputChange('otp', e.target.value)}
                  placeholder="Enter the 6-digit OTP"
                  maxLength={6}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 44px',
                    border: errors.otp ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: 10,
                    fontSize: 14,
                    outline: 'none',
                    background: '#fff',
                    boxSizing: 'border-box',
                    color: '#6b7280'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0095FF'
                    e.target.style.boxShadow = '0 0 0 3px rgba(0, 149, 255, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.otp ? '#ef4444' : '#d1d5db'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>
              {errors.otp && (
                <div style={{
                  fontSize: 11,
                  color: '#ef4444',
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <X size={12} />
                  {errors.otp}
                </div>
              )}
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

          {/* Terms and Conditions */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              cursor: 'pointer',
              fontSize: 13,
              color: '#374151'
            }}>
              <input
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
                style={{
                  marginTop: 3,
                  background: formData.acceptTerms ? '#0095FF' : 'white',
                  border: '2px solid #374151',
                  colorScheme: formData.acceptTerms ? 'Button' : 'none',
                }}
              />
              <span>
                I agree to the{' '}
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0095FF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Terms and Conditions
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0095FF',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Privacy Policy
                </button>
              </span>
            </label>
            {errors.acceptTerms && (
              <div style={{
                fontSize: 11,
                color: '#ef4444',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                <X size={12} />
                {errors.acceptTerms}
              </div>
            )}
          </div>

          {/* Generate OTP / Create Account Button */}
          <button
            type="submit"
            disabled={
              isLoading ||
              !formData.name ||
              !formData.phone ||
              !formData.acceptTerms ||
              (showOtpField && formData.otp.length !== 6)
            }
            style={{
              width: '100%',
              background: isLoading || !formData.name || !formData.phone || !formData.acceptTerms || (showOtpField && formData.otp.length !== 6)
                ? '#94a3b8'
                : 'linear-gradient(135deg, #0095FF 0%, #10C8A9 100%)',
              border: 'none',
              cursor: isLoading || !formData.name || !formData.phone || !formData.acceptTerms || (showOtpField && formData.otp.length !== 6) ? 'not-allowed' : 'pointer',
              boxShadow: isLoading || !formData.name || !formData.phone || !formData.acceptTerms || (showOtpField && formData.otp.length !== 6)
                ? 'none'
                : '0 4px 12px rgba(0, 149, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: isMobile ? '8px 24px' : '14px 24px',
              color: '#fff',
              borderRadius: isMobile ? 8 : 12,
              fontSize: isMobile ? 12 : 15,
              fontWeight: 700,
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  /* ... */
                  height: 16,
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '2px solid #fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                {showOtpField ? 'Verifying Account...' : 'Generating OTP...'}
              </>
            ) : (
              showOtpField ? 'Verify Account' : 'Generate OTP'
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
                containerProps={{
                style: {
                  borderRadius: '8px'
                }
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: 20,
          borderTop: '1px solid #e5e7eb',
          fontSize: 13,
          color: '#64748b'
        }}>
          <div style={{ marginBottom: 8 }}>
            Already have an account?{' '}
            <button
              onClick={() => window.history.back()}
              style={{
                background: 'none',
                border: 'none',
                color: '#0095FF',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Sign In
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