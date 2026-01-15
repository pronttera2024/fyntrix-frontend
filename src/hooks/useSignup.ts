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
      // Call the verify signup API - this returns tokens
      const response: VerifySignupResponse = await verifySignup({
        phone_number,
        otp_code
      })

      // Store all tokens
      setAccessToken(response.access_token)
      setIdToken(response.id_token)
      setRefreshToken(response.refresh_token)
      setTokenExpiresAt(response.expires_in)

      // Fetch user info using the access token
      try {
        const userInfo = await getCurrentUser()
        setUserData(userInfo)
      } catch (userError) {
        console.warn('Could not fetch user info, using fallback:', userError)
        // Fallback: extract user data from ID token
        if (response.id_token) {
          try {
            const payload = JSON.parse(atob(response.id_token.split('.')[1]))
            const userData = {
              user_id: payload.sub || payload.user_id || 'unknown',
              phone: phone_number,
              name: signupData.phone_number || payload.name || '',
              phone_verified: true
            }
            setUserData(userData)
          } catch (tokenError) {
            console.warn('Could not parse ID token payload:', tokenError)
            // Final fallback: store minimal user data
            setUserData({
              user_id: signupData.user_sub || 'unknown',
              phone: phone_number,
              name: '',
              phone_verified: true
            })
          }
        }
      }

      // Clear signup data after successful verification
      setSignupData(null)

      // Redirect to main app or dashboard
      navigate('/', { replace: true })

    } catch (err: any) {
      console.error('Verify signup error:', err)
      
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
