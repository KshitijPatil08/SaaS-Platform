import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * App-level ErrorBoundary.
 * Catches any uncaught render error and shows a recovery card instead of a blank white page.
 * Supports an optional custom fallback UI.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console — wire to Sentry or similar in production
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-800/50 shadow-xl p-8 space-y-5 text-center">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-rose-50 dark:bg-rose-950/40">
                <AlertTriangle className="h-8 w-8 text-rose-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Something went wrong
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                An unexpected error occurred in the application. Your data is safe — this is a display issue only.
              </p>
              {this.state.error && (
                <details className="mt-3 text-left">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none">
                    Technical details
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-mono text-rose-600 dark:text-rose-400 overflow-auto max-h-32 whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
