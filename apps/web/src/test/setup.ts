/**
 * Vitest global test setup.
 * Runs before every test file.
 *
 * - Extends expect() with @testing-library/jest-dom matchers
 *   (toBeInTheDocument, toHaveTextContent, toBeDisabled, etc.)
 * - Clears localStorage between tests to prevent state leakage
 */
import '@testing-library/jest-dom'

// Clean up localStorage before each test so tests are isolated
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

// Suppress noisy console.error calls in tests (e.g. React act() warnings)
// that don't affect test correctness. Use `vi.spyOn(console, 'error')` in
// individual tests if you need to assert on errors.
const originalConsoleError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    // Only suppress known React/testing-library noise
    const msg = typeof args[0] === 'string' ? args[0] : ''
    if (
      msg.includes('Warning:') ||
      msg.includes('act(') ||
      msg.includes('ReactDOM.render')
    ) return
    originalConsoleError(...args)
  }
})
afterAll(() => {
  console.error = originalConsoleError
})
