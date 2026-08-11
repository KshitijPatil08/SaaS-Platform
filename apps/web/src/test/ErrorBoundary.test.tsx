/**
 * ErrorBoundary.test.tsx
 *
 * Tests for the ErrorBoundary component:
 * - Renders children when no error
 * - Catches thrown render error and shows recovery card
 * - Shows error details on click
 * - Custom fallback prop respected
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../components/ErrorBoundary'

// A component that throws on demand
const BoomComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error('Test render crash')
  return <div>Rendered OK</div>
}

describe('ErrorBoundary', () => {
  it('renders children normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <BoomComponent shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Rendered OK')).toBeInTheDocument()
  })

  it('shows recovery card when a child throws', () => {
    render(
      <ErrorBoundary>
        <BoomComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/Reload Application/i)).toBeInTheDocument()
  })

  it('shows error message in technical details section', () => {
    render(
      <ErrorBoundary>
        <BoomComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    const summary = screen.getByText('Technical details')
    fireEvent.click(summary)
    expect(screen.getByText('Test render crash')).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    const CustomFallback = <div>Custom error UI</div>
    render(
      <ErrorBoundary fallback={CustomFallback}>
        <BoomComponent shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom error UI')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})
