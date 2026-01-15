const baseUrl = import.meta.env.VITE_API_BASE_URL

// Authentication
const authUrl = `${baseUrl}/v1/auth`
export const loginUrl = `${authUrl}/phone/login`
export const verifyLoginUrl = `${authUrl}/phone/login/verify`
export const resendOtpUrl = `${authUrl}/phone/resend-otp`
export const signupUrl = `${authUrl}/phone/signup`
export const verifySignupUrl = `${authUrl}/phone/verify-signup`
export const userUrl = `${authUrl}/me`
export const refreshTokenUrl = `${authUrl}/refresh`
export const validateTokenUrl = `${authUrl}/validate`