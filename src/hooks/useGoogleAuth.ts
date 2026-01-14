import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authenticateWithGoogle, GoogleAuthResponse } from '../services/GoogleAuthService'
import {
  setAccessToken,
  setIdToken,
  setRefreshToken,
  setTokenExpiresAt,
  setUserData
} from '../utils/authStorage'

interface UseGoogleAuthReturn {
  isLoading: boolean
  error: string | null
  handleGoogleSuccess: (credentialResponse: any) => Promise<void>
  handleGoogleError: () => void
  clearError: () => void
}

export const useGoogleAuth = (): UseGoogleAuthReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleGoogleSuccess = useCallback(async (credentialResponse: any): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Get the Google ID token from the credential response
      const googleToken = credentialResponse.credential

      if (!googleToken) {
        throw new Error('No credential received from Google')
      }

      // Send the token to our backend for verification and authentication
      const response: GoogleAuthResponse = await authenticateWithGoogle(googleToken)

      // Store all tokens
      setAccessToken(response.access_token)
      setIdToken(response.id_token)
      setRefreshToken(response.refresh_token)
      setTokenExpiresAt(response.expires_in)

      // Store user data
      setUserData({
        user_id: response.user.user_id,
        email: response.user.email,
        name: response.user.name,
        email_verified: response.user.email_verified
      })

      // Redirect to main app
      navigate('/', { replace: true })

    } catch (err: any) {
      console.error('Google authentication error:', err)
      
      // Handle different error types
      if (err.message) {
        setError(err.message)
      } else if (err.error) {
        setError(err.error)
      } else if (typeof err === 'string') {
        setError(err)
      } else {
        setError('Google authentication failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  const handleGoogleError = useCallback((): void => {
    console.error('Google Sign-In failed')
    setError('Google Sign-In was cancelled or failed. Please try again.')
  }, [])

  const clearError = useCallback((): void => {
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    handleGoogleSuccess,
    handleGoogleError,
    clearError
  }
}
