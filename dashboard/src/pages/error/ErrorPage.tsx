import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Home, RefreshCw, Zap } from "lucide-react";
import {
  isRouteErrorResponse,
  Link,
  useNavigate,
  useRouteError,
} from "react-router-dom";
import { stagger, staggerItem } from "@/lib/variants";

interface ErrorPageProps {
  /** Pass when used outside of a router error boundary (e.g. React ErrorBoundary) */
  error?: Error | null;
  resetErrorBoundary?: () => void;
}

export default function ErrorPage({
  error: propError,
  resetErrorBoundary,
}: ErrorPageProps = {}) {
  const routeError = useRouteError?.();
  const navigate = useNavigate?.();
  const shouldReduceMotion = useReducedMotion();

  // Determine details
  let statusCode = 500;
  let title = "Something went wrong";
  let description = "An unexpected error occurred. Our team has been notified.";
  let technicalMessage: string | undefined;

  if (routeError && isRouteErrorResponse(routeError)) {
    statusCode = routeError.status;
    if (routeError.status === 404) {
      title = "Page not found";
      description =
        "The page you're looking for doesn't exist or has been moved.";
    } else if (routeError.status === 403) {
      title = "Access denied";
      description = "You don't have permission to view this page.";
    }
    technicalMessage = routeError.statusText;
  } else if (propError) {
    technicalMessage = propError.message;
  } else if (routeError instanceof Error) {
    technicalMessage = routeError.message;
  }

  const handleRetry = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else if (navigate) {
      navigate(0); // reload current route
    } else {
      window.location.reload();
    }
  };

  const handleHome = () => {
    if (navigate) navigate("/");
    else window.location.href = "/";
  };

  // Glitch digits for status code
  const digits = String(statusCode).split("");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 transition-colors duration-300">
      {/* Ambient */}
      <motion.div
        animate={
          shouldReduceMotion
            ? {}
            : { scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }
        }
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-destructive/50 blur-[120px]"
      />

      <motion.div
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex flex-col items-center text-center max-w-md"
      >
        {/* Logo */}
        <motion.div
          variants={staggerItem}
          className="flex items-center gap-2 mb-10"
        >
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              Pesafy
            </span>
          </Link>
        </motion.div>

        {/* Animated status code */}
        <motion.div
          variants={staggerItem}
          className="flex items-center gap-1 mb-6"
        >
          {digits.map((d, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: -30, rotate: -15 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{
                delay: 0.1 + i * 0.08,
                type: "spring",
                stiffness: 400,
                damping: 24,
              }}
              className="font-display text-[7rem] sm:text-[9rem] font-extrabold leading-none text-foreground/10 select-none"
            >
              {d}
            </motion.span>
          ))}
        </motion.div>

        {/* Icon */}
        <motion.div
          variants={staggerItem}
          animate={
            shouldReduceMotion
              ? {}
              : {
                  y: [0, -5, 0],
                  rotate: [-2, 2, -2],
                }
          }
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20"
        >
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </motion.div>

        <motion.h1
          variants={staggerItem}
          className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3"
        >
          {title}
        </motion.h1>

        <motion.p
          variants={staggerItem}
          className="text-muted-foreground leading-relaxed mb-8"
        >
          {description}
        </motion.p>

        {/* Technical details (collapsed) */}
        {technicalMessage && (
          <motion.details
            variants={staggerItem}
            className="mb-8 w-full rounded-xl border border-border bg-muted/30 text-left"
          >
            <summary className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground select-none">
              Technical details
            </summary>
            <div className="border-t border-border px-4 py-3">
              <code className="text-xs text-muted-foreground font-mono break-all">
                {technicalMessage}
              </code>
            </div>
          </motion.details>
        )}

        {/* Actions */}
        <motion.div
          variants={staggerItem}
          className="flex flex-wrap gap-3 justify-center"
        >
          <motion.button
            type="button"
            onClick={handleRetry}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/85 shadow-lg shadow-primary/20"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </motion.button>

          <motion.button
            type="button"
            onClick={handleHome}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Home className="h-4 w-4" />
            Go home
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
