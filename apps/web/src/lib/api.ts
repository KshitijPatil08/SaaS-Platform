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

// ── CSRF Token Management ──────────────────────────────────────────────────────
// csrf-csrf (double-submit cookie pattern) requires every mutating request to
// include the CSRF token as the 'x-csrf-token' header. We fetch the token once
// lazily, cache it in memory, and attach it automatically via a request
// interceptor — no manual token handling needed anywhere in the app.
let csrfToken: string | null = null

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  // Use a plain fetch (not the api instance) to avoid an interceptor loop.
  const res = await fetch(
    `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/csrf-token`,
    { credentials: 'include' }
  )
  const data = await res.json()
  csrfToken = data.csrfToken as string
  return csrfToken
}

// Attach x-csrf-token to every state-changing request automatically.
const CSRF_METHODS = new Set(['post', 'put', 'patch', 'delete'])
api.interceptors.request.use(async (config) => {
  if (config.method && CSRF_METHODS.has(config.method.toLowerCase())) {
    config.headers['x-csrf-token'] = await getCsrfToken()
  }
  return config
})

// Centralized error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 = unauthenticated (no/expired JWT) — redirect to login.
    // 403 can also be an expired/invalid CSRF token; invalidate the cache so
    // the next request fetches a fresh token instead of redirecting to login.
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    } else if (error.response?.status === 403) {
      // Invalidate cached CSRF token — it may have rotated or expired.
      csrfToken = null
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
