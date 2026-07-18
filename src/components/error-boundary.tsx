import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrapbookCard } from '@/components/scrapbook'

function ErrorFallback({
  error,
  onRetry,
}: {
  readonly error: Error | null
  readonly onRetry: () => void
}) {
  const navigate = useNavigate()

  return (
    <main className="app-canvas grid min-h-dvh place-items-center bg-background px-4 py-8 text-foreground">
      <ScrapbookCard className="w-full max-w-[420px]" tone="pink" tape>
        <div className="grid size-14 place-items-center rounded-2xl bg-card/75">
          <TriangleAlert aria-hidden="true" size={28} className="text-destructive" />
        </div>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
          OurSpace
        </p>
        <h1 className="mt-2 text-4xl font-black leading-tight">
          Ada yang error nih
        </h1>
        <p className="mt-3 text-base font-bold leading-relaxed text-muted-foreground">
          Something went wrong. Jangan panik, coba refresh aja dulu. Kalau
          masih error, balik ke Home ya.
        </p>
        {error && import.meta.env.DEV ? (
          <details className="mt-4 rounded-2xl bg-card/75 px-4 py-3">
            <summary className="text-sm font-extrabold cursor-pointer">
              Detail error
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto text-xs font-bold whitespace-pre-wrap break-words">
              {error.message}
              {error.stack ? '\n\n' + error.stack : ''}
            </pre>
          </details>
        ) : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button onClick={onRetry}>
            <RotateCcw aria-hidden="true" size={18} />
            Coba lagi
          </Button>
          <Button
            onClick={() => navigate('/', { replace: true })}
            variant="outline"
          >
            <ArrowLeft aria-hidden="true" size={18} />
            Kembali ke Home
          </Button>
        </div>
      </ScrapbookCard>
    </main>
  )
}

type ErrorBoundaryState = {
  readonly error: Error | null
  readonly hasError: boolean
}

export class ErrorBoundary extends Component<
  { readonly children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { readonly children: ReactNode }) {
    super(props)
    this.state = { error: null, hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[OurSpace ErrorBoundary]', error, info.componentStack)
    }
  }

  handleRetry = () => {
    this.setState({ error: null, hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}