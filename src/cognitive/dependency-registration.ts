/**
 * @fileoverview Dependency Registration for Cognitive System
 * 
 * Centralized registration of all cognitive system dependencies.
 * This module configures the dependency injection container with
 * all required services, their lifetimes, and dependencies.
 */

import { DependencyContainer, ServiceTokens } from './dependency-container.js';
import { MemoryStore } from '../memory/memory-store.js';
import { SimpleMemoryStore } from '../memory/simple-memory-store.js';
import { StateTracker } from './state-tracker.js';
import { InsightDetector } from './insight-detector.js';
import { LearningManager } from './learning-manager.js';
import { CognitivePluginManager } from './plugin-system.js';
import { MetacognitivePlugin } from './plugins/metacognitive-plugin.js';
import { PersonaPlugin } from './plugins/persona-plugin.js';
import { ExternalReasoningPlugin } from './plugins/external-reasoning-plugin.js';
import { Phase5IntegrationPlugin } from './plugins/phase5-integration-plugin.js';
import { ErrorBoundaryFactory } from '../utils/error-boundary.js';
import { BufferFactory } from '../utils/circular-buffer.js';
import { secureLogger } from '../utils/secure-logger.js';
import { OrchestratorConfig } from './cognitive-orchestrator.js';

/**
 * Configure the dependency injection container with all cognitive system services
 */
export function registerCognitiveDependencies(container: DependencyContainer): void {
  // Core utilities - singletons
  container.registerInstance(ServiceTokens.LOGGER, secureLogger);
  container.registerInstance(ServiceTokens.ERROR_BOUNDARY_FACTORY, ErrorBoundaryFactory);
  container.registerInstance(ServiceTokens.BUFFER_FACTORY, BufferFactory);

  // Memory store - singleton (register default if not already registered)
  if (!container.isRegistered(ServiceTokens.MEMORY_STORE)) {
    container.registerSingleton(
      ServiceTokens.MEMORY_STORE,
      async () => {
        const memoryStore = new SimpleMemoryStore();
        await memoryStore.initialize();
        return memoryStore;
      }
    );
  }

  // State management - singletons with dependencies
  container.registerSingleton(
    ServiceTokens.STATE_TRACKER,
    () => new StateTracker()
  );

  container.registerSingleton(
    ServiceTokens.LEARNING_MANAGER,
    async (container) => {
      const config = await container.resolve<OrchestratorConfig>(ServiceTokens.ORCHESTRATOR_CONFIG);
      return new LearningManager(config.learning_rate);
    },
    [ServiceTokens.ORCHESTRATOR_CONFIG]
  );

  container.registerSingleton(
    ServiceTokens.INSIGHT_DETECTOR,
    async (container) => {
      const memoryStore = await container.resolve<MemoryStore>(ServiceTokens.MEMORY_STORE);
      const stateTracker = await container.resolve<StateTracker>(ServiceTokens.STATE_TRACKER);
      const learningManager = await container.resolve<LearningManager>(ServiceTokens.LEARNING_MANAGER);
      
      return new InsightDetector(
        memoryStore,
        stateTracker.getState(),
        learningManager.getPerformanceMetrics()
      );
    },
    [ServiceTokens.MEMORY_STORE, ServiceTokens.STATE_TRACKER, ServiceTokens.LEARNING_MANAGER]
  );

  // Plugin manager - singleton
  container.registerSingleton(
    ServiceTokens.PLUGIN_MANAGER,
    async (container) => {
      const config = await container.resolve<OrchestratorConfig>(ServiceTokens.ORCHESTRATOR_CONFIG);
      return new CognitivePluginManager({
        maxConcurrentPlugins: config.max_concurrent_interventions,
        adaptivePriority: config.adaptive_plugin_selection,
        learningEnabled: config.memory_integration_enabled,
      });
    },
    [ServiceTokens.ORCHESTRATOR_CONFIG]
  );

  // Cognitive plugins - singletons
  container.registerSingleton(
    ServiceTokens.METACOGNITIVE_PLUGIN,
    () => new MetacognitivePlugin()
  );

  container.registerSingleton(
    ServiceTokens.PERSONA_PLUGIN,
    () => new PersonaPlugin()
  );

  container.registerSingleton(
    ServiceTokens.EXTERNAL_REASONING_PLUGIN,
    () => new ExternalReasoningPlugin()
  );

  container.registerSingleton(
    ServiceTokens.PHASE5_INTEGRATION_PLUGIN,
    async (container) => {
      const memoryStore = await container.resolve<MemoryStore>(ServiceTokens.MEMORY_STORE);
      return new Phase5IntegrationPlugin(memoryStore);
    },
    [ServiceTokens.MEMORY_STORE]
  );
}

/**
 * Initialize and wire up all plugin dependencies
 */
export async function wirePluginDependencies(container: DependencyContainer): Promise<void> {
  const pluginManager = await container.resolve<CognitivePluginManager>(ServiceTokens.PLUGIN_MANAGER);
  
  // Register all plugins with the manager
  const plugins = await Promise.all([
    container.resolve(ServiceTokens.METACOGNITIVE_PLUGIN),
    container.resolve(ServiceTokens.PERSONA_PLUGIN),
    container.resolve(ServiceTokens.EXTERNAL_REASONING_PLUGIN),
    container.resolve(ServiceTokens.PHASE5_INTEGRATION_PLUGIN),
  ]);

  for (const plugin of plugins) {
    pluginManager.registerPlugin(plugin as any);
  }

  // Set up plugin relationships
  pluginManager.setPluginConflicts('metacognitive', []);
  pluginManager.setPluginConflicts('persona', []);
}

/**
 * Create a fully configured cognitive dependency container
 */
export async function createConfiguredCognitiveContainer(): Promise<DependencyContainer> {
  const container = new DependencyContainer();
  
  // Register default configuration
  container.registerInstance(ServiceTokens.ORCHESTRATOR_CONFIG, {
    max_concurrent_interventions: 3,
    intervention_cooldown_ms: 1000,
    adaptive_plugin_selection: true,
    learning_rate: 0.1,
    memory_integration_enabled: true,
    pattern_recognition_threshold: 0.7,
    adaptive_learning_enabled: true,
    emergence_detection_enabled: true,
    breakthrough_detection_sensitivity: 0.8,
    insight_cultivation_enabled: true,
    performance_monitoring_enabled: true,
    self_optimization_enabled: true,
    cognitive_load_balancing: true,
  });

  // Register all dependencies
  registerCognitiveDependencies(container);
  
  // Wire up plugin dependencies
  await wirePluginDependencies(container);
  
  return container;
}