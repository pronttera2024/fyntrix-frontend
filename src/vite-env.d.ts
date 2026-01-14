/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_USE_LOCAL_API: string | boolean
  readonly VITE_API_BASE_URL_LOCAL: string
  readonly VITE_API_BASE_URL_PRODUCTION: string
  readonly VITE_GOOGLE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
