const apiUrl = import.meta.env.VITE_API_URL?.trim() || '/api/apps-script'

export const appConfig = {
  apiUrl,
} as const
