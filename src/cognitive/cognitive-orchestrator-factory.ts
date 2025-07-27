/**
 * @fileoverview Factory for creating CognitiveOrchestrator instances
 * 
 * Provides factory functions for creating properly configured
 * CognitiveOrchestrator instances with dependency injection.
 */

import { CognitiveOrchestrator, OrchestratorConfig } from './cognitive-orchestrator.js';
import { DependencyContainer, ServiceTokens } from './dependency-container.js';
import { createConfiguredCognitiveContainer } from './dependency-registration.js';
import { MemoryStore } from '../memory/memory-store.js';

/**
 * Configuration options for the orchestrator factory
 */
export interface OrchestratorFactoryConfig {
  config?: Partial<OrchestratorConfig>;
  container?: DependencyContainer;
  memoryStore?: MemoryStore;
}

/**
 * Create a cognitive orchestrator with dependency injection
 */
export async function createCognitiveOrchestrator(
  factoryConfig: OrchestratorFactoryConfig = {}
): Promise<CognitiveOrchestrator> {
  // Use provided container or create a new one
  const container = factoryConfig.container || new DependencyContainer();
  
  // Register memory store if provided
  if (factoryConfig.memoryStore) {
    container.registerInstance(ServiceTokens.MEMORY_STORE, factoryConfig.memoryStore);
  }
  
  // Configure the container if it's new
  if (!factoryConfig.container) {
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
    
    const { registerCognitiveDependencies, wirePluginDependencies } = await import('./dependency-registration.js');
    registerCognitiveDependencies(container);
    await wirePluginDependencies(container);
  }
  
  // Override configuration if provided
  if (factoryConfig.config) {
    const existingConfig = await container.resolve<OrchestratorConfig>(ServiceTokens.ORCHESTRATOR_CONFIG);
    const mergedConfig: OrchestratorConfig = { ...existingConfig, ...factoryConfig.config };
    container.registerInstance(ServiceTokens.ORCHESTRATOR_CONFIG, mergedConfig);
  }
  
  // Create and initialize the orchestrator
  const orchestrator = new CognitiveOrchestrator(container);
  await orchestrator.initialize();
  
  return orchestrator;
}

/**
 * Create a scoped cognitive orchestrator
 * Useful for creating isolated instances for testing or parallel processing
 */
export async function createScopedCognitiveOrchestrator(
  parentContainer: DependencyContainer,
  config?: Partial<OrchestratorConfig>
): Promise<CognitiveOrchestrator> {
  const scopedContainer = parentContainer.createScope();
  
  if (config) {
    const existingConfig = await scopedContainer.resolve<OrchestratorConfig>(ServiceTokens.ORCHESTRATOR_CONFIG);
    const mergedConfig: OrchestratorConfig = { ...existingConfig, ...config };
    scopedContainer.registerInstance(ServiceTokens.ORCHESTRATOR_CONFIG, mergedConfig);
  }
  
  const orchestrator = new CognitiveOrchestrator(scopedContainer);
  await orchestrator.initialize();
  
  return orchestrator;
}

/**
 * Create a minimal cognitive orchestrator for testing
 */
export async function createTestCognitiveOrchestrator(
  testConfig: Partial<OrchestratorConfig> = {}
): Promise<CognitiveOrchestrator> {
  const defaultTestConfig: Partial<OrchestratorConfig> = {
    max_concurrent_interventions: 1,
    intervention_cooldown_ms: 0,
    adaptive_plugin_selection: false,
    learning_rate: 0.05,
    memory_integration_enabled: false,
    pattern_recognition_threshold: 0.9,
    adaptive_learning_enabled: false,
    emergence_detection_enabled: false,
    breakthrough_detection_sensitivity: 0.9,
    insight_cultivation_enabled: false,
    performance_monitoring_enabled: false,
    self_optimization_enabled: false,
    cognitive_load_balancing: false,
    ...testConfig,
  };
  
  return createCognitiveOrchestrator({
    config: defaultTestConfig,
  });
}