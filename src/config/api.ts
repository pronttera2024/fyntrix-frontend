/**
 * API Configuration
 * Handles switching between local and production API URLs
 */

const USE_LOCAL_API = import.meta.env.VITE_USE_LOCAL_API === 'true' || import.meta.env.VITE_USE_LOCAL_API === true;

const API_BASE_URL_LOCAL = import.meta.env.VITE_API_BASE_URL_LOCAL || 'http://127.0.0.1:8000/v1';
const API_BASE_URL_PRODUCTION = import.meta.env.VITE_API_BASE_URL_PRODUCTION || '';

export const API_BASE_URL = USE_LOCAL_API ? API_BASE_URL_LOCAL : API_BASE_URL_PRODUCTION;

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Export for debugging
export const API_CONFIG = {
  useLocal: USE_LOCAL_API,
  baseUrl: API_BASE_URL,
  localUrl: API_BASE_URL_LOCAL,
  productionUrl: API_BASE_URL_PRODUCTION,
  googleClientId: GOOGLE_CLIENT_ID
};
