/**
 * Centralized error handling utility for the Sentient AGI system
 */

export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  component: string;
  method: string;
  severity: ErrorSeverity;
  error: Error | unknown;
  metadata?: Record<string, unknown>;
  shouldPropagate?: boolean;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorContext[] = [];
  private readonly MAX_ERROR_LOG_SIZE = 1000;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with appropriate severity and context
   */
  handleError(context: ErrorContext): void {
    // Log the error with context
    this.logError(context);

    // Emit error event for monitoring
    this.emitErrorEvent(context);

    // Determine if error should be propagated
    if (context.shouldPropagate || context.severity === ErrorSeverity.CRITICAL) {
      throw context.error;
    }
  }

  /**
   * Log error with rotation to prevent memory issues
   */
  private logError(context: ErrorContext): void {
    // Add to error log with size limit
    this.errorLog.push({
      ...context,
      metadata: {
        ...context.metadata,
        timestamp: new Date().toISOString(),
      },
    });

    // Rotate log if too large
    if (this.errorLog.length > this.MAX_ERROR_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(-this.MAX_ERROR_LOG_SIZE);
    }

    // Console output based on severity
    const errorMessage = this.formatErrorMessage(context);

    switch (context.severity) {
      case ErrorSeverity.DEBUG:
        console.debug(errorMessage);
        break;
      case ErrorSeverity.INFO:
        console.info(errorMessage);
        break;
      case ErrorSeverity.WARNING:
        console.warn(errorMessage);
        break;
      case ErrorSeverity.ERROR:
        console.error(errorMessage);
        break;
      case ErrorSeverity.CRITICAL:
        console.error(`🚨 CRITICAL: ${errorMessage}`);
        break;
    }
  }

  /**
   * Format error message with context
   */
  private formatErrorMessage(context: ErrorContext): string {
    const error = context.error instanceof Error ? context.error : new Error(String(context.error));
    const prefix = `[${context.component}::${context.method}]`;
    const metadata = context.metadata ? ` | ${JSON.stringify(context.metadata)}` : '';

    return `${prefix} ${error.message}${metadata}`;
  }

  /**
   * Emit error event for external monitoring
   */
  private emitErrorEvent(context: ErrorContext): void {
    // This could be extended to send to external monitoring services
    // For now, we'll just track it internally
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(count: number = 10, severity?: ErrorSeverity): ErrorContext[] {
    let errors = this.errorLog;

    if (severity) {
      errors = errors.filter(e => e.severity === severity);
    }

    return errors.slice(-count);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Check if we should fail fast based on error patterns
   */
  shouldFailFast(component: string): boolean {
    const recentErrors = this.errorLog.filter(e => e.component === component).slice(-10);

    // Fail fast if too many critical errors in component
    const criticalCount = recentErrors.filter(e => e.severity === ErrorSeverity.CRITICAL).length;

    return criticalCount >= 3;
  }
}

/**
 * Convenience function for handling errors
 */
export function handleError(
  component: string,
  method: string,
  error: Error | unknown,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  metadata?: Record<string, unknown>,
  shouldPropagate?: boolean
): void {
  ErrorHandler.getInstance().handleError({
    component,
    method,
    severity,
    error,
    metadata,
    shouldPropagate,
  });
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };

/**
 * Create a successful result
 */
export function ok<T>(value: T): Result<T> {
  return { success: true, value };
}

/**
 * Create a failed result
 */
export function err<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}
