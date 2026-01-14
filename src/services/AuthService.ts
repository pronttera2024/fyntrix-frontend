import axios from "axios";
import { loginUrl, signupUrl, userUrl, refreshTokenUrl, validateTokenUrl, verifyLoginUrl, verifySignupUrl } from "../utils/urls";
import axiosInstance from "../utils/axiosInstance";
import {
  getAccessToken,
  setAccessToken,
  removeAccessToken,
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  isAuthenticated
} from "../utils/authStorage";

// Types
export interface LoginRequest {
  phone_number: string;
}

export interface LoginResponse {
  message: string;
  session: string;
  phone_number: string;
}

export interface VerifyLoginRequest {
  phone_number: string;
  otp_code: string;
  session: string;
}

export interface VerifyLoginResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface SignupRequest {
  phone_number: string;
  name: string;
}



export interface SignupResponse {
  message: string;
  phone_number: string;
  user_sub: string;
}

export interface VerifySignupRequest {
  phone_number: string;
  otp_code: string;
}

export interface VerifySignupResponse {
  message: string;
  phone_number: string;
  verified: boolean;
}

export interface User {
  user_id: string;
  phone: string;
  name: string;
  phone_verified: boolean;
}

// API Service - Pure API calls without storage logic
export class AuthAPI {

  // Login API call
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await axios.post(loginUrl, credentials, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      return response.data;
    } catch (error: any) {
      console.error('Login API error:', error);
      throw error.response?.data || {
        message: 'Login failed. Please check your credentials and try again.'
      };
    }
  }

  // Verify OTP after login
  static async verifyLogin(credentials: VerifyLoginRequest): Promise<VerifyLoginResponse> {
    try {
      const response = await axios.post(verifyLoginUrl, credentials, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      return response.data;
    } catch (error: any) {
      console.error('Verify login API error:', error);
      throw error.response?.data || {
        message: 'OTP verification failed. Please try again.'
      };
    }
  }
  
  // Signup API call
  static async signup(userData: SignupRequest): Promise<SignupResponse> {
    try {
      const response = await axios.post(signupUrl, userData, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      return response.data;
    } catch (error: any) {
      console.error('Signup API error:', error);
      throw error.response?.data || {
        message: 'Account creation failed. Please try again.'
      };
    }
  }

  // Verify OTP after signup
  static async verifySignup(credentials: VerifySignupRequest): Promise<VerifySignupResponse> {
    try {
      const response = await axios.post(verifySignupUrl, credentials, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      return response.data;
    } catch (error: any) {
      console.error('Verify signup API error:', error);
      throw error.response?.data || {
        message: 'OTP verification failed. Please try again.'
      };
    }
  }

  // Validate token with backend (optional, for future use)
  static async validateToken(): Promise<{ valid: boolean; user?: User }> {
    try {
      const response = await axiosInstance.get(validateTokenUrl);

      return response.data;
    } catch (error: any) {
      console.error('Token validation error:', error);
      return { valid: false };
    }
  }


  // Get current user info
  static async getCurrentUser(): Promise<User> {
    try {
      const response = await axiosInstance.get(userUrl);

      return response.data;
    } catch (error: any) {
      console.error('Get current user error:', error);
      throw error.response?.data || {
        message: 'Failed to fetch user information.'
      };
    }
  }
  static async refreshToken(): Promise<{ token: string }> {
    try {
      const response = await axiosInstance.post(refreshTokenUrl);

      return response.data;
    } catch (error: any) {
      console.error('Token refresh error:', error);
      throw error.response?.data || {
        message: 'Session expired. Please login again.'
      };
    }
  }
}

// Convenience functions that use the API class
export const login = (credentials: LoginRequest) => AuthAPI.login(credentials);
export const verifyLogin = (credentials: VerifyLoginRequest) => AuthAPI.verifyLogin(credentials);
export const signup = (userData: SignupRequest) => AuthAPI.signup(userData);
export const verifySignup = (credentials: VerifySignupRequest) => AuthAPI.verifySignup(credentials);
export const validateToken = () => AuthAPI.validateToken();
export const refreshToken = () => AuthAPI.refreshToken();
export const getCurrentUser = () => AuthAPI.getCurrentUser();

// Re-export storage functions from authStorage for convenience
export {
  getAccessToken as getAuthToken,
  setAccessToken as setAuthToken,
  removeAccessToken as removeAuthToken,
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  isAuthenticated
};