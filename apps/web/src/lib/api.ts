import axios from 'axios'

// API client — sends cookies (HttpOnly JWT) with every request.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15_000, // 15 second timeout — prevents infinite spinners on slow/unresponsive API
})

// Centralized error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token expired, invalid, or missing — client should redirect to login
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }

    // Surface timeout errors with a user-friendly message
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      window.dispatchEvent(
        new CustomEvent('api:timeout', {
          detail: { url: error.config?.url },
        })
      )
    }

    return Promise.reject(error)
  }
)
