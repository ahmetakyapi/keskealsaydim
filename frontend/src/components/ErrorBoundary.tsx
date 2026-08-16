import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  /** Counts resets so a repeatedly-failing subtree stops offering "retry". */
  resetCount: number;
};

const MAX_RESETS = 2;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, resetCount: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept as console output: there is no error-reporting backend wired up.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState((state) => ({ hasError: false, resetCount: state.resetCount + 1 }));
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const canRetry = this.state.resetCount < MAX_RESETS;

    return (
      <div role="alert" className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
            <AlertTriangle className="h-7 w-7 text-danger" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Bir şeyler ters gitti</h2>
          <p className="text-sm text-muted-foreground">
            {canRetry
              ? 'Bu bölüm yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilirsiniz.'
              : 'Sorun devam ediyor. Sayfayı yenilemeyi ya da panele dönmeyi deneyin.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {canRetry ? (
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Tekrar Dene
              </button>
            ) : (
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Sayfayı Yenile
              </button>
            )}
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Panele Dön
            </a>
          </div>
        </div>
      </div>
    );
  }
}
