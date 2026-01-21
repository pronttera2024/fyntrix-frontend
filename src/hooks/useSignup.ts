import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  signup, 
  verifySignup, 
  resendOtp,
  SignupRequest, 
  SignupResponse,
  VerifySignupRequest,
  VerifySignupResponse,
  ResendOtpRequest,
  getCurrentUser
} from '../services/AuthService'
import {
  setAccessToken,
  setIdToken,
  setRefreshToken,
  setTokenExpiresAt,
  setUserData,
  clearAuthData,
  isAuthenticated,
  isTokenExpired
} from '../utils/authStorage'

interface UseSignupReturn {
  isLoading: boolean
  error: string | null
  signupData: SignupResponse | null
  handleSignup: (userData: SignupRequest) => Promise<void>
  handleVerifySignup: (phone_number: string, otp_code: string) => Promise<void>
  handleResendOtp: (phone_number: string) => Promise<void>
  clearError: () => void
  isAuthenticated: boolean
  isTokenExpired: boolean
  logout: () => void
}

export const useSignup = (): UseSignupReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signupData, setSignupData] = useState<SignupResponse | null>(null)
  const navigate = useNavigate()

  const handleSignup = useCallback(async (userData: SignupRequest): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Clear any existing auth data before new signup
      clearAuthData()
      setSignupData(null)

      // Call the signup API - this sends OTP
      const response: SignupResponse = await signup(userData)
      
      // Store signup data for OTP verification
      setSignupData(response)

    } catch (err: any) {
      console.error('Signup error:', err)
      
      // Handle different error types
      if (err.message) {
        setError(err.message)
      } else if (err.detail) {
        setError(err.detail)
      } else if (err.error) {
        setError(err.error)
      } else if (typeof err === 'string') {
        setError(err)
      } else {
        setError('Account creation failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleVerifySignup = useCallback(async (phone_number: string, otp_code: string): Promise<void> => {
    if (!signupData) {
      setError('Session expired. Please sign up again.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('Starting OTP verification for:', phone_number)
      
      // Call the verify signup API - this verifies the account and returns tokens
      const response: VerifySignupResponse = await verifySignup({
        phone_number,
        otp_code
      })

      console.log('OTP verification successful:', response)

      // Clear signup data after successful verification
      setSignupData(null)

      // Use setTimeout to ensure state updates are processed before navigation
      setTimeout(() => {
        console.log('Redirecting to login page...')
        navigate('/login', { 
          replace: true,
          state: { 
            message: 'Account verified successfully! Please login to continue.',
            phone: phone_number 
          }
        })
      }, 100)

    } catch (err: any) {
      console.error('Verify signup error:', err)
      
      // Check if this is the specific 500 error that indicates success
      const errorMessage = err.message || err.detail || err.error || err
      
      // If it's the specific "Verification succeeded but failed to generate tokens" message, treat as success
      if (errorMessage && errorMessage.includes('Verification succeeded but failed to generate tokens')) {
        console.log('Treating 500 error as success and redirecting to login...')
        setSignupData(null)
        
        setTimeout(() => {
          navigate('/login', { 
            replace: true,
            state: { 
              message: 'Account verified successfully! Please login to continue.',
              phone: phone_number 
            }
          })
        }, 100)
        return
      }
      
      // Don't show token-related errors to users - filter out various token-related messages
      if (errorMessage && (
        errorMessage.includes('token') || 
        errorMessage.includes('Token') ||
        errorMessage.includes('generate')
      )) {
        setError('OTP verification failed. Please try again.')
      } else if (typeof errorMessage === 'string' && errorMessage.trim()) {
        setError(errorMessage)
      } else {
        setError('OTP verification failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [signupData, navigate])

  const handleResendOtp = useCallback(async (phone_number: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      await resendOtp({ phone_number })
      // Success - OTP resent
    } catch (err: any) {
      console.error('Resend OTP error:', err)
      
      // Handle different error types
      if (err.message) {
        setError(err.message)
      } else if (err.detail) {
        setError(err.detail)
      } else if (err.error) {
        setError(err.error)
      } else if (typeof err === 'string') {
        setError(err)
      } else {
        setError('Failed to resend OTP. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearError = useCallback((): void => {
    setError(null)
  }, [])

  const logout = useCallback((): void => {
    clearAuthData()
    setSignupData(null)
    navigate('/login', { replace: true })
  }, [navigate])

  return {
    isLoading,
    error,
    signupData,
    handleSignup,
    handleVerifySignup,
    handleResendOtp,
    clearError,
    isAuthenticated: isAuthenticated(),
    isTokenExpired: isTokenExpired(),
    logout
  }
}