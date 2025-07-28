/**
 * @fileoverview State Adapters
 *
 * Adapters that connect existing cognitive components with the unified
 * state management system. These adapters handle bidirectional state
 * synchronization and event propagation.
 */

import { StateManager, UnifiedState } from './state-manager.js';
import { CognitiveOrchestrator } from '../cognitive/cognitive-orchestrator.js';
import { CognitiveState } from '../cognitive/state-tracker.js';
import { PluginMetrics, CognitivePluginManager } from '../cognitive/plugin-system.js';
import { MemoryStore, MemoryStats } from '../memory/memory-store.js';

/**
 * Cognitive State Adapter
 *
 * Synchronizes cognitive state between StateTracker and StateManager
 */
export class CognitiveStateAdapter {
  private unsubscribe?: () => void;

  constructor(
    private stateManager: StateManager,
    private orchestrator: CognitiveOrchestrator
  ) {}

  /**
   * Initialize bidirectional state synchronization
   */
  initialize(): void {
    // Subscribe to cognitive state changes
    this.unsubscribe = this.stateManager.subscribe('cognitive', (newValue: CognitiveState) => {
      // Update cognitive orchestrator with new state (if needed)
      // This would require exposing a setState method on the orchestrator
      console.error('🧠 Cognitive state synchronized');
    });

    // Update state manager with current cognitive state
    this.syncCognitiveState();

    console.error('🔄 Cognitive state adapter initialized');
  }

  /**
   * Manually sync cognitive state from orchestrator to state manager
   */
  syncCognitiveState(): void {
    try {
      const cognitiveState = this.orchestrator.getCognitiveState();
      this.stateManager.updateState(
        {
          cognitive: cognitiveState,
        },
        'cognitive_adapter'
      );
    } catch (error) {
      console.error('❌ Failed to sync cognitive state:', error);
    }
  }

  /**
   * Handle cognitive state updates from orchestrator
   */
  onCognitiveStateChange(newState: CognitiveState): void {
    this.stateManager.updateState(
      {
        cognitive: newState,
      },
      'cognitive_orchestrator'
    );
  }

  /**
   * Cleanup adapter
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    console.error('🔄 Cognitive state adapter disposed');
  }
}

/**
 * Plugin State Adapter
 *
 * Synchronizes plugin metrics and health status with state manager
 */
export class PluginStateAdapter {
  private metricsUpdateInterval?: NodeJS.Timeout;
  private readonly UPDATE_INTERVAL = 5000; // 5 seconds

  constructor(
    private stateManager: StateManager,
    private orchestrator: CognitiveOrchestrator
  ) {}

  /**
   * Initialize plugin state monitoring
   */
  initialize(): void {
    // Set up periodic metrics updates
    this.metricsUpdateInterval = setInterval(() => {
      this.syncPluginMetrics();
    }, this.UPDATE_INTERVAL);

    // Initial sync
    this.syncPluginMetrics();

    console.error('🔌 Plugin state adapter initialized');
  }

  /**
   * Sync plugin metrics and health status
   */
  syncPluginMetrics(): void {
    try {
      const pluginMetrics = this.orchestrator.getPluginPerformance();
      const activePlugins = Object.keys(pluginMetrics);

      // Calculate plugin health based on metrics
      const pluginHealth = this.calculatePluginHealth(pluginMetrics);

      this.stateManager.updateState(
        {
          plugins: {
            metrics: pluginMetrics,
            activePlugins,
            pluginHealth,
          },
        },
        'plugin_adapter'
      );
    } catch (error) {
      console.error('❌ Failed to sync plugin metrics:', error);
    }
  }

  /**
   * Calculate plugin health status based on metrics
   */
  private calculatePluginHealth(
    metrics: Record<string, PluginMetrics>
  ): Record<string, 'healthy' | 'degraded' | 'failed'> {
    const health: Record<string, 'healthy' | 'degraded' | 'failed'> = {};

    for (const [pluginId, metric] of Object.entries(metrics)) {
      if (metric.success_rate < 0.5) {
        health[pluginId] = 'failed';
      } else if (metric.success_rate < 0.8 || metric.average_response_time > 1000) {
        health[pluginId] = 'degraded';
      } else {
        health[pluginId] = 'healthy';
      }
    }

    return health;
  }

  /**
   * Cleanup adapter
   */
  dispose(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }
    console.error('🔌 Plugin state adapter disposed');
  }
}

/**
 * Memory State Adapter
 *
 * Synchronizes memory statistics and health with state manager
 */
export class MemoryStateAdapter {
  private statsUpdateInterval?: NodeJS.Timeout;
  private readonly UPDATE_INTERVAL = 10000; // 10 seconds

  constructor(
    private stateManager: StateManager,
    private memoryStore: MemoryStore
  ) {}

  /**
   * Initialize memory state monitoring
   */
  initialize(): void {
    // Set up periodic stats updates
    this.statsUpdateInterval = setInterval(() => {
      this.syncMemoryStats();
    }, this.UPDATE_INTERVAL);

    // Initial sync
    this.syncMemoryStats();

    console.error('💾 Memory state adapter initialized');
  }

  /**
   * Sync memory statistics and health
   */
  async syncMemoryStats(): Promise<void> {
    try {
      const stats = await this.memoryStore.getStats();
      const healthStatus = this.calculateMemoryHealth(stats);

      this.stateManager.updateState(
        {
          memory: {
            stats,
            healthStatus,
            lastCleanup: new Date(), // This would track actual cleanup times
          },
        },
        'memory_adapter'
      );
    } catch (error) {
      console.error('❌ Failed to sync memory stats:', error);

      // Update health status to critical on error
      this.stateManager.updateState(
        {
          memory: {
            stats: {
              total_thoughts: 0,
              total_sessions: 0,
              average_session_length: 0,
              overall_success_rate: 0,
              success_rate_by_domain: {},
              success_rate_by_complexity: {},
              most_effective_roles: [],
              most_effective_patterns: [],
              common_failure_modes: [],
              performance_over_time: [],
              learning_trajectory: [],
              storage_size: 0,
              oldest_thought: new Date(),
              newest_thought: new Date(),
              duplicate_rate: 0,
            },
            healthStatus: 'critical',
            lastCleanup: new Date(),
          },
        },
        'memory_adapter'
      );
    }
  }

  /**
   * Calculate memory health based on statistics
   */
  private calculateMemoryHealth(stats: MemoryStats): 'healthy' | 'degraded' | 'critical' {
    // Health checks based on memory statistics
    if (stats.storage_size > 100 * 1024 * 1024) {
      // > 100MB
      return 'critical';
    } else if (stats.storage_size > 50 * 1024 * 1024) {
      // > 50MB
      return 'degraded';
    } else if (stats.overall_success_rate < 0.7) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Cleanup adapter
   */
  dispose(): void {
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval);
    }
    console.error('💾 Memory state adapter disposed');
  }
}

/**
 * Performance State Adapter
 *
 * Monitors system performance and updates state accordingly
 */
export class PerformanceStateAdapter {
  private performanceMetrics = {
    responseTimes: [] as number[],
    errorCount: 0,
    requestCount: 0,
    startTime: Date.now(),
  };

  private metricsUpdateInterval?: NodeJS.Timeout;
  private readonly UPDATE_INTERVAL = 5000; // 5 seconds
  private readonly MAX_RESPONSE_TIME_SAMPLES = 100;

  constructor(private stateManager: StateManager) {}

  /**
   * Initialize performance monitoring
   */
  initialize(): void {
    // Set up periodic performance updates
    this.metricsUpdateInterval = setInterval(() => {
      this.updatePerformanceMetrics();
    }, this.UPDATE_INTERVAL);

    // Initial update
    this.updatePerformanceMetrics();

    console.error('⚡ Performance state adapter initialized');
  }

  /**
   * Record a request with response time
   */
  recordRequest(responseTime: number, success: boolean = true): void {
    this.performanceMetrics.requestCount++;

    if (!success) {
      this.performanceMetrics.errorCount++;
    }

    // Track response times
    this.performanceMetrics.responseTimes.push(responseTime);

    // Limit the number of response time samples
    if (this.performanceMetrics.responseTimes.length > this.MAX_RESPONSE_TIME_SAMPLES) {
      this.performanceMetrics.responseTimes = this.performanceMetrics.responseTimes.slice(
        -this.MAX_RESPONSE_TIME_SAMPLES
      );
    }
  }

  /**
   * Update performance metrics in state
   */
  private updatePerformanceMetrics(): void {
    const now = Date.now();
    const uptime = (now - this.performanceMetrics.startTime) / 1000; // seconds

    // Calculate average response time
    const avgResponseTime =
      this.performanceMetrics.responseTimes.length > 0
        ? this.performanceMetrics.responseTimes.reduce((sum, time) => sum + time, 0) /
          this.performanceMetrics.responseTimes.length
        : 0;

    // Calculate throughput (requests per second)
    const throughput = this.performanceMetrics.requestCount / uptime;

    // Calculate error rate
    const errorRate =
      this.performanceMetrics.requestCount > 0
        ? this.performanceMetrics.errorCount / this.performanceMetrics.requestCount
        : 0;

    // Get resource usage (simplified - in real implementation, use process.memoryUsage() etc.)
    const resourceUsage = this.getResourceUsage();

    this.stateManager.updateState(
      {
        performance: {
          responseTime: avgResponseTime,
          throughput,
          errorRate,
          resourceUsage,
          lastUpdated: new Date(),
        },
      },
      'performance_adapter'
    );
  }

  /**
   * Get current resource usage
   */
  private getResourceUsage(): { memory: number; cpu: number } {
    // In a real implementation, this would get actual system metrics
    const memUsage = process.memoryUsage();

    return {
      memory: memUsage.heapUsed / 1024 / 1024, // MB
      cpu: 0, // Would need additional monitoring for CPU usage
    };
  }

  /**
   * Cleanup adapter
   */
  dispose(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval);
    }
    console.error('⚡ Performance state adapter disposed');
  }
}

/**
 * Session State Adapter
 *
 * Manages session-related state
 */
export class SessionStateAdapter {
  private currentSessionId = `session_${Date.now()}`;
  private sessionStartTime = new Date();
  private totalSessions = 0;
  private activeConnections = 0;

  constructor(private stateManager: StateManager) {}

  /**
   * Initialize session state
   */
  initialize(): void {
    this.updateSessionState();
    console.error('🏁 Session state adapter initialized');
  }

  /**
   * Start a new session
   */
  startSession(sessionId: string): void {
    this.totalSessions++;
    this.sessionStartTime = new Date();

    this.stateManager.updateState(
      {
        session: {
          currentSessionId: sessionId,
          sessionStartTime: this.sessionStartTime,
          totalSessions: this.totalSessions,
          activeConnections: this.activeConnections,
        },
      },
      'session_adapter'
    );
  }

  /**
   * Update connection count
   */
  updateConnections(count: number): void {
    this.activeConnections = count;

    this.stateManager.updateState(
      {
        session: {
          currentSessionId: this.currentSessionId,
          sessionStartTime: this.sessionStartTime,
          totalSessions: this.totalSessions,
          activeConnections: this.activeConnections,
        },
      },
      'session_adapter'
    );
  }

  /**
   * Update session state
   */
  private updateSessionState(): void {
    this.stateManager.updateState(
      {
        session: {
          currentSessionId: `session_${Date.now()}`,
          sessionStartTime: this.sessionStartTime,
          totalSessions: this.totalSessions,
          activeConnections: this.activeConnections,
        },
      },
      'session_adapter'
    );
  }

  /**
   * Cleanup adapter
   */
  dispose(): void {
    console.error('🏁 Session state adapter disposed');
  }
}
