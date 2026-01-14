import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, LoginRequest, LoginResponse, getCurrentUser } from '../services/AuthService'
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

interface UseAuthReturn {
  isLoading: boolean
  error: string | null
  handleLogin: (credentials: LoginRequest) => Promise<void>
  clearError: () => void
  isAuthenticated: boolean
  isTokenExpired: boolean
  logout: () => void
}

export const useAuth = (): UseAuthReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = useCallback(async (credentials: LoginRequest): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Clear any existing auth data before new login
      clearAuthData()

      // Call the login API
      const response: LoginResponse = await login(credentials)

      // Store all tokens
      setAccessToken(response.access_token)
      setIdToken(response.id_token)
      setRefreshToken(response.refresh_token)
      setTokenExpiresAt(response.expires_in)

      // Fetch user info using the access token
      try {
        const userInfo = await getCurrentUser(response.access_token)
        setUserData(userInfo)
      } catch (userError) {
        console.warn('Could not fetch user info, using fallback:', userError)
        // Fallback: extract user data from ID token
        if (response.id_token) {
          try {
            const payload = JSON.parse(atob(response.id_token.split('.')[1]))
            const userData = {
              user_id: payload.sub || payload.user_id || 'unknown',
              email: payload.email || credentials.email,
              name: payload.name || payload.given_name || '',
              email_verified: payload.email_verified || false
            }
            setUserData(userData)
          } catch (tokenError) {
            console.warn('Could not parse ID token payload:', tokenError)
            // Final fallback: store minimal user data
            setUserData({
              user_id: 'unknown',
              email: credentials.email,
              name: '',
              email_verified: false
            })
          }
        }
      }

      // Redirect to main app or dashboard
      navigate('/', { replace: true })

    } catch (err: any) {
      console.error('Login error:', err)
      
      // Handle different error types
      if (err.message) {
        setError(err.message)
      } else if (err.error) {
        setError(err.error)
      } else if (typeof err === 'string') {
        setError(err)
      } else {
        setError('Login failed. Please check your credentials and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  const clearError = useCallback((): void => {
    setError(null)
  }, [])

  const logout = useCallback((): void => {
    clearAuthData()
    navigate('/login', { replace: true })
  }, [navigate])

  return {
    isLoading,
    error,
    handleLogin,
    clearError,
    isAuthenticated: isAuthenticated(),
    isTokenExpired: isTokenExpired(),
    logout
  }
}