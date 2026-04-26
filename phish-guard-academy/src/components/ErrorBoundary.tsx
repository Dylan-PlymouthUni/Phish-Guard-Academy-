/**
 * ErrorBoundary component/module file.
 * This file defines the ErrorBoundary component, which is a React class component that catches JavaScript errors anywhere in its child component tree, logs those errors, and displays a fallback UI instead of the component tree that crashed. It also includes an ErrorFallback functional component for a lightweight error display option.
 * The ErrorBoundary component has the following responsibilities:
 * - Catching errors in the component tree using lifecycle methods.
 * - Logging error details to the console for debugging purposes.
 * - Displaying a user-friendly fallback UI when an error occurs.
 * - Providing options for users to reset the error state, reload the page, or navigate back to the home page.
 * The ErrorFallback component is a simpler alternative that can be used as a fallback UI, showing only the error message and a button to try again.
 * Both components are designed to improve the user experience by gracefully handling unexpected errors and providing clear feedback and recovery options.
 */

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from './ui/Button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/app/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-800/50 border border-red-500/30 rounded-lg p-8 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Something Went Wrong</h1>
                <p className="text-slate-400">The application encountered an unexpected error</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <h2 className="text-sm font-semibold text-red-400 mb-2">Error Details:</h2>
              <p className="text-sm text-slate-300 font-mono mb-2">
                {this.state.error?.toString()}
              </p>
              {import.meta.env.DEV && this.state.errorInfo && (
                <details className="mt-3">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                    Stack Trace (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs text-slate-400 overflow-x-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={this.handleReset}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              
              <Button
                onClick={this.handleReload}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">What you can do:</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Try refreshing the page</li>
                <li>• Clear your browser cache and cookies</li>
                <li>• Check your internet connection</li>
                <li>• Return to the home page and try again</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Lightweight error fallback component
export function ErrorFallback({ 
  error, 
  resetError 
}: { 
  error: Error
  resetError: () => void 
}) {
  return (
    <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-400 mb-1">Error</h3>
          <p className="text-sm text-slate-300 mb-3">{error.message}</p>
          <Button size="sm" onClick={resetError}>
            Try Again
          </Button>
        </div>
      </div>
    </div>
  )
}
