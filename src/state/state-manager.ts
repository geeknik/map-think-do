/**
 * @fileoverview Unified State Management System
 *
 * Centralized state management for the entire cognitive system.
 * Provides a single source of truth for all cognitive state with
 * event-driven updates, persistence, and validation.
 */

import { EventEmitter } from 'events';
import { CognitiveState } from '../cognitive/state-tracker.js';
import { PluginMetrics } from '../cognitive/plugin-system.js';
import { MemoryStats } from '../memory/memory-store.js';

/**
 * Unified application state interface
 */
export interface UnifiedState {
  // Cognitive state
  cognitive: CognitiveState;

  // Plugin performance state
  plugins: {
    metrics: Record<string, PluginMetrics>;
    activePlugins: string[];
    pluginHealth: Record<string, 'healthy' | 'degraded' | 'failed'>;
  };

  // Memory state
  memory: {
    stats: MemoryStats;
    healthStatus: 'healthy' | 'degraded' | 'critical';
    lastCleanup: Date;
  };

  // System performance state
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    resourceUsage: {
      memory: number;
      cpu: number;
    };
    lastUpdated: Date;
  };

  // Configuration state
  config: {
    orchestratorConfig: any;
    systemSettings: Record<string, any>;
    featureFlags: Record<string, boolean>;
  };

  // Session state
  session: {
    currentSessionId: string;
    sessionStartTime: Date;
    totalSessions: number;
    activeConnections: number;
  };

  // Application lifecycle
  lifecycle: {
    status: 'initializing' | 'ready' | 'degraded' | 'error' | 'shutting_down';
    startupTime: Date;
    version: string;
    buildInfo?: Record<string, string>;
  };

  // Metadata
  lastUpdated: Date;
  version: number;
}

/**
 * State change event interface
 */
export interface StateChangeEvent {
  path: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  source: string;
}

/**
 * State validation result
 */
export interface StateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * State persistence options
 */
export interface StatePersistenceOptions {
  autoSave: boolean;
  saveInterval: number;
  maxHistorySize: number;
  compressionEnabled: boolean;
}

/**
 * Unified State Manager
 *
 * Centralized state management system that coordinates all cognitive
 * system state with event-driven updates and persistence.
 */
export class StateManager extends EventEmitter {
  private state: UnifiedState;
  private stateHistory: Array<{ state: Partial<UnifiedState>; timestamp: Date }> = [];
  private persistenceOptions: StatePersistenceOptions;
  private saveTimer?: NodeJS.Timeout;
  private readonly MAX_HISTORY_SIZE = 100;

  constructor(
    initialState?: Partial<UnifiedState>,
    persistenceOptions: Partial<StatePersistenceOptions> = {}
  ) {
    super();

    this.persistenceOptions = {
      autoSave: true,
      saveInterval: 30000, // 30 seconds
      maxHistorySize: 50,
      compressionEnabled: false,
      ...persistenceOptions,
    };

    // Initialize state with defaults
    this.state = this.createDefaultState();

    // Apply initial state if provided
    if (initialState) {
      this.state = this.mergeState(this.state, initialState);
    }

    // Set up auto-save if enabled
    if (this.persistenceOptions.autoSave) {
      this.setupAutoSave();
    }

    console.error('🗂️ Unified State Manager initialized');
  }

  /**
   * Get the current complete state
   */
  getState(): UnifiedState {
    return { ...this.state };
  }

  /**
   * Get a specific part of the state by path
   */
  getStateByPath<T = any>(path: string): T | undefined {
    return this.getNestedValue(this.state, path);
  }

  /**
   * Update state with validation and event emission
   */
  updateState(updates: Partial<UnifiedState>, source: string = 'unknown'): void {
    const oldState = { ...this.state };
    const newState = this.mergeState(this.state, updates);

    // Validate state changes
    const validation = this.validateState(newState);
    if (!validation.isValid) {
      console.error('❌ State validation failed:', validation.errors);
      this.emit('state_validation_error', { validation, updates, source });
      return;
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('⚠️ State validation warnings:', validation.warnings);
    }

    // Update state
    this.state = newState;
    this.state.lastUpdated = new Date();
    this.state.version += 1;

    // Record state change in history
    this.recordStateChange(updates);

    // Emit state change events
    this.emitStateChangeEvents(oldState, newState, source);

    // Emit general state updated event
    this.emit('state_updated', {
      state: this.state,
      changes: updates,
      source,
      timestamp: new Date(),
    });
  }

  /**
   * Update a specific path in the state
   */
  updateStateByPath(path: string, value: any, source: string = 'unknown'): void {
    const updates = this.createNestedUpdate(path, value);
    this.updateState(updates, source);
  }

  /**
   * Subscribe to state changes for a specific path
   */
  subscribe(path: string, callback: (value: any, oldValue: any) => void): () => void {
    const handler = (event: StateChangeEvent) => {
      if (event.path === path || event.path.startsWith(path + '.')) {
        const newValue = this.getStateByPath(path);
        callback(newValue, event.oldValue);
      }
    };

    this.on('state_change', handler);

    // Return unsubscribe function
    return () => this.off('state_change', handler);
  }

  /**
   * Get state change history
   */
  getStateHistory(limit?: number): Array<{ state: Partial<UnifiedState>; timestamp: Date }> {
    const history = [...this.stateHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Reset state to defaults
   */
  resetState(): void {
    const defaultState = this.createDefaultState();
    this.updateState(defaultState, 'system_reset');
    this.stateHistory = [];
  }

  /**
   * Save current state (for manual persistence)
   */
  async saveState(): Promise<void> {
    try {
      const stateSnapshot = {
        state: this.state,
        timestamp: new Date(),
        version: this.state.version,
      };

      // Emit save event for external persistence handlers
      this.emit('state_save_requested', stateSnapshot);

      console.error('💾 State saved successfully');
    } catch (error) {
      console.error('❌ Failed to save state:', error);
      this.emit('state_save_error', error);
    }
  }

  /**
   * Load state from external source
   */
  async loadState(stateData: Partial<UnifiedState>): Promise<void> {
    try {
      // Validate loaded state
      const validation = this.validateState(stateData as UnifiedState);
      if (!validation.isValid) {
        throw new Error(`Invalid state data: ${validation.errors.join(', ')}`);
      }

      // Update state
      this.updateState(stateData, 'state_load');

      console.error('📂 State loaded successfully');
      this.emit('state_loaded', stateData);
    } catch (error) {
      console.error('❌ Failed to load state:', error);
      this.emit('state_load_error', error);
    }
  }

  /**
   * Get state statistics
   */
  getStateStats(): {
    totalUpdates: number;
    historySize: number;
    lastUpdated: Date;
    version: number;
    memoryUsage: number;
  } {
    return {
      totalUpdates: this.state.version,
      historySize: this.stateHistory.length,
      lastUpdated: this.state.lastUpdated,
      version: this.state.version,
      memoryUsage: this.estimateStateSize(),
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }

    this.removeAllListeners();
    this.stateHistory = [];

    console.error('🗂️ State Manager disposed');
  }

  // Private methods

  private createDefaultState(): UnifiedState {
    const now = new Date();

    return {
      cognitive: {
        session_id: `session_${Date.now()}`,
        thought_count: 0,
        current_complexity: 5,
        confidence_trajectory: [0.5],
        metacognitive_awareness: 0.5,
        creative_pressure: 0.3,
        analytical_depth: 0.5,
        self_doubt_level: 0.3,
        curiosity_level: 0.7,
        frustration_level: 0.2,
        engagement_level: 0.8,
        pattern_recognition_active: true,
        adaptive_learning_enabled: true,
        self_reflection_depth: 0.5,
        cognitive_flexibility: 0.5,
        insight_potential: 0.5,
        breakthrough_likelihood: 0.5,
        recent_success_rate: 0.5,
        improvement_trajectory: 0,
        cognitive_efficiency: 0.5,
      },
      plugins: {
        metrics: {},
        activePlugins: [],
        pluginHealth: {},
      },
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
          oldest_thought: now,
          newest_thought: now,
          duplicate_rate: 0,
        },
        healthStatus: 'healthy',
        lastCleanup: now,
      },
      performance: {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        resourceUsage: {
          memory: 0,
          cpu: 0,
        },
        lastUpdated: now,
      },
      config: {
        orchestratorConfig: {},
        systemSettings: {},
        featureFlags: {},
      },
      session: {
        currentSessionId: `session_${Date.now()}`,
        sessionStartTime: now,
        totalSessions: 0,
        activeConnections: 0,
      },
      lifecycle: {
        status: 'initializing',
        startupTime: now,
        version: '1.0.0',
      },
      lastUpdated: now,
      version: 1,
    };
  }

  private mergeState(current: UnifiedState, updates: Partial<UnifiedState>): UnifiedState {
    return {
      ...current,
      ...this.deepMerge(current, updates),
    };
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  private validateState(state: UnifiedState): StateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate cognitive state
    if (!state.cognitive) {
      errors.push('Missing cognitive state');
    } else {
      if (!state.cognitive.session_id) {
        errors.push('Missing cognitive session_id');
      }
      if (state.cognitive.thought_count < 0) {
        errors.push('Invalid thought_count: must be non-negative');
      }
      if (state.cognitive.current_complexity < 1 || state.cognitive.current_complexity > 10) {
        warnings.push('Complexity value outside normal range (1-10)');
      }
    }

    // Validate session state
    if (!state.session?.currentSessionId) {
      errors.push('Missing current session ID');
    }

    // Validate lifecycle state
    if (
      !['initializing', 'ready', 'degraded', 'error', 'shutting_down'].includes(
        state.lifecycle?.status
      )
    ) {
      errors.push('Invalid lifecycle status');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private recordStateChange(updates: Partial<UnifiedState>): void {
    this.stateHistory.push({
      state: updates,
      timestamp: new Date(),
    });

    // Limit history size
    if (this.stateHistory.length > this.persistenceOptions.maxHistorySize) {
      this.stateHistory = this.stateHistory.slice(-this.persistenceOptions.maxHistorySize);
    }
  }

  private emitStateChangeEvents(
    oldState: UnifiedState,
    newState: UnifiedState,
    source: string
  ): void {
    const changes = this.findStateChanges(oldState, newState, '');

    for (const change of changes) {
      this.emit('state_change', {
        path: change.path,
        oldValue: change.oldValue,
        newValue: change.newValue,
        timestamp: new Date(),
        source,
      });
    }
  }

  private findStateChanges(
    oldState: any,
    newState: any,
    path: string
  ): Array<{
    path: string;
    oldValue: any;
    newValue: any;
  }> {
    const changes: Array<{ path: string; oldValue: any; newValue: any }> = [];

    for (const key in newState) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldValue = oldState?.[key];
      const newValue = newState[key];

      if (oldValue !== newValue) {
        if (
          typeof newValue === 'object' &&
          typeof oldValue === 'object' &&
          newValue !== null &&
          oldValue !== null &&
          !Array.isArray(newValue)
        ) {
          // Recursively check nested objects
          changes.push(...this.findStateChanges(oldValue, newValue, currentPath));
        } else {
          // Value changed
          changes.push({
            path: currentPath,
            oldValue,
            newValue,
          });
        }
      }
    }

    return changes;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private createNestedUpdate(path: string, value: any): any {
    const keys = path.split('.');
    const update: any = {};
    let current = update;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    return update;
  }

  private setupAutoSave(): void {
    this.saveTimer = setInterval(() => {
      this.saveState();
    }, this.persistenceOptions.saveInterval);
  }

  private estimateStateSize(): number {
    try {
      return JSON.stringify(this.state).length * 2; // Rough estimation
    } catch {
      return 0;
    }
  }
}
