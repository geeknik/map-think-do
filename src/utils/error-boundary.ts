/**
 * Error Boundary System for Cognitive Components
 *
 * Provides graceful error handling, recovery mechanisms, and error isolation
 * to prevent cascading failures in the cognitive system.
 */

import { ErrorSeverity, ErrorHandler, handleError } from './error-handler.js';
import { CircularBuffer } from './circular-buffer.js';

export interface ErrorBoundaryConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  circuitBreakerThreshold: number;
  recoveryTimeout: number; // milliseconds
  enableFallback: boolean;
  logErrors: boolean;
}

export interface ErrorContext {
  component: string;
  method: string;
  attempt: number;
  timestamp: Date;
  input?: unknown;
}

export interface BoundaryStats {
  totalErrors: number;
  recoveredErrors: number;
  unrecoverableErrors: number;
  circuitBreakerTrips: number;
  averageRecoveryTime: number;
}

export type FallbackFunction<T> = (error: Error, context: ErrorContext) => Promise<T> | T;
export type RetryPredicate = (error: Error, attempt: number) => boolean;

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Failing fast
  HALF_OPEN = 'half-open', // Testing recovery
}

/**
 * Error boundary for protecting critical operations
 */
export class ErrorBoundary {
  private config: ErrorBoundaryConfig;
  private errorBuffer: CircularBuffer<Error>;
  private stats: BoundaryStats;
  private circuitState: CircuitState = CircuitState.CLOSED;
  private circuitOpenTime?: Date;
  private consecutiveFailures = 0;

  constructor(config: Partial<ErrorBoundaryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      recoveryTimeout: 30000,
      enableFallback: true,
      logErrors: true,
      ...config,
    };

    this.errorBuffer = new CircularBuffer<Error>(100);
    this.stats = {
      totalErrors: 0,
      recoveredErrors: 0,
      unrecoverableErrors: 0,
      circuitBreakerTrips: 0,
      averageRecoveryTime: 0,
    };
  }

  /**
   * Execute operation with error boundary protection
   */
  async execute<T>(
    operation: () => Promise<T> | T,
    context: Partial<ErrorContext>,
    fallback?: FallbackFunction<T>,
    retryPredicate?: RetryPredicate
  ): Promise<T> {
    const fullContext: ErrorContext = {
      component: 'unknown',
      method: 'unknown',
      attempt: 1,
      timestamp: new Date(),
      ...context,
    };

    // Check circuit breaker
    if (this.circuitState === CircuitState.OPEN) {
      if (this.shouldAttemptRecovery()) {
        this.circuitState = CircuitState.HALF_OPEN;
      } else {
        const error = new Error(
          `Circuit breaker is OPEN for ${fullContext.component}::${fullContext.method}`
        );
        return this.handleFallback(error, fullContext, fallback);
      }
    }

    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        fullContext.attempt = attempt;
        const result = await operation();

        // Success - reset circuit breaker
        this.onSuccess();

        if (attempt > 1) {
          this.stats.recoveredErrors++;
          this.stats.averageRecoveryTime = this.updateAverageRecoveryTime(Date.now() - startTime);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        this.stats.totalErrors++;

        if (this.config.logErrors) {
          handleError(
            fullContext.component,
            fullContext.method,
            error,
            ErrorSeverity.WARNING,
            { attempt, maxRetries: this.config.maxRetries },
            false
          );
        }

        // Check if we should retry
        if (
          attempt < this.config.maxRetries &&
          this.shouldRetry(lastError, attempt, retryPredicate)
        ) {
          await this.delay(this.config.retryDelay * attempt); // Exponential backoff
          continue;
        }

        // Max retries reached or non-retryable error
        break;
      }
    }

    // All retries failed
    this.onFailure(lastError!);
    return this.handleFallback(lastError!, fullContext, fallback);
  }

  /**
   * Execute operation with timeout protection
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T> | T,
    timeoutMs: number,
    context: Partial<ErrorContext>,
    fallback?: FallbackFunction<T>
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([this.execute(operation, context, fallback), timeoutPromise]);
    } catch (error) {
      return this.handleFallback(error as Error, context as ErrorContext, fallback);
    }
  }

  /**
   * Batch execute multiple operations with individual error boundaries
   */
  async executeBatch<T>(
    operations: Array<{
      operation: () => Promise<T> | T;
      context: Partial<ErrorContext>;
      fallback?: FallbackFunction<T>;
    }>,
    options: {
      continueOnError?: boolean;
      maxConcurrent?: number;
    } = {}
  ): Promise<Array<T | Error>> {
    const { continueOnError = true, maxConcurrent = 5 } = options;
    const results: Array<T | Error> = [];

    // Process in batches to limit concurrency
    for (let i = 0; i < operations.length; i += maxConcurrent) {
      const batch = operations.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async ({ operation, context, fallback }) => {
        try {
          return await this.execute(operation, context, fallback);
        } catch (error) {
          if (!continueOnError) {
            throw error;
          }
          return error as Error;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push(result.reason);
          if (!continueOnError) {
            return results;
          }
        }
      }
    }

    return results;
  }

  /**
   * Get error boundary statistics
   */
  getStats(): BoundaryStats & {
    circuitState: CircuitState;
    recentErrors: Error[];
    errorRate: number;
  } {
    const recentErrors = this.errorBuffer.getRecent(10);
    const errorRate =
      this.stats.totalErrors > 0
        ? (this.stats.unrecoverableErrors / this.stats.totalErrors) * 100
        : 0;

    return {
      ...this.stats,
      circuitState: this.circuitState,
      recentErrors,
      errorRate,
    };
  }

  /**
   * Reset error boundary state
   */
  reset(): void {
    this.circuitState = CircuitState.CLOSED;
    this.circuitOpenTime = undefined;
    this.consecutiveFailures = 0;
    this.errorBuffer.clear();
    this.stats = {
      totalErrors: 0,
      recoveredErrors: 0,
      unrecoverableErrors: 0,
      circuitBreakerTrips: 0,
      averageRecoveryTime: 0,
    };
  }

  // Private methods

  private shouldRetry(error: Error, attempt: number, retryPredicate?: RetryPredicate): boolean {
    if (retryPredicate) {
      return retryPredicate(error, attempt);
    }

    // Default retry logic - don't retry on certain error types
    const nonRetryableErrors = [
      'ValidationError',
      'AuthenticationError',
      'AuthorizationError',
      'NotFoundError',
    ];

    return !nonRetryableErrors.some(type => error.message.includes(type));
  }

  private async handleFallback<T>(
    error: Error,
    context: ErrorContext,
    fallback?: FallbackFunction<T>
  ): Promise<T> {
    this.errorBuffer.push(error);

    if (fallback && this.config.enableFallback) {
      try {
        return await fallback(error, context);
      } catch (fallbackError) {
        // Fallback also failed
        handleError(
          context.component,
          context.method,
          fallbackError,
          ErrorSeverity.CRITICAL,
          { originalError: error.message },
          true
        );
        throw fallbackError;
      }
    }

    // No fallback available or fallback disabled
    this.stats.unrecoverableErrors++;
    throw error;
  }

  private onSuccess(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.circuitState = CircuitState.CLOSED;
    }
    this.consecutiveFailures = 0;
  }

  private onFailure(error: Error): void {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      this.circuitState = CircuitState.OPEN;
      this.circuitOpenTime = new Date();
      this.stats.circuitBreakerTrips++;
    }
  }

  private shouldAttemptRecovery(): boolean {
    if (!this.circuitOpenTime) return false;

    const timeSinceOpen = Date.now() - this.circuitOpenTime.getTime();
    return timeSinceOpen >= this.config.recoveryTimeout;
  }

  private updateAverageRecoveryTime(recoveryTime: number): number {
    const currentAverage = this.stats.averageRecoveryTime;
    const recoveredCount = this.stats.recoveredErrors;

    return (currentAverage * (recoveredCount - 1) + recoveryTime) / recoveredCount;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory for creating specialized error boundaries
 */
export class ErrorBoundaryFactory {
  /**
   * Create error boundary for cognitive plugins
   */
  static createPluginBoundary(): ErrorBoundary {
    return new ErrorBoundary({
      maxRetries: 2,
      retryDelay: 500,
      circuitBreakerThreshold: 3,
      recoveryTimeout: 15000,
      enableFallback: true,
    });
  }

  /**
   * Create error boundary for memory operations
   */
  static createMemoryBoundary(): ErrorBoundary {
    return new ErrorBoundary({
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      recoveryTimeout: 30000,
      enableFallback: true,
    });
  }

  /**
   * Create error boundary for external integrations
   */
  static createExternalBoundary(): ErrorBoundary {
    return new ErrorBoundary({
      maxRetries: 5,
      retryDelay: 2000,
      circuitBreakerThreshold: 10,
      recoveryTimeout: 60000,
      enableFallback: true,
    });
  }

  /**
   * Create error boundary for critical operations
   */
  static createCriticalBoundary(): ErrorBoundary {
    return new ErrorBoundary({
      maxRetries: 1,
      retryDelay: 100,
      circuitBreakerThreshold: 1,
      recoveryTimeout: 5000,
      enableFallback: false, // Fail fast for critical operations
    });
  }
}

/**
 * Decorator for automatic error boundary wrapping
 */
export function withErrorBoundary<T extends (...args: any[]) => any>(
  boundary: ErrorBoundary,
  component: string,
  fallback?: FallbackFunction<ReturnType<T>>
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: Parameters<T>): Promise<ReturnType<T>> {
      return boundary.execute(
        () => originalMethod.apply(this, args),
        { component, method: propertyKey, input: args },
        fallback
      );
    };

    return descriptor;
  };
}

/**
 * Global error boundary for unhandled errors
 */
export class GlobalErrorBoundary {
  private static instance: GlobalErrorBoundary;
  private boundary: ErrorBoundary;

  private constructor() {
    this.boundary = new ErrorBoundary({
      maxRetries: 0, // Don't retry global errors
      enableFallback: false,
      logErrors: true,
    });

    this.setupGlobalHandlers();
  }

  static getInstance(): GlobalErrorBoundary {
    if (!GlobalErrorBoundary.instance) {
      GlobalErrorBoundary.instance = new GlobalErrorBoundary();
    }
    return GlobalErrorBoundary.instance;
  }

  private setupGlobalHandlers(): void {
    process.on('uncaughtException', (error: Error) => {
      this.boundary
        .execute(
          () => {
            throw error;
          },
          { component: 'global', method: 'uncaughtException' }
        )
        .catch(() => {
          // Last resort - exit process
          console.error('💥 Unrecoverable error, exiting process');
          process.exit(1);
        });
    });

    process.on('unhandledRejection', (reason: unknown) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.boundary
        .execute(
          () => {
            throw error;
          },
          { component: 'global', method: 'unhandledRejection' }
        )
        .catch(() => {
          // Last resort - exit process
          console.error('💥 Unrecoverable rejection, exiting process');
          process.exit(1);
        });
    });
  }

  getStats() {
    return this.boundary.getStats();
  }
}

// Initialize global error boundary
GlobalErrorBoundary.getInstance();
