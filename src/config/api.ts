/**
 * API Configuration
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Export for debugging
export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  googleClientId: GOOGLE_CLIENT_ID
};
