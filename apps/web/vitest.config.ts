/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * vitest.config.ts — separate from vite.config.ts so test runner doesn't
 * inherit production rollup chunk settings that break jsdom.
 *
 * Run tests: npm test (or npx vitest run)
 * Watch mode: npx vitest
 * Coverage:  npx vitest run --coverage
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Use jsdom to simulate browser APIs (localStorage, document, etc.)
    environment: 'jsdom',

    // Load jest-dom matchers (toBeInTheDocument, toHaveAttribute, etc.)
    setupFiles: ['./src/test/setup.ts'],

    // Match the same pattern as the test files we have
    include: ['src/**/*.test.{ts,tsx}'],

    // Collect code coverage from src (excluding test files and type defs)
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/vite-env.d.ts'],
    },

    // Faster output — suppress unhandled promise rejection noise in CI
    globals: true,
  },
})
