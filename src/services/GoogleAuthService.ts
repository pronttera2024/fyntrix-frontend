import axios from "axios";
import { API_BASE_URL } from "../config/api";

export interface GoogleAuthRequest {
  token: string;
}

export interface GoogleAuthResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    user_id: string;
    email: string;
    name: string;
    email_verified: boolean;
  };
}

export class GoogleAuthService {
  static async authenticateWithGoogle(token: string): Promise<GoogleAuthResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}v1/auth/google`,
        { token },
        {
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Google authentication error:', error);
      throw error.response?.data || {
        message: 'Google authentication failed. Please try again.'
      };
    }
  }
}

export const authenticateWithGoogle = (token: string) => GoogleAuthService.authenticateWithGoogle(token);
