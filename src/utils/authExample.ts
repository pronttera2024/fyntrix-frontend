// Example of how to use the axios instance with authentication
import { login } from "../services/AuthService";
import { setAccessToken, setRefreshToken } from "./authStorage";
import axiosInstance from "./axiosInstance";

// Example login function that stores tokens and uses axios instance
export const loginUser = async (credentials: { email: string; password: string }) => {
  try {
    // Login using the AuthService
    const response = await login(credentials);
    
    // Store tokens in localStorage using authStorage utilities
    setAccessToken(response.access_token);
    setRefreshToken(response.refresh_token);
    
    // Now you can use axiosInstance for authenticated requests
    // Example: const userData = await axiosInstance.get('/v1/user/profile');
    
    return response;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Example logout function
export const logoutUser = () => {
  // Clear tokens from localStorage
  localStorage.removeItem('fyntrix_access_token');
  localStorage.removeItem('fyntrix_refresh_token');
  
  // Redirect to login page
  window.location.href = '/login';
};

// Example of making an authenticated API call
export const fetchUserProfile = async () => {
  try {
    // This will automatically include the auth token and handle refresh
    const response = await axiosInstance.get('/v1/user/profile');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    throw error;
  }
};
