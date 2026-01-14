import { User } from '../services/AuthService';

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'fyntrix_access_token',
  ID_TOKEN: 'fyntrix_id_token', 
  REFRESH_TOKEN: 'fyntrix_refresh_token',
  USER_DATA: 'fyntrix_user_data',
  REMEMBER_ME: 'fyntrix_remember_me',
  TOKEN_EXPIRES_AT: 'fyntrix_token_expires_at'
} as const;

// Access token storage utilities
export const setAccessToken = (token: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  } catch (error) {
    console.error('Failed to store access token:', error);
  }
};

export const getAccessToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
};

export const removeAccessToken = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('Failed to remove access token:', error);
  }
};

// ID token storage utilities
export const setIdToken = (token: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.ID_TOKEN, token);
  } catch (error) {
    console.error('Failed to store ID token:', error);
  }
};

export const getIdToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.ID_TOKEN);
  } catch (error) {
    console.error('Failed to get ID token:', error);
    return null;
  }
};

export const removeIdToken = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.ID_TOKEN);
  } catch (error) {
    console.error('Failed to remove ID token:', error);
  }
};

// Refresh token storage utilities
export const setRefreshToken = (token: string): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  } catch (error) {
    console.error('Failed to store refresh token:', error);
  }
};

export const getRefreshToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
};

export const removeRefreshToken = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('Failed to remove refresh token:', error);
  }
};

// Token expiration utilities
export const setTokenExpiresAt = (expiresIn: number): void => {
  try {
    const expiresAt = Date.now() + (expiresIn * 1000);
    localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString());
  } catch (error) {
    console.error('Failed to store token expiration:', error);
  }
};

export const getTokenExpiresAt = (): number | null => {
  try {
    const expiresAt = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    return expiresAt ? parseInt(expiresAt, 10) : null;
  } catch (error) {
    console.error('Failed to get token expiration:', error);
    return null;
  }
};

export const removeTokenExpiresAt = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
  } catch (error) {
    console.error('Failed to remove token expiration:', error);
  }
};

// User data storage utilities
export const setUserData = (user: User): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to store user data:', error);
  }
};

export const getUserData = (): User | null => {
  try {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
};

export const removeUserData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  } catch (error) {
    console.error('Failed to remove user data:', error);
  }
};

// Remember me utility
export const setRememberMe = (remember: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(remember));
  } catch (error) {
    console.error('Failed to store remember me:', error);
  }
};

export const getRememberMe = (): boolean => {
  try {
    const remember = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
    return remember ? JSON.parse(remember) : false;
  } catch (error) {
    console.error('Failed to get remember me:', error);
    return false;
  }
};

export const removeRememberMe = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
  } catch (error) {
    console.error('Failed to remove remember me:', error);
  }
};

// Combined auth utilities
export const isAuthenticated = (): boolean => {
  const token = getAccessToken();
  const expiresAt = getTokenExpiresAt();
  
  if (!token || !expiresAt) return false;
  
  return Date.now() < expiresAt;
};

export const clearAuthData = (): void => {
  removeAccessToken();
  removeIdToken();
  removeRefreshToken();
  removeTokenExpiresAt();
  removeUserData();
  removeRememberMe();
};

// Token validation utilities
export const isTokenExpired = (): boolean => {
  const expiresAt = getTokenExpiresAt();
  if (!expiresAt) return true;
  return Date.now() >= expiresAt;
};

export const getTokenPayload = (token: string): any => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (error) {
    console.error('Failed to parse token payload:', error);
    return null;
  }
};

// Legacy compatibility - maintain old methods for backward compatibility
export const setAuthToken = setAccessToken;
export const getAuthToken = getAccessToken;
export const removeAuthToken = removeAccessToken;

// Export storage keys for external use
export { STORAGE_KEYS };
