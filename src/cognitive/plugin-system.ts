/**
 * @fileoverview Cognitive Plugin System - The Foundation of AGI Magic
 *
 * This system provides the core architecture for modular cognitive capabilities.
 * Plugins can implement different aspects of intelligence: reasoning, creativity,
 * analysis, metacognition, emotional processing, and more.
 *
 * The plugin system is designed to be:
 * - Self-organizing: Plugins activate based on context and need
 * - Adaptive: Performance metrics guide plugin selection
 * - Emergent: Complex behaviors emerge from plugin interactions
 * - Extensible: New cognitive capabilities can be added as plugins
 */

import { EventEmitter } from 'events';
import { ErrorSeverity, handleError } from '../utils/error-handler.js';
import { StoredThought, ReasoningSession } from '../memory/memory-store.js';
import { asyncSort, processInChunks, yieldToEventLoop } from '../utils/async-helpers.js';

/**
 * Context information available to cognitive plugins
 */
export interface CognitiveContext {
  // Current reasoning state
  current_thought?: string;
  thought_history: StoredThought[];
  session: Partial<ReasoningSession>;

  // Problem characteristics
  domain?: string;
  complexity: number;
  urgency: 'low' | 'medium' | 'high';
  confidence_level: number;

  // Available resources
  available_tools: string[];
  time_constraints?: {
    max_thoughts?: number;
    deadline?: Date;
  };

  // Learning context
  similar_past_sessions: ReasoningSession[];
  success_patterns: string[];
  failure_patterns: string[];

  // Emotional/motivational state
  curiosity_level?: number;
  frustration_level?: number;
  engagement_level?: number;

  // Meta-cognitive state
  metacognitive_awareness: number;
  self_doubt_level: number;
  creative_pressure: number;

  // Reflection support
  last_thought_output?: string;
  context_trace?: string[];
}

/**
 * Plugin activation result
 */
export interface PluginActivation {
  should_activate: boolean;
  priority: number; // 0-100, higher = more important
  confidence: number; // 0-1, how confident the plugin is it can help
  reason: string;
  estimated_impact: 'low' | 'medium' | 'high';
  resource_requirements: {
    cognitive_load: number; // 0-1
    time_cost: number; // estimated thoughts needed
    creativity_required: boolean;
    analysis_required: boolean;
  };
}

/**
 * Plugin intervention result
 */
export interface PluginIntervention {
  type: 'prompt_injection' | 'thought_modification' | 'context_enhancement' | 'meta_guidance';
  content: string;
  metadata: {
    plugin_id: string;
    confidence: number;
    expected_benefit: string;
    side_effects?: string[];
  };

  // Follow-up actions
  follow_up_needed?: boolean;
  next_check_after?: number; // thoughts

  // Learning feedback
  success_metrics?: string[];
  failure_indicators?: string[];
}

/**
 * Plugin performance metrics
 */
export interface PluginMetrics {
  activation_count: number;
  success_rate: number;
  average_impact_score: number;
  user_satisfaction: number;

  // Timing metrics
  average_response_time: number;
  cognitive_efficiency: number;

  // Contextual performance
  performance_by_domain: Record<string, number>;
  performance_by_complexity: Record<string, number>;

  // Learning metrics
  improvement_rate: number;
  adaptation_speed: number;

  // Interaction metrics
  synergy_with_plugins: Record<string, number>;
  conflict_rate: number;
}

/**
 * Abstract base class for all cognitive plugins
 */
export abstract class CognitivePlugin extends EventEmitter {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly version: string;

  protected metrics: PluginMetrics;
  protected config: Record<string, any>;
  protected learning_enabled: boolean = true;

  constructor(
    id: string,
    name: string,
    description: string,
    version: string = '1.0.0',
    config: Record<string, any> = {}
  ) {
    super();
    this.id = id;
    this.name = name;
    this.description = description;
    this.version = version;
    this.config = config;

    this.metrics = {
      activation_count: 0,
      success_rate: 0,
      average_impact_score: 0,
      user_satisfaction: 0,
      average_response_time: 0,
      cognitive_efficiency: 0,
      performance_by_domain: {},
      performance_by_complexity: {},
      improvement_rate: 0,
      adaptation_speed: 0,
      synergy_with_plugins: {},
      conflict_rate: 0,
    };
  }

  /**
   * Determine if this plugin should activate given the current context
   */
  abstract shouldActivate(context: CognitiveContext): Promise<PluginActivation>;

  /**
   * Execute the plugin's cognitive intervention
   */
  abstract intervene(context: CognitiveContext): Promise<PluginIntervention>;

  /**
   * Provide feedback on the success/failure of the intervention
   */
  abstract receiveFeedback(
    intervention: PluginIntervention,
    outcome: 'success' | 'failure' | 'partial',
    impact_score: number,
    context: CognitiveContext
  ): Promise<void>;

  /**
   * Update plugin configuration based on learning
   */
  abstract adapt(learningData: any): Promise<void>;

  /**
   * Get current plugin metrics
   */
  getMetrics(): PluginMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset plugin state (useful for testing)
   */
  reset(): void {
    this.metrics = {
      activation_count: 0,
      success_rate: 0,
      average_impact_score: 0,
      user_satisfaction: 0,
      average_response_time: 0,
      cognitive_efficiency: 0,
      performance_by_domain: {},
      performance_by_complexity: {},
      improvement_rate: 0,
      adaptation_speed: 0,
      synergy_with_plugins: {},
      conflict_rate: 0,
    };
  }

  /**
   * Enable or disable learning for this plugin
   */
  setLearningEnabled(enabled: boolean): void {
    this.learning_enabled = enabled;
  }

  /**
   * Update plugin configuration
   */
  updateConfig(newConfig: Record<string, any>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', newConfig);
  }

  /**
   * Check if plugin is compatible with given context
   */
  protected isCompatible(context: CognitiveContext): boolean {
    // Override in subclasses for specific compatibility checks
    return true;
  }

  /**
   * Calculate base priority based on plugin's specialty and context
   */
  protected calculateBasePriority(context: CognitiveContext): number {
    // Override in subclasses for specific priority calculation
    return 50; // Default neutral priority
  }

  /**
   * Update metrics after an intervention
   */
  protected updateMetrics(
    intervention: PluginIntervention,
    outcome: 'success' | 'failure' | 'partial',
    impact_score: number,
    response_time: number,
    context: CognitiveContext
  ): void {
    this.metrics.activation_count++;

    // Update success rate
    const success_value = outcome === 'success' ? 1 : outcome === 'partial' ? 0.5 : 0;
    this.metrics.success_rate =
      (this.metrics.success_rate * (this.metrics.activation_count - 1) + success_value) /
      this.metrics.activation_count;

    // Update average impact score
    this.metrics.average_impact_score =
      (this.metrics.average_impact_score * (this.metrics.activation_count - 1) + impact_score) /
      this.metrics.activation_count;

    // Update response time
    this.metrics.average_response_time =
      (this.metrics.average_response_time * (this.metrics.activation_count - 1) + response_time) /
      this.metrics.activation_count;

    // Update domain-specific performance
    if (context.domain) {
      const domain_count = this.metrics.performance_by_domain[context.domain] || 0;
      this.metrics.performance_by_domain[context.domain] =
        (domain_count * (this.metrics.activation_count - 1) + success_value) /
        this.metrics.activation_count;
    }

    // Update complexity-specific performance
    const complexity_key =
      context.complexity < 3 ? 'low' : context.complexity < 7 ? 'medium' : 'high';
    const complexity_count = this.metrics.performance_by_complexity[complexity_key] || 0;
    this.metrics.performance_by_complexity[complexity_key] =
      (complexity_count * (this.metrics.activation_count - 1) + success_value) /
      this.metrics.activation_count;

    // Emit metrics update event
    this.emit('metrics_updated', this.metrics);
  }

  /**
   * Cleanup resources when plugin is destroyed
   * Override this method in child classes for custom cleanup
   */
  async destroy(): Promise<void> {
    this.removeAllListeners();
  }
}

/**
 * Plugin manager orchestrates cognitive plugins
 */
export class CognitivePluginManager extends EventEmitter {
  private plugins: Map<string, CognitivePlugin> = new Map();
  private activeInterventions: Map<string, PluginIntervention> = new Map();
  private pluginDependencies: Map<string, string[]> = new Map();
  private conflictMatrix: Map<string, Set<string>> = new Map();

  // Configuration
  private maxConcurrentPlugins: number = 3;
  private adaptivePriority: boolean = true;
  private learningEnabled: boolean = true;

  constructor(
    config: {
      maxConcurrentPlugins?: number;
      adaptivePriority?: boolean;
      learningEnabled?: boolean;
    } = {}
  ) {
    super();
    this.maxConcurrentPlugins = config.maxConcurrentPlugins ?? 3;
    this.adaptivePriority = config.adaptivePriority ?? true;
    this.learningEnabled = config.learningEnabled ?? true;
  }

  /**
   * Register a cognitive plugin
   */
  registerPlugin(plugin: CognitivePlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID '${plugin.id}' is already registered`);
    }

    this.plugins.set(plugin.id, plugin);

    // Set up event listeners
    plugin.on('metrics_updated', (metrics: PluginMetrics) => {
      this.emit('plugin_metrics_updated', { plugin_id: plugin.id, metrics });
    });

    plugin.on('config_updated', (config: Record<string, any>) => {
      this.emit('plugin_config_updated', { plugin_id: plugin.id, config });
    });

    console.error(`Registered cognitive plugin: ${plugin.name} (${plugin.id})`);
    this.emit('plugin_registered', plugin);
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    // Remove from active interventions
    this.activeInterventions.delete(pluginId);

    // Remove dependencies
    this.pluginDependencies.delete(pluginId);

    // Remove conflicts
    this.conflictMatrix.delete(pluginId);
    for (const conflicts of this.conflictMatrix.values()) {
      conflicts.delete(pluginId);
    }

    // Remove plugin
    this.plugins.delete(pluginId);

    console.error(`Unregistered cognitive plugin: ${plugin.name} (${pluginId})`);
    this.emit('plugin_unregistered', pluginId);

    return true;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): CognitivePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): CognitivePlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Orchestrate cognitive interventions based on context
   */
  async orchestrate(context: CognitiveContext): Promise<PluginIntervention[]> {
    const startTime = Date.now();

    try {
      // Step 1: Get activation decisions from all plugins
      const activationPromises = Array.from(this.plugins.values()).map(async plugin => {
        try {
          const activation = await plugin.shouldActivate(context);
          return { plugin, activation };
        } catch (error) {
          handleError('CognitivePluginManager', 'orchestrate', error, ErrorSeverity.WARNING, {
            pluginId: plugin.id,
            phase: 'activation_check',
          });
          return null;
        }
      });

      const activationResults = (await Promise.all(activationPromises)).filter(
        (result): result is { plugin: CognitivePlugin; activation: PluginActivation } =>
          result !== null && result.activation.should_activate
      );

      // Step 2: Sort by priority and apply adaptive adjustments (non-blocking)
      await yieldToEventLoop(); // Yield before sorting

      const sortedResults = await asyncSort(activationResults, (a, b) => {
        if (this.adaptivePriority) {
          const priorityA = this.calculateAdaptivePriority(a.plugin, a.activation, context);
          const priorityB = this.calculateAdaptivePriority(b.plugin, b.activation, context);
          return priorityB - priorityA;
        } else {
          return b.activation.priority - a.activation.priority;
        }
      });

      // Step 3: Select plugins considering conflicts and resource constraints
      const selectedPlugins = this.selectNonConflictingPlugins(sortedResults, context);

      // Step 4: Execute interventions
      const interventionPromises = selectedPlugins.map(async ({ plugin, activation }) => {
        try {
          const intervention = await plugin.intervene(context);
          this.activeInterventions.set(plugin.id, intervention);
          return intervention;
        } catch (error) {
          handleError('CognitivePluginManager', 'orchestrate', error, ErrorSeverity.ERROR, {
            pluginId: plugin.id,
            phase: 'intervention',
          });
          return null;
        }
      });

      const interventions = (await Promise.all(interventionPromises)).filter(
        (intervention): intervention is PluginIntervention => intervention !== null
      );

      const duration = Date.now() - startTime;

      this.emit('orchestration_complete', {
        context,
        interventions,
        duration,
        plugins_activated: selectedPlugins.length,
        plugins_considered: this.plugins.size,
      });

      return interventions;
    } catch (error) {
      handleError('CognitivePluginManager', 'orchestrate', error, ErrorSeverity.CRITICAL, {
        contextDomain: context.domain,
      });
      this.emit('orchestration_error', { context, error });
      throw error; // Critical errors should propagate
    }
  }

  /**
   * Provide feedback to plugins about intervention outcomes
   */
  async provideFeedback(
    interventions: PluginIntervention[],
    outcome: 'success' | 'failure' | 'partial',
    impact_score: number,
    context: CognitiveContext
  ): Promise<void> {
    const feedbackPromises = interventions.map(async intervention => {
      const plugin = this.plugins.get(intervention.metadata.plugin_id);
      if (plugin) {
        try {
          await plugin.receiveFeedback(intervention, outcome, impact_score, context);
        } catch (error) {
          handleError('CognitivePluginManager', 'provideFeedback', error, ErrorSeverity.WARNING, {
            pluginId: plugin.id,
            outcome,
          });
        }
      }
    });

    await Promise.all(feedbackPromises);

    // Clean up active interventions
    interventions.forEach(intervention => {
      this.activeInterventions.delete(intervention.metadata.plugin_id);
    });
  }

  /**
   * Define plugin dependencies
   */
  setPluginDependencies(pluginId: string, dependencies: string[]): void {
    this.pluginDependencies.set(pluginId, dependencies);
  }

  /**
   * Define plugin conflicts
   */
  setPluginConflicts(pluginId: string, conflicts: string[]): void {
    if (!this.conflictMatrix.has(pluginId)) {
      this.conflictMatrix.set(pluginId, new Set());
    }

    const pluginConflicts = this.conflictMatrix.get(pluginId)!;
    conflicts.forEach(conflictId => {
      pluginConflicts.add(conflictId);

      // Add bidirectional conflict
      if (!this.conflictMatrix.has(conflictId)) {
        this.conflictMatrix.set(conflictId, new Set());
      }
      this.conflictMatrix.get(conflictId)!.add(pluginId);
    });
  }

  /**
   * Get plugin performance summary
   */
  getPerformanceSummary(): Record<string, PluginMetrics> {
    const summary: Record<string, PluginMetrics> = {};

    for (const [id, plugin] of this.plugins) {
      summary[id] = plugin.getMetrics();
    }

    return summary;
  }

  /**
   * Calculate adaptive priority based on historical performance
   */
  private calculateAdaptivePriority(
    plugin: CognitivePlugin,
    activation: PluginActivation,
    context: CognitiveContext
  ): number {
    const metrics = plugin.getMetrics();
    const basePriority = activation.priority;

    // Adjust based on success rate
    const successMultiplier = 0.5 + metrics.success_rate * 0.5;

    // Adjust based on domain-specific performance
    let domainMultiplier = 1.0;
    if (context.domain && metrics.performance_by_domain[context.domain] !== undefined) {
      domainMultiplier = 0.7 + metrics.performance_by_domain[context.domain] * 0.6;
    }

    // Adjust based on complexity-specific performance
    const complexityKey =
      context.complexity < 3 ? 'low' : context.complexity < 7 ? 'medium' : 'high';
    let complexityMultiplier = 1.0;
    if (metrics.performance_by_complexity[complexityKey] !== undefined) {
      complexityMultiplier = 0.8 + metrics.performance_by_complexity[complexityKey] * 0.4;
    }

    // Adjust based on recent performance trend
    const efficiencyMultiplier = 0.8 + metrics.cognitive_efficiency * 0.4;

    return (
      basePriority *
      successMultiplier *
      domainMultiplier *
      complexityMultiplier *
      efficiencyMultiplier
    );
  }

  /**
   * Select non-conflicting plugins considering resource constraints
   */
  private selectNonConflictingPlugins(
    activationResults: Array<{ plugin: CognitivePlugin; activation: PluginActivation }>,
    context: CognitiveContext
  ): Array<{ plugin: CognitivePlugin; activation: PluginActivation }> {
    const selected: Array<{ plugin: CognitivePlugin; activation: PluginActivation }> = [];
    const selectedIds = new Set<string>();

    let totalCognitiveLoad = 0;
    const maxCognitiveLoad = 1.0; // Maximum cognitive load threshold

    for (const result of activationResults) {
      const pluginId = result.plugin.id;
      const load = result.activation.resource_requirements.cognitive_load;

      // Check if adding this plugin would exceed cognitive load
      if (totalCognitiveLoad + load > maxCognitiveLoad) {
        continue;
      }

      // Check if plugin conflicts with already selected plugins
      const conflicts = this.conflictMatrix.get(pluginId);
      if (conflicts && Array.from(conflicts).some(conflictId => selectedIds.has(conflictId))) {
        continue;
      }

      // Check if we've reached the maximum concurrent plugins
      if (selected.length >= this.maxConcurrentPlugins) {
        break;
      }

      // Check dependencies
      const dependencies = this.pluginDependencies.get(pluginId);
      if (dependencies && !dependencies.every(depId => selectedIds.has(depId))) {
        continue; // Skip if dependencies not met
      }

      selected.push(result);
      selectedIds.add(pluginId);
      totalCognitiveLoad += load;
    }

    return selected;
  }

  /**
   * Cleanup resources and destroy all plugins
   */
  async destroy(): Promise<void> {
    // Remove all event listeners
    this.removeAllListeners();

    // Destroy all plugins
    for (const [id, plugin] of this.plugins) {
      try {
        if (typeof plugin.destroy === 'function') {
          await plugin.destroy();
        }
      } catch (error) {
        console.error(`Error destroying plugin ${id}:`, error);
      }
    }

    // Clear all data structures
    this.plugins.clear();
    this.pluginDependencies.clear();
    this.conflictMatrix.clear();
    this.activeInterventions.clear();
  }
}
