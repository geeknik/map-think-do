/**
 * 🕐 Central Interval Manager
 *
 * Provides centralized management of all intervals and timers to prevent
 * memory leaks and interval proliferation. All components should use this
 * manager instead of calling setInterval/setTimeout directly.
 *
 * Features:
 * - Centralized interval tracking
 * - Lazy initialization support
 * - Automatic cleanup on shutdown
 * - Memory-efficient interval management
 * - Configurable interval frequencies
 */

export interface IntervalConfig {
  /** Unique identifier for the interval */
  id: string;
  /** Callback function to execute */
  callback: () => void | Promise<void>;
  /** Interval in milliseconds */
  intervalMs: number;
  /** Whether to start immediately or wait for first interval */
  immediate?: boolean;
  /** Whether the interval is enabled */
  enabled?: boolean;
  /** Category for grouping intervals */
  category?: 'core' | 'optional' | 'monitoring' | 'experimental';
  /** Description for debugging */
  description?: string;
}

interface ManagedInterval {
  config: IntervalConfig;
  handle: NodeJS.Timeout | null;
  lastRun: Date | null;
  runCount: number;
  errors: number;
  isRunning: boolean;
}

/**
 * Singleton interval manager for the entire application
 */
export class IntervalManager {
  private static instance: IntervalManager;
  private intervals: Map<string, ManagedInterval> = new Map();
  private isShuttingDown: boolean = false;
  private maxConcurrentIntervals: number = 20;

  private constructor() {
    // Set up graceful shutdown handlers
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Get singleton instance
   */
  static getInstance(): IntervalManager {
    if (!IntervalManager.instance) {
      IntervalManager.instance = new IntervalManager();
    }
    return IntervalManager.instance;
  }

  /**
   * Register and optionally start an interval
   */
  register(config: IntervalConfig): void {
    if (this.isShuttingDown) {
      console.error(`⚠️ Cannot register interval ${config.id}: system is shutting down`);
      return;
    }

    // Check if we've exceeded max intervals
    const activeIntervals = this.getActiveCount();
    if (activeIntervals >= this.maxConcurrentIntervals) {
      console.error(
        `⚠️ Maximum concurrent intervals (${this.maxConcurrentIntervals}) reached. Cannot register ${config.id}`
      );
      return;
    }

    // Stop existing interval with same ID if any
    if (this.intervals.has(config.id)) {
      this.stop(config.id);
    }

    const managed: ManagedInterval = {
      config,
      handle: null,
      lastRun: null,
      runCount: 0,
      errors: 0,
      isRunning: false,
    };

    this.intervals.set(config.id, managed);

    // Start if enabled (default true)
    if (config.enabled !== false) {
      this.start(config.id);
    }

    console.error(`🕐 Interval registered: ${config.id} (${config.intervalMs}ms)`);
  }

  /**
   * Start a registered interval
   */
  start(id: string): boolean {
    const managed = this.intervals.get(id);
    if (!managed) {
      console.error(`⚠️ Interval ${id} not found`);
      return false;
    }

    if (managed.handle) {
      // Already running
      return true;
    }

    // Create wrapper that handles errors and tracks execution
    const wrappedCallback = async () => {
      if (managed.isRunning || this.isShuttingDown) {
        return; // Skip if previous execution still running or shutting down
      }

      managed.isRunning = true;
      try {
        await managed.config.callback();
        managed.lastRun = new Date();
        managed.runCount++;
      } catch (error) {
        managed.errors++;
        console.error(`❌ Interval ${id} error:`, error);

        // Auto-disable if too many errors
        if (managed.errors > 10) {
          console.error(`⚠️ Interval ${id} disabled due to excessive errors`);
          this.stop(id);
        }
      } finally {
        managed.isRunning = false;
      }
    };

    // Run immediately if configured
    if (managed.config.immediate) {
      wrappedCallback();
    }

    // Start the interval
    managed.handle = setInterval(wrappedCallback, managed.config.intervalMs);

    return true;
  }

  /**
   * Stop an interval
   */
  stop(id: string): boolean {
    const managed = this.intervals.get(id);
    if (!managed) {
      return false;
    }

    if (managed.handle) {
      clearInterval(managed.handle);
      managed.handle = null;
    }

    return true;
  }

  /**
   * Remove an interval completely
   */
  remove(id: string): boolean {
    this.stop(id);
    return this.intervals.delete(id);
  }

  /**
   * Stop all intervals in a category
   */
  stopCategory(category: IntervalConfig['category']): void {
    for (const [id, managed] of this.intervals) {
      if (managed.config.category === category) {
        this.stop(id);
      }
    }
  }

  /**
   * Start all intervals in a category
   */
  startCategory(category: IntervalConfig['category']): void {
    for (const [id, managed] of this.intervals) {
      if (managed.config.category === category) {
        this.start(id);
      }
    }
  }

  /**
   * Get count of active (running) intervals
   */
  getActiveCount(): number {
    let count = 0;
    for (const managed of this.intervals.values()) {
      if (managed.handle) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get statistics about all intervals
   */
  getStats(): {
    total: number;
    active: number;
    byCategory: Record<string, number>;
    errors: number;
    intervals: Array<{
      id: string;
      active: boolean;
      runCount: number;
      errors: number;
      intervalMs: number;
    }>;
  } {
    const byCategory: Record<string, number> = {};
    let totalErrors = 0;
    const intervalStats = [];

    for (const [id, managed] of this.intervals) {
      const category = managed.config.category || 'uncategorized';
      byCategory[category] = (byCategory[category] || 0) + 1;
      totalErrors += managed.errors;

      intervalStats.push({
        id,
        active: managed.handle !== null,
        runCount: managed.runCount,
        errors: managed.errors,
        intervalMs: managed.config.intervalMs,
      });
    }

    return {
      total: this.intervals.size,
      active: this.getActiveCount(),
      byCategory,
      errors: totalErrors,
      intervals: intervalStats,
    };
  }

  /**
   * Shutdown all intervals
   */
  shutdown(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.error('🛑 Shutting down interval manager...');

    for (const [id] of this.intervals) {
      this.stop(id);
    }

    this.intervals.clear();
    console.error('🛑 Interval manager shutdown complete');
  }

  /**
   * Check if an interval is registered
   */
  has(id: string): boolean {
    return this.intervals.has(id);
  }

  /**
   * Check if an interval is active
   */
  isActive(id: string): boolean {
    const managed = this.intervals.get(id);
    return managed?.handle !== null;
  }

  /**
   * Update interval frequency (requires restart)
   */
  updateFrequency(id: string, newIntervalMs: number): boolean {
    const managed = this.intervals.get(id);
    if (!managed) {
      return false;
    }

    const wasRunning = managed.handle !== null;
    this.stop(id);

    managed.config.intervalMs = newIntervalMs;

    if (wasRunning) {
      this.start(id);
    }

    return true;
  }

  /**
   * Set maximum concurrent intervals
   */
  setMaxConcurrentIntervals(max: number): void {
    this.maxConcurrentIntervals = max;
  }
}

// Export singleton getter
export function getIntervalManager(): IntervalManager {
  return IntervalManager.getInstance();
}
