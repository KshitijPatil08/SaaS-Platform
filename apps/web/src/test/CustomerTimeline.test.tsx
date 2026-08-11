/**
 * CustomerTimeline.test.tsx
 *
 * Tests for the CustomerTimeline component, focusing on:
 * - Empty state renders correctly
 * - Events render without throwing
 * - Collapsible payload toggle works
 */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CustomerTimeline, type TimelineEvent } from '../components/CustomerTimeline'

const makeEvent = (overrides: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id: 'evt-1',
  name: 'subscription_created',
  created_at: '2024-01-15T10:00:00Z',
  occurred_at: '2024-01-15T10:00:00Z',
  payload: null,
  ...overrides,
})

describe('CustomerTimeline', () => {
  it('renders empty state when no events', () => {
    render(<CustomerTimeline events={[]} customerName="Acme Corp" />)
    expect(screen.getByText(/No journey timeline recorded yet for Acme Corp/i)).toBeInTheDocument()
  })

  it('renders event name and label for a known event type', () => {
    const events = [makeEvent({ name: 'subscription_created' })]
    render(<CustomerTimeline events={events} customerName="Acme Corp" />)
    expect(screen.getByText(/subscription created/i)).toBeInTheDocument()
    expect(screen.getByText('MRR Expansion / Plan Upgrade')).toBeInTheDocument()
  })

  it('does not render payload toggle when payload is null', () => {
    const events = [makeEvent({ payload: null })]
    render(<CustomerTimeline events={events} customerName="Acme Corp" />)
    expect(screen.queryByText(/Show details/i)).not.toBeInTheDocument()
  })

  it('does not render payload toggle when payload has only nested objects', () => {
    const events = [makeEvent({ payload: { nested: { key: 'value' } } })]
    render(<CustomerTimeline events={events} customerName="Acme Corp" />)
    // Nested objects are filtered out — no toggle shown
    expect(screen.queryByText(/Show details/i)).not.toBeInTheDocument()
  })

  it('renders payload toggle when event has primitive payload fields', () => {
    const events = [makeEvent({
      payload: { amount: 2999, currency: 'usd', attempt_count: 1 },
    })]
    render(<CustomerTimeline events={events} customerName="Acme Corp" />)
    expect(screen.getByText(/Show details \(3 fields\)/i)).toBeInTheDocument()
  })

  it('expands and collapses payload details on toggle click', () => {
    const events = [makeEvent({
      payload: { amount: 2999, currency: 'usd' },
    })]
    render(<CustomerTimeline events={events} customerName="Acme Corp" />)

    const toggle = screen.getByText(/Show details/i)
    expect(screen.queryByText('amount')).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(toggle)
    expect(screen.getByText('amount')).toBeInTheDocument()
    expect(screen.getByText('2999')).toBeInTheDocument()
    expect(screen.getByText(/Hide details/i)).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(screen.getByText(/Hide details/i))
    expect(screen.queryByText('amount')).not.toBeInTheDocument()
  })

  it('shows correct count badge with event count', () => {
    const events = [makeEvent(), makeEvent({ id: 'evt-2', name: 'churn_event' })]
    render(<CustomerTimeline events={events} customerName="Acme Corp" />)
    expect(screen.getByText('2 recorded events')).toBeInTheDocument()
  })

  it('renders churn event with correct badge label', () => {
    const events = [makeEvent({ name: 'subscription_canceled' })]
    render(<CustomerTimeline events={events} customerName="Acme" />)
    expect(screen.getByText('MRR Contraction / Cancellation')).toBeInTheDocument()
  })
})
