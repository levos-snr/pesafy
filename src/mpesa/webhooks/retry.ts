/**
 * Webhook retry mechanism with exponential backoff
 * For at-least-once delivery guarantee
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  maxRetryDuration?: number; // milliseconds (30 days default)
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: Infinity,
  initialDelay: 1000, // 1 second
  maxDelay: 3600000, // 1 hour
  backoffMultiplier: 2,
  maxRetryDuration: 30 * 24 * 60 * 60 * 1000, // 30 days
};

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  attempts: number;
  error?: Error;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let delay = opts.initialDelay;
  let attempts = 0;
  const startTime = Date.now();

  while (attempts < opts.maxRetries) {
    attempts++;

    // Check if we've exceeded max retry duration
    if (Date.now() - startTime > opts.maxRetryDuration) {
      return {
        success: false,
        attempts,
        error: new Error("Max retry duration exceeded"),
      };
    }

    try {
      const data = await fn();
      return { success: true, data, attempts };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Don't retry on 4xx errors (client errors)
      if (err.message.includes("4")) {
        return { success: false, attempts, error: err };
      }

      // Wait before retrying
      if (attempts < opts.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
      }
    }
  }

  return {
    success: false,
    attempts,
    error: new Error("Max retries exceeded"),
  };
}
