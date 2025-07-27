/**
 * Secure logging utility for the Sentient AGI Reasoning Server
 *
 * This utility provides secure logging capabilities with:
 * - Automatic redaction of sensitive content
 * - Content hashing for non-debug environments
 * - Raw content logging only in debug mode
 * - Configurable redaction patterns
 */

import crypto from 'crypto';
import { configManager } from './config-manager.js';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface LogContext {
  component: string;
  method: string;
  level: LogLevel;
  metadata?: Record<string, unknown>;
}

export interface SecureLogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  method: string;
  message: string;
  contentHash?: string;
  metadata?: Record<string, unknown>;
  redacted: boolean;
}

/**
 * Patterns for detecting potentially sensitive content
 */
const SENSITIVE_PATTERNS = [
  // API keys and tokens
  /\b[A-Za-z0-9]{20,}\b/g,
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone numbers
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  // Social Security Numbers
  /\b\d{3}-\d{2}-\d{4}\b/g,
  // Credit card patterns
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // IP addresses
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  // File paths that might contain usernames
  /\/(?:home|Users)\/[^\/\s]+/g,
  // Potential passwords or secrets (common patterns)
  /(?:password|passwd|secret|key|token)[\s:=]+[^\s]+/gi,
];

/**
 * Words that commonly indicate sensitive content
 */
const SENSITIVE_KEYWORDS = [
  'password',
  'secret',
  'token',
  'key',
  'credential',
  'auth',
  'private',
  'confidential',
  'classified',
  'sensitive',
];

export class SecureLogger {
  private static instance: SecureLogger;
  private logHistory: SecureLogEntry[] = [];
  private readonly MAX_LOG_HISTORY = 1000;

  private constructor() {}

  static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger();
    }
    return SecureLogger.instance;
  }

  /**
   * Log content with automatic security redaction
   */
  async logSecure(
    content: string,
    context: LogContext,
    forceRedact: boolean = false
  ): Promise<void> {
    const isDebugMode = await configManager.getValue('debug');
    const timestamp = new Date().toISOString();

    let loggedContent: string;
    let contentHash: string | undefined;
    let redacted = false;

    if (isDebugMode && !forceRedact) {
      // In debug mode, log raw content unless forced redaction
      loggedContent = content;
    } else {
      // In non-debug mode or forced redaction, redact and hash
      const redactionResult = this.redactSensitiveContent(content);
      loggedContent = redactionResult.redacted;
      contentHash = this.hashContent(content);
      redacted = true;
    }

    const logEntry: SecureLogEntry = {
      timestamp,
      level: context.level,
      component: context.component,
      method: context.method,
      message: loggedContent,
      contentHash,
      metadata: context.metadata,
      redacted,
    };

    // Add to history with rotation
    this.addToHistory(logEntry);

    // Output to console with appropriate formatting
    this.outputToConsole(logEntry);
  }

  /**
   * Redact sensitive content from text
   */
  private redactSensitiveContent(content: string): { redacted: string; foundPatterns: string[] } {
    let redacted = content;
    const foundPatterns: string[] = [];

    // Apply regex patterns
    for (const pattern of SENSITIVE_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        foundPatterns.push(...matches);
        redacted = redacted.replace(pattern, '[REDACTED]');
      }
    }

    // Check for sensitive keywords and redact surrounding context
    for (const keyword of SENSITIVE_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b[\\s:=]+[^\\s]+`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        foundPatterns.push(...matches);
        redacted = redacted.replace(regex, `${keyword}: [REDACTED]`);
      }
    }

    return { redacted, foundPatterns };
  }

  /**
   * Generate SHA-256 hash of content for tracking
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Add log entry to history with rotation
   */
  private addToHistory(entry: SecureLogEntry): void {
    this.logHistory.push(entry);

    if (this.logHistory.length > this.MAX_LOG_HISTORY) {
      this.logHistory = this.logHistory.slice(-this.MAX_LOG_HISTORY);
    }
  }

  /**
   * Output log entry to console with appropriate formatting
   */
  private outputToConsole(entry: SecureLogEntry): void {
    const prefix = `[${entry.component}::${entry.method}]`;
    const redactedFlag = entry.redacted ? ' [REDACTED]' : '';
    const hashInfo = entry.contentHash ? ` (hash: ${entry.contentHash})` : '';
    const metadata = entry.metadata ? ` | ${JSON.stringify(entry.metadata)}` : '';

    const message = `${prefix}${redactedFlag} ${entry.message}${hashInfo}${metadata}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`🔍 ${message}`);
        break;
      case LogLevel.INFO:
        console.info(`ℹ️  ${message}`);
        break;
      case LogLevel.WARN:
        console.warn(`⚠️  ${message}`);
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${message}`);
        break;
      case LogLevel.CRITICAL:
        console.error(`🚨 CRITICAL: ${message}`);
        break;
    }
  }

  /**
   * Log thought content with cognitive context
   */
  async logThought(
    thought: string,
    component: string,
    method: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logSecure(thought, {
      component,
      method,
      level: LogLevel.INFO,
      metadata,
    });
  }

  /**
   * Log sensitive debugging information (always redacted unless debug mode)
   */
  async logDebugSensitive(
    content: string,
    component: string,
    method: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logSecure(content, {
      component,
      method,
      level: LogLevel.DEBUG,
      metadata,
    });
  }

  /**
   * Force redaction regardless of debug mode (for highly sensitive content)
   */
  async logWithForceRedaction(
    content: string,
    component: string,
    method: string,
    level: LogLevel = LogLevel.INFO,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logSecure(
      content,
      {
        component,
        method,
        level,
        metadata,
      },
      true
    );
  }

  /**
   * Get recent log entries for analysis
   */
  getRecentLogs(count: number = 50, level?: LogLevel): SecureLogEntry[] {
    let logs = this.logHistory;

    if (level) {
      logs = logs.filter(entry => entry.level === level);
    }

    return logs.slice(-count);
  }

  /**
   * Check if content contains potentially sensitive information
   */
  containsSensitiveContent(content: string): boolean {
    // Check patterns
    for (const pattern of SENSITIVE_PATTERNS) {
      if (pattern.test(content)) {
        return true;
      }
    }

    // Check keywords
    for (const keyword of SENSITIVE_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(content)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Get logging statistics
   */
  getLoggingStats(): {
    totalEntries: number;
    redactedEntries: number;
    levelCounts: Record<LogLevel, number>;
    recentActivity: boolean;
  } {
    const levelCounts = Object.values(LogLevel).reduce(
      (acc, level) => {
        acc[level] = this.logHistory.filter(entry => entry.level === level).length;
        return acc;
      },
      {} as Record<LogLevel, number>
    );

    const recentActivity = this.logHistory.some(
      entry => Date.now() - new Date(entry.timestamp).getTime() < 60000 // 1 minute
    );

    return {
      totalEntries: this.logHistory.length,
      redactedEntries: this.logHistory.filter(entry => entry.redacted).length,
      levelCounts,
      recentActivity,
    };
  }
}

/**
 * Convenience functions for secure logging
 */
export const secureLogger = SecureLogger.getInstance();

export async function logThought(
  thought: string,
  component: string,
  method: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await secureLogger.logThought(thought, component, method, metadata);
}

export async function logDebugSensitive(
  content: string,
  component: string,
  method: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await secureLogger.logDebugSensitive(content, component, method, metadata);
}

export async function logWithRedaction(
  content: string,
  component: string,
  method: string,
  level: LogLevel = LogLevel.INFO,
  metadata?: Record<string, unknown>
): Promise<void> {
  await secureLogger.logWithForceRedaction(content, component, method, level, metadata);
}
