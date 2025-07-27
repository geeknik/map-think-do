/**
 * @fileoverview State Service
 * 
 * High-level service that orchestrates the unified state management system.
 * Coordinates all state adapters and provides a clean API for state management.
 */

import { StateManager, UnifiedState, StateChangeEvent } from './state-manager.js';
import {
  CognitiveStateAdapter,
  PluginStateAdapter,
  MemoryStateAdapter,
  PerformanceStateAdapter,
  SessionStateAdapter,
} from './state-adapters.js';
import { CognitiveOrchestrator } from '../cognitive/cognitive-orchestrator.js';
import { MemoryStore } from '../memory/memory-store.js';
import { Disposable } from '../cognitive/dependency-container.js';

/**
 * State service configuration
 */
export interface StateServiceConfig {
  persistence: {
    enabled: boolean;
    autoSave: boolean;
    saveInterval: number;
  };
  monitoring: {
    performanceTracking: boolean;
    memoryTracking: boolean;
    pluginTracking: boolean;
  };
  adapters: {
    cognitive: boolean;
    plugins: boolean;
    memory: boolean;
    performance: boolean;
    session: boolean;
  };
}

/**
 * State Service
 * 
 * Central service that manages all state adapters and provides
 * a unified interface for state management across the system.
 */
export class StateService implements Disposable {
  private stateManager: StateManager;
  private adapters: {
    cognitive?: CognitiveStateAdapter;
    plugins?: PluginStateAdapter;
    memory?: MemoryStateAdapter;
    performance?: PerformanceStateAdapter;
    session?: SessionStateAdapter;
  } = {};

  private config: StateServiceConfig;
  private initialized = false;

  constructor(
    config: Partial<StateServiceConfig> = {},
    initialState?: Partial<UnifiedState>
  ) {
    this.config = {
      persistence: {
        enabled: true,
        autoSave: true,
        saveInterval: 30000,
      },
      monitoring: {
        performanceTracking: true,
        memoryTracking: true,
        pluginTracking: true,
      },
      adapters: {
        cognitive: true,
        plugins: true,
        memory: true,
        performance: true,
        session: true,
      },
      ...config,
    };

    // Initialize state manager
    this.stateManager = new StateManager(initialState, {
      autoSave: this.config.persistence.autoSave,
      saveInterval: this.config.persistence.saveInterval,
    });

    // Set up state manager event handlers
    this.setupStateManagerEvents();

    console.error('🏗️ State Service initialized');
  }

  /**
   * Initialize state service with dependencies
   */
  async initialize(dependencies: {
    orchestrator?: CognitiveOrchestrator;
    memoryStore?: MemoryStore;
  }): Promise<void> {
    if (this.initialized) {
      console.warn('⚠️ State service already initialized');
      return;
    }

    // Update lifecycle status
    this.updateLifecycleStatus('initializing');

    try {
      // Initialize adapters based on configuration
      await this.initializeAdapters(dependencies);

      // Mark as ready
      this.updateLifecycleStatus('ready');
      this.initialized = true;

      console.error('✅ State Service fully initialized');
    } catch (error) {
      this.updateLifecycleStatus('error');
      console.error('❌ Failed to initialize State Service:', error);
      throw error;
    }
  }

  /**
   * Get the current unified state
   */
  getState(): UnifiedState {
    return this.stateManager.getState();
  }

  /**
   * Get state by path
   */
  getStateByPath<T = any>(path: string): T | undefined {
    return this.stateManager.getStateByPath<T>(path);
  }

  /**
   * Update state
   */
  updateState(updates: Partial<UnifiedState>, source: string = 'state_service'): void {
    this.stateManager.updateState(updates, source);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(
    path: string,
    callback: (value: any, oldValue: any) => void
  ): () => void {
    return this.stateManager.subscribe(path, callback);
  }

  /**
   * Subscribe to all state changes
   */
  subscribeToAll(callback: (event: StateChangeEvent) => void): () => void {
    this.stateManager.on('state_change', callback);
    return () => this.stateManager.off('state_change', callback);
  }

  /**
   * Get state history
   */
  getStateHistory(limit?: number): Array<{ state: Partial<UnifiedState>; timestamp: Date }> {
    return this.stateManager.getStateHistory(limit);
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
    return this.stateManager.getStateStats();
  }

  /**
   * Record a request for performance tracking
   */
  recordRequest(responseTime: number, success: boolean = true): void {
    if (this.adapters.performance) {
      this.adapters.performance.recordRequest(responseTime, success);
    }
  }

  /**
   * Start a new session
   */
  startSession(sessionId: string): void {
    if (this.adapters.session) {
      this.adapters.session.startSession(sessionId);
    }
  }

  /**
   * Update connection count
   */
  updateConnections(count: number): void {
    if (this.adapters.session) {
      this.adapters.session.updateConnections(count);
    }
  }

  /**
   * Update lifecycle status
   */
  updateLifecycleStatus(status: 'initializing' | 'ready' | 'degraded' | 'error' | 'shutting_down'): void {
    this.updateState({
      lifecycle: {
        status,
        startupTime: new Date(),
        version: '1.0.0-AGI-MAGIC',
      },
    }, 'lifecycle_manager');
  }

  /**
   * Save current state
   */
  async saveState(): Promise<void> {
    return this.stateManager.saveState();
  }

  /**
   * Load state from external source
   */
  async loadState(stateData: Partial<UnifiedState>): Promise<void> {
    return this.stateManager.loadState(stateData);
  }

  /**
   * Reset state to defaults
   */
  resetState(): void {
    this.stateManager.resetState();
  }

  /**
   * Get system health overview
   */
  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'critical';
    components: {
      cognitive: 'healthy' | 'degraded' | 'critical';
      plugins: 'healthy' | 'degraded' | 'critical';
      memory: 'healthy' | 'degraded' | 'critical';
      performance: 'healthy' | 'degraded' | 'critical';
    };
  } {
    const state = this.getState();
    
    // Assess component health
    const components = {
      cognitive: this.assessCognitiveHealth(state),
      plugins: this.assessPluginHealth(state),
      memory: state.memory.healthStatus as 'healthy' | 'degraded' | 'critical',
      performance: this.assessPerformanceHealth(state),
    };

    // Calculate overall health
    const healthLevels = Object.values(components);
    const overall = healthLevels.includes('critical') ? 'critical' :
                   healthLevels.includes('degraded') ? 'degraded' : 'healthy';

    return { overall, components };
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    console.error('🧹 Disposing State Service...');

    // Update lifecycle status
    this.updateLifecycleStatus('shutting_down');

    // Dispose all adapters
    Object.values(this.adapters).forEach(adapter => {
      if (adapter && typeof adapter.dispose === 'function') {
        adapter.dispose();
      }
    });

    // Dispose state manager
    this.stateManager.dispose();

    this.initialized = false;
    console.error('✅ State Service disposed');
  }

  // Private methods

  private async initializeAdapters(dependencies: {
    orchestrator?: CognitiveOrchestrator;
    memoryStore?: MemoryStore;
  }): Promise<void> {
    const { orchestrator, memoryStore } = dependencies;

    // Initialize cognitive adapter
    if (this.config.adapters.cognitive && orchestrator) {
      this.adapters.cognitive = new CognitiveStateAdapter(this.stateManager, orchestrator);
      this.adapters.cognitive.initialize();
    }

    // Initialize plugin adapter
    if (this.config.adapters.plugins && orchestrator) {
      this.adapters.plugins = new PluginStateAdapter(this.stateManager, orchestrator);
      this.adapters.plugins.initialize();
    }

    // Initialize memory adapter
    if (this.config.adapters.memory && memoryStore) {
      this.adapters.memory = new MemoryStateAdapter(this.stateManager, memoryStore);
      this.adapters.memory.initialize();
    }

    // Initialize performance adapter
    if (this.config.adapters.performance) {
      this.adapters.performance = new PerformanceStateAdapter(this.stateManager);
      this.adapters.performance.initialize();
    }

    // Initialize session adapter
    if (this.config.adapters.session) {
      this.adapters.session = new SessionStateAdapter(this.stateManager);
      this.adapters.session.initialize();
    }
  }

  private setupStateManagerEvents(): void {
    this.stateManager.on('state_updated', (event) => {
      // Log significant state changes
      if (event.source !== 'performance_adapter') {
        console.error(`📊 State updated by ${event.source}`);
      }
    });

    this.stateManager.on('state_validation_error', (event) => {
      console.error('❌ State validation error:', event.validation.errors);
    });

    this.stateManager.on('state_save_error', (error) => {
      console.error('❌ State save error:', error);
    });

    this.stateManager.on('state_load_error', (error) => {
      console.error('❌ State load error:', error);
    });
  }

  private assessCognitiveHealth(state: UnifiedState): 'healthy' | 'degraded' | 'critical' {
    const cognitive = state.cognitive;
    
    if (cognitive.frustration_level > 0.8 || cognitive.self_doubt_level > 0.8) {
      return 'critical';
    } else if (cognitive.confidence_trajectory.slice(-1)[0] < 0.3 || cognitive.engagement_level < 0.3) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private assessPluginHealth(state: UnifiedState): 'healthy' | 'degraded' | 'critical' {
    const pluginHealthValues = Object.values(state.plugins.pluginHealth);
    
    if (pluginHealthValues.includes('failed')) {
      return 'critical';
    } else if (pluginHealthValues.includes('degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private assessPerformanceHealth(state: UnifiedState): 'healthy' | 'degraded' | 'critical' {
    const perf = state.performance;
    
    if (perf.errorRate > 0.1 || perf.responseTime > 2000) {
      return 'critical';
    } else if (perf.errorRate > 0.05 || perf.responseTime > 1000) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }
}