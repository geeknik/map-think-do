/**
 * @fileoverview Dependency Injection Container for Cognitive System
 *
 * Implements a lightweight dependency injection container to manage
 * cognitive system dependencies and reduce coupling between components.
 *
 * Key features:
 * - Service registration and resolution
 * - Lifecycle management (singleton, transient, scoped)
 * - Factory pattern support
 * - Circular dependency detection
 * - Type safety with generics
 */

export enum ServiceLifetime {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  SCOPED = 'scoped',
}

export interface ServiceDescriptor<T = any> {
  token: string | symbol;
  factory: (container: DependencyContainer) => T | Promise<T>;
  lifetime: ServiceLifetime;
  dependencies?: (string | symbol)[];
}

export interface Disposable {
  dispose(): Promise<void> | void;
}

export class DependencyContainer {
  private services = new Map<string | symbol, ServiceDescriptor>();
  private singletonInstances = new Map<string | symbol, any>();
  private scopedInstances = new Map<string | symbol, any>();
  private resolutionStack = new Set<string | symbol>();

  /**
   * Register a service with the container
   */
  register<T>(descriptor: ServiceDescriptor<T>): void {
    this.services.set(descriptor.token, descriptor);
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(
    token: string | symbol,
    factory: (container: DependencyContainer) => T | Promise<T>,
    dependencies?: (string | symbol)[]
  ): void {
    this.register({
      token,
      factory,
      lifetime: ServiceLifetime.SINGLETON,
      dependencies,
    });
  }

  /**
   * Register a transient service
   */
  registerTransient<T>(
    token: string | symbol,
    factory: (container: DependencyContainer) => T | Promise<T>,
    dependencies?: (string | symbol)[]
  ): void {
    this.register({
      token,
      factory,
      lifetime: ServiceLifetime.TRANSIENT,
      dependencies,
    });
  }

  /**
   * Register a scoped service
   */
  registerScoped<T>(
    token: string | symbol,
    factory: (container: DependencyContainer) => T | Promise<T>,
    dependencies?: (string | symbol)[]
  ): void {
    this.register({
      token,
      factory,
      lifetime: ServiceLifetime.SCOPED,
      dependencies,
    });
  }

  /**
   * Register an instance as a singleton
   */
  registerInstance<T>(token: string | symbol, instance: T): void {
    this.singletonInstances.set(token, instance);
    this.register({
      token,
      factory: () => instance,
      lifetime: ServiceLifetime.SINGLETON,
    });
  }

  /**
   * Resolve a service from the container
   */
  async resolve<T>(token: string | symbol): Promise<T> {
    // Check for circular dependencies
    if (this.resolutionStack.has(token)) {
      const stackArray = Array.from(this.resolutionStack);
      throw new Error(
        `Circular dependency detected: ${stackArray.join(' -> ')} -> ${String(token)}`
      );
    }

    const descriptor = this.services.get(token);
    if (!descriptor) {
      throw new Error(`Service '${String(token)}' is not registered`);
    }

    // Handle different lifetimes
    switch (descriptor.lifetime) {
      case ServiceLifetime.SINGLETON:
        return this.resolveSingleton(token, descriptor);

      case ServiceLifetime.SCOPED:
        return this.resolveScoped(token, descriptor);

      case ServiceLifetime.TRANSIENT:
        return this.resolveTransient(token, descriptor);

      default:
        throw new Error(`Unknown service lifetime: ${descriptor.lifetime}`);
    }
  }

  /**
   * Resolve multiple services
   */
  async resolveMultiple<T>(tokens: (string | symbol)[]): Promise<T[]> {
    return Promise.all(tokens.map(token => this.resolve<T>(token)));
  }

  /**
   * Check if a service is registered
   */
  isRegistered(token: string | symbol): boolean {
    return this.services.has(token);
  }

  /**
   * Create a new scoped container
   */
  createScope(): DependencyContainer {
    const scopedContainer = new DependencyContainer();

    // Copy service descriptors
    for (const [token, descriptor] of this.services) {
      scopedContainer.services.set(token, descriptor);
    }

    // Copy singleton instances
    for (const [token, instance] of this.singletonInstances) {
      scopedContainer.singletonInstances.set(token, instance);
    }

    return scopedContainer;
  }

  /**
   * Dispose all disposable services
   */
  async dispose(): Promise<void> {
    const disposables: Disposable[] = [];

    // Collect disposable singletons
    for (const instance of this.singletonInstances.values()) {
      if (this.isDisposable(instance)) {
        disposables.push(instance);
      }
    }

    // Collect disposable scoped instances
    for (const instance of this.scopedInstances.values()) {
      if (this.isDisposable(instance)) {
        disposables.push(instance);
      }
    }

    // Dispose all in parallel
    await Promise.all(disposables.map(d => d.dispose()));

    // Clear all instances
    this.singletonInstances.clear();
    this.scopedInstances.clear();
  }

  private async resolveSingleton<T>(
    token: string | symbol,
    descriptor: ServiceDescriptor<T>
  ): Promise<T> {
    if (this.singletonInstances.has(token)) {
      return this.singletonInstances.get(token);
    }

    this.resolutionStack.add(token);
    try {
      const instance = await descriptor.factory(this);
      this.singletonInstances.set(token, instance);
      return instance;
    } finally {
      this.resolutionStack.delete(token);
    }
  }

  private async resolveScoped<T>(
    token: string | symbol,
    descriptor: ServiceDescriptor<T>
  ): Promise<T> {
    if (this.scopedInstances.has(token)) {
      return this.scopedInstances.get(token);
    }

    this.resolutionStack.add(token);
    try {
      const instance = await descriptor.factory(this);
      this.scopedInstances.set(token, instance);
      return instance;
    } finally {
      this.resolutionStack.delete(token);
    }
  }

  private async resolveTransient<T>(
    token: string | symbol,
    descriptor: ServiceDescriptor<T>
  ): Promise<T> {
    this.resolutionStack.add(token);
    try {
      return await descriptor.factory(this);
    } finally {
      this.resolutionStack.delete(token);
    }
  }

  private isDisposable(obj: any): obj is Disposable {
    return obj && typeof obj.dispose === 'function';
  }
}

/**
 * Service tokens for cognitive system dependencies
 */
export const ServiceTokens = {
  // Core dependencies
  MEMORY_STORE: Symbol('MemoryStore'),
  CONFIG_MANAGER: Symbol('ConfigManager'),
  LOGGER: Symbol('Logger'),

  // State management
  STATE_TRACKER: Symbol('StateTracker'),
  LEARNING_MANAGER: Symbol('LearningManager'),
  INSIGHT_DETECTOR: Symbol('InsightDetector'),
  STATE_SERVICE: Symbol('StateService'),
  STATE_MANAGER: Symbol('StateManager'),

  // Plugin system
  PLUGIN_MANAGER: Symbol('PluginManager'),
  METACOGNITIVE_PLUGIN: Symbol('MetacognitivePlugin'),
  PERSONA_PLUGIN: Symbol('PersonaPlugin'),
  EXTERNAL_REASONING_PLUGIN: Symbol('ExternalReasoningPlugin'),
  PHASE5_INTEGRATION_PLUGIN: Symbol('Phase5IntegrationPlugin'),

  // Error handling
  ERROR_BOUNDARY_FACTORY: Symbol('ErrorBoundaryFactory'),
  BUFFER_FACTORY: Symbol('BufferFactory'),

  // Configuration
  ORCHESTRATOR_CONFIG: Symbol('OrchestratorConfig'),
} as const;

/**
 * Factory function to create a configured dependency container
 */
export function createCognitiveContainer(): DependencyContainer {
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

  return container;
}
