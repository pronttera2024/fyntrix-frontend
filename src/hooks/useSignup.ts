import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { signup, SignupRequest, SignupResponse } from '../services/AuthService'
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
  handleSignup: (userData: SignupRequest) => Promise<void>
  clearError: () => void
  isAuthenticated: boolean
  isTokenExpired: boolean
  logout: () => void
}

export const useSignup = (): UseSignupReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSignup = useCallback(async (userData: SignupRequest): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Clear any existing auth data before new signup
      clearAuthData()

      // Call the signup API
      const response: SignupResponse = await signup(userData)

      // Store all tokens from the nested auth object
      setAccessToken(response.auth.access_token)
      setIdToken(response.auth.id_token)
      setRefreshToken(response.auth.refresh_token)
      setTokenExpiresAt(response.auth.expires_in)

      // Store user data from the response
      const userForStorage = {
        id: response.user.user_id,
        email: response.user.email,
        name: response.user.name
      }
      setUserData(userForStorage)

      // Redirect to main app or dashboard
      navigate('/', { replace: true })

    } catch (err: any) {
      console.error('Signup error:', err)
      
      // Handle different error types
      if (err.message) {
        setError(err.message)
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
    handleSignup,
    clearError,
    isAuthenticated: isAuthenticated(),
    isTokenExpired: isTokenExpired(),
    logout
  }
}
