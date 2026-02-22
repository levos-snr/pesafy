import {
  Component,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import ErrorPage from "@/pages/error/ErrorPage";

// ── Types ───────────────────────────────────────────────────
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// ── Context for functional component integration ─────────────
const ErrorBoundaryContext = createContext<((error: Error) => void) | null>(
  null
);

export function useErrorBoundary() {
  const throwError = useContext(ErrorBoundaryContext);
  return (
    throwError ??
    ((e: Error) => {
      throw e;
    })
  );
}

// ── Class component ──────────────────────────────────────────
class ErrorBoundaryInner extends Component<
  ErrorBoundaryProps & { onReset: () => void },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { onReset: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to your error monitoring service here (Sentry, LogRocket, etc.)
    console.error("[ErrorBoundary]", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorPage
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }
    return this.props.children;
  }
}

// ── Functional wrapper (adds context + reset key) ────────────
export default function ErrorBoundary({
  children,
  fallback,
  onError,
}: ErrorBoundaryProps) {
  const [resetKey, setResetKey] = useState(0);
  const [throwableError, setThrowableError] = useState<Error | null>(null);

  // Rethrow errors from functional components
  if (throwableError) throw throwableError;

  const throwError = useCallback((error: Error) => {
    setThrowableError(error);
  }, []);

  return (
    <ErrorBoundaryContext.Provider value={throwError}>
      <ErrorBoundaryInner
        key={resetKey}
        fallback={fallback}
        onError={onError}
        onReset={() => {
          setThrowableError(null);
          setResetKey((k) => k + 1);
        }}
      >
        {children}
      </ErrorBoundaryInner>
    </ErrorBoundaryContext.Provider>
  );
}

// ── Lightweight section-level error boundary ─────────────────
export function SectionErrorBoundary({
  children,
  label = "section",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-destructive mb-1">
            Failed to load {label}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs text-primary underline"
          >
            Reload page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
