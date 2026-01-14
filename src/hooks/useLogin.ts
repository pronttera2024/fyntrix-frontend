import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  login, 
  verifyLogin, 
  LoginRequest, 
  LoginResponse, 
  VerifyLoginRequest, 
  VerifyLoginResponse,
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

interface UseLoginReturn {
  isLoading: boolean
  error: string | null
  sessionData: LoginResponse | null
  handleGenerateOtp: (phone_number: string) => Promise<void>
  handleVerifyOtp: (phone_number: string, otp_code: string) => Promise<void>
  clearError: () => void
  isAuthenticated: boolean
  isTokenExpired: boolean
  logout: () => void
}

export const useLogin = (): UseLoginReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<LoginResponse | null>(null)
  const navigate = useNavigate()

  const handleGenerateOtp = useCallback(async (phone_number: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Clear any existing auth data before new login attempt
      clearAuthData()
      setSessionData(null)

      // Call the login API to generate OTP
      const response: LoginResponse = await login({ phone_number })
      
      // Store session data for OTP verification
      setSessionData(response)

    } catch (err: any) {
      console.error('OTP generation error:', err)
      
      // Handle different error types
      if (err.message) {
        setError(err.message)
      } else if (err.error) {
        setError(err.error)
      } else if (typeof err === 'string') {
        setError(err)
      } else {
        setError('Failed to generate OTP. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleVerifyOtp = useCallback(async (phone_number: string, otp_code: string): Promise<void> => {
    if (!sessionData) {
      setError('Session expired. Please request a new OTP.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Call the verify login API
      const response: VerifyLoginResponse = await verifyLogin({
        phone_number,
        otp_code,
        session: sessionData.session
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
              name: payload.name || payload.given_name || '',
              phone_verified: payload.phone_verified || false
            }
            setUserData(userData)
          } catch (tokenError) {
            console.warn('Could not parse ID token payload:', tokenError)
            // Final fallback: store minimal user data
            setUserData({
              user_id: 'unknown',
              phone: phone_number,
              name: '',
              phone_verified: false
            })
          }
        }
      }

      // Clear session data after successful login
      setSessionData(null)

      // Redirect to main app or dashboard
      navigate('/', { replace: true })

    } catch (err: any) {
      console.error('OTP verification error:', err)
      
      // Handle different error types
      if (err.message) {
        setError(err.message)
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
  }, [sessionData, navigate])

  const clearError = useCallback((): void => {
    setError(null)
  }, [])

  const logout = useCallback((): void => {
    clearAuthData()
    setSessionData(null)
    navigate('/login', { replace: true })
  }, [navigate])

  return {
    isLoading,
    error,
    sessionData,
    handleGenerateOtp,
    handleVerifyOtp,
    clearError,
    isAuthenticated: isAuthenticated(),
    isTokenExpired: isTokenExpired(),
    logout
  }
}
