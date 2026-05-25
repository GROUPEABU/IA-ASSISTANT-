import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Application-wide error boundary.
 *
 * Catches any uncaught render error in the component tree, prevents a
 * white-screen crash, and offers the user a way to recover (reload).
 *
 * React requires class components for error boundaries. This is the only
 * class component in the codebase by design.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Errors are surfaced to the console for now — wire to Sentry/etc when
    // an observability stack is provisioned.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info)
  }

  handleReload = () => {
    window.location.assign('/')
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        role="alert"
        className="min-h-[100dvh] bg-navy-900 flex items-center justify-center p-4"
      >
        <div className="glass-card max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-400/10 border border-red-400/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} className="text-red-400" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">
            An unexpected error occurred
          </h1>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            The portal encountered an error. You can reload the page.
            If the problem persists, contact your administrator.
          </p>
          <details className="text-left text-[11px] text-slate-500 bg-navy-900/60 rounded-lg p-3 mb-4">
            <summary className="cursor-pointer text-slate-400 hover:text-white">
              Technical details
            </summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words">
              {this.state.error?.message ?? String(this.state.error)}
            </pre>
          </details>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       bg-cyan-400 text-navy-900 font-semibold text-sm
                       hover:bg-cyan-300 active:scale-95 transition"
          >
            <RefreshCw size={14} />
            Reload application
          </button>
        </div>
      </div>
    )
  }
}
