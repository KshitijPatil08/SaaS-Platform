// Multi-Currency & FX Normalization Engine

export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD'

// Exchange rates relative to 1 USD
const EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 154.5,
  CAD: 1.37,
  AUD: 1.52,
}

const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
}

export const currencyService = {
  // Converts an amount from a given currency into normalized USD cents
  convertToUsdCents(amount: number, currency: SupportedCurrency = 'USD'): number {
    const rate = EXCHANGE_RATES[currency] || 1.0
    const usdAmount = amount / rate
    return Math.round(usdAmount * 100)
  },

  // Converts USD cents to target currency amount
  convertFromUsdCents(usdCents: number, targetCurrency: SupportedCurrency = 'USD'): number {
    const rate = EXCHANGE_RATES[targetCurrency] || 1.0
    const usd = usdCents / 100
    return Math.round(usd * rate)
  },

  // Formats currency nicely (e.g. $49, €45, £38)
  formatCurrency(cents: number, currency: SupportedCurrency = 'USD'): string {
    const symbol = CURRENCY_SYMBOLS[currency] || '$'
    const value = this.convertFromUsdCents(cents, currency)
    return `${symbol}${value.toLocaleString()}`
  },

  getAllRates() {
    return EXCHANGE_RATES
  },
}
