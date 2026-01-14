const baseUrl = import.meta.env.VITE_API_BASE_URL

// Authentication
const authUrl = `${baseUrl}/v1/auth`
export const loginUrl = `${authUrl}/login`
export const signupUrl = `${authUrl}/signup`
export const userUrl = `${authUrl}/me`
export const refreshTokenUrl = `${authUrl}/refresh`
export const validateTokenUrl = `${authUrl}/validate`