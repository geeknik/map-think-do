/**
 * @fileoverview Plugin manager for orchestrating prompt plugins
 *
 * This manages the lifecycle of prompt plugins, handles plugin discovery,
 * activation, and coordination. Essential for the AGI-like behavior where
 * different cognitive capabilities need to work together dynamically.
 */

import { BasePromptPlugin, PromptContext, PluginMetadata } from './base-plugin.js';
import { MetaPromptsPlugin } from './meta-prompts.js';
import { RolePrimingPlugin } from './role-priming.js';
import { Prompt, PromptResult } from '../types.js';

/**
 * Plugin activation result
 */
interface PluginActivation {
  plugin: BasePromptPlugin;
  priority: number;
  confidence: number;
}

/**
 * Plugin manager configuration
 */
interface PluginManagerConfig {
  maxActivePlugins?: number;
  minActivationPriority?: number;
  enableConcurrentActivation?: boolean;
  adaptivePriorities?: boolean;
  learningEnabled?: boolean;
}

/**
 * Plugin performance metrics
 */
interface PluginMetrics {
  pluginName: string;
  activationCount: number;
  successCount: number;
  averageConfidence: number;
  lastUsed: Date;
  averageResponseTime: number;
}

/**
 * Plugin manager that orchestrates all prompt plugins
 */
export class PluginManager {
  private plugins: Map<string, BasePromptPlugin> = new Map();
  private pluginMetrics: Map<string, PluginMetrics> = new Map();
  private config: PluginManagerConfig;
  private contextHistory: PromptContext[] = [];

  constructor(config: PluginManagerConfig = {}) {
    this.config = {
      maxActivePlugins: 3,
      minActivationPriority: 1,
      enableConcurrentActivation: true,
      adaptivePriorities: true,
      learningEnabled: true,
      ...config,
    };

    this.initializeDefaultPlugins();
  }

  /**
   * Initialize default plugins
   */
  private initializeDefaultPlugins(): void {
    // Register core plugins
    this.registerPlugin(new MetaPromptsPlugin());
    this.registerPlugin(new RolePrimingPlugin());

    console.error(`PluginManager initialized with ${this.plugins.size} plugins`);
  }

  /**
   * Register a new plugin
   */
  registerPlugin(plugin: BasePromptPlugin): void {
    const metadata = plugin.getMetadata();
    this.plugins.set(metadata.name, plugin);

    // Initialize metrics
    this.pluginMetrics.set(metadata.name, {
      pluginName: metadata.name,
      activationCount: 0,
      successCount: 0,
      averageConfidence: 0,
      lastUsed: new Date(),
      averageResponseTime: 0,
    });

    console.error(`Registered plugin: ${metadata.name}`);
  }

  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginName: string): boolean {
    const removed = this.plugins.delete(pluginName);
    if (removed) {
      this.pluginMetrics.delete(pluginName);
      console.error(`Unregistered plugin: ${pluginName}`);
    }
    return removed;
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): BasePromptPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): BasePromptPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get plugin metadata for all plugins
   */
  getPluginMetadata(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map(plugin => plugin.getMetadata());
  }

  /**
   * Get plugin performance metrics
   */
  getPluginMetrics(): PluginMetrics[] {
    return Array.from(this.pluginMetrics.values());
  }

  /**
   * Determine which plugins should activate for the given context
   */
  selectActivePlugins(context: PromptContext): PluginActivation[] {
    const activations: PluginActivation[] = [];

    for (const [name, plugin] of this.plugins) {
      if (plugin.shouldActivate(context)) {
        const priority = plugin.calculatePriority(context);

        // Apply adaptive priority adjustments if enabled
        const adjustedPriority = this.config.adaptivePriorities
          ? this.adjustPriorityBasedOnHistory(name, priority, context)
          : priority;

        if (adjustedPriority >= (this.config.minActivationPriority || 1)) {
          activations.push({
            plugin,
            priority: adjustedPriority,
            confidence: this.calculateActivationConfidence(name, context),
          });
        }
      }
    }

    // Sort by priority (highest first)
    activations.sort((a, b) => b.priority - a.priority);

    // Limit to max active plugins
    const maxPlugins = this.config.maxActivePlugins || 3;
    return activations.slice(0, maxPlugins);
  }

  /**
   * Adjust plugin priority based on historical performance
   */
  private adjustPriorityBasedOnHistory(
    pluginName: string,
    basePriority: number,
    context: PromptContext
  ): number {
    const metrics = this.pluginMetrics.get(pluginName);
    if (!metrics || metrics.activationCount === 0) {
      return basePriority;
    }

    // Calculate success rate
    const successRate = metrics.successCount / metrics.activationCount;

    // Adjust priority based on success rate
    let adjustment = 0;
    if (successRate > 0.8) {
      adjustment = 1; // Boost high-performing plugins
    } else if (successRate < 0.3) {
      adjustment = -1; // Reduce low-performing plugins
    }

    // Consider recency - boost recently successful plugins
    const daysSinceLastUse = (Date.now() - metrics.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastUse < 1 && metrics.averageConfidence > 0.7) {
      adjustment += 0.5;
    }

    return Math.max(0, basePriority + adjustment);
  }

  /**
   * Calculate confidence in plugin activation
   */
  private calculateActivationConfidence(pluginName: string, context: PromptContext): number {
    const metrics = this.pluginMetrics.get(pluginName);
    if (!metrics || metrics.activationCount === 0) {
      return 0.5; // Default confidence for new plugins
    }

    const successRate = metrics.successCount / metrics.activationCount;
    const confidenceWeight = metrics.averageConfidence;

    // Combine success rate and average confidence
    return successRate * 0.6 + confidenceWeight * 0.4;
  }

  /**
   * Generate prompts from active plugins
   */
  generatePrompts(context: PromptContext): Prompt[] {
    const activePlugins = this.selectActivePlugins(context);
    const allPrompts: Prompt[] = [];

    for (const activation of activePlugins) {
      const startTime = Date.now();

      try {
        const prompts = activation.plugin.generatePrompts(context);
        allPrompts.push(...prompts);

        // Update metrics
        this.updatePluginResponseTime(activation.plugin.getMetadata().name, Date.now() - startTime);
      } catch (error) {
        console.error(
          `Error generating prompts from plugin ${activation.plugin.getMetadata().name}:`,
          error
        );
      }
    }

    // Remove duplicates and sort by relevance
    return this.deduplicateAndSortPrompts(allPrompts, context);
  }

  /**
   * Generate prompt templates from active plugins
   */
  generateTemplates(
    context: PromptContext
  ): Record<string, (args: Record<string, string>) => PromptResult> {
    const activePlugins = this.selectActivePlugins(context);
    const allTemplates: Record<string, (args: Record<string, string>) => PromptResult> = {};

    for (const activation of activePlugins) {
      try {
        const templates = activation.plugin.generateTemplates(context);

        // Merge templates, with later plugins overriding earlier ones if there are conflicts
        Object.assign(allTemplates, templates);
      } catch (error) {
        console.error(
          `Error generating templates from plugin ${activation.plugin.getMetadata().name}:`,
          error
        );
      }
    }

    return allTemplates;
  }

  /**
   * Remove duplicate prompts and sort by relevance
   */
  private deduplicateAndSortPrompts(prompts: Prompt[], context: PromptContext): Prompt[] {
    // Remove duplicates by name
    const uniquePrompts = new Map<string, Prompt>();

    for (const prompt of prompts) {
      if (!uniquePrompts.has(prompt.name)) {
        uniquePrompts.set(prompt.name, prompt);
      }
    }

    const deduplicatedPrompts = Array.from(uniquePrompts.values());

    // Sort by relevance (simplified scoring)
    return deduplicatedPrompts.sort((a, b) => {
      const scoreA = this.calculatePromptRelevance(a, context);
      const scoreB = this.calculatePromptRelevance(b, context);
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate prompt relevance score
   */
  private calculatePromptRelevance(prompt: Prompt, context: PromptContext): number {
    let score = 0;

    // Boost metacognitive prompts for complex problems
    if (prompt.name.includes('reflect') || prompt.name.includes('meta')) {
      if (context.complexity && context.complexity >= 7) {
        score += 2;
      }
    }

    // Boost role-based prompts early in thinking process
    if (prompt.name.includes('role') || prompt.name.includes('adopt')) {
      if (context.thoughtHistory.length <= 3) {
        score += 1;
      }
    }

    // Boost evaluation prompts later in thinking process
    if (prompt.name.includes('evaluate') || prompt.name.includes('assess')) {
      if (context.thoughtHistory.length >= 4) {
        score += 1;
      }
    }

    return score;
  }

  /**
   * Provide feedback to all relevant plugins
   */
  provideFeedback(
    promptName: string,
    success: boolean,
    confidence: number,
    context: PromptContext
  ): void {
    // Find which plugin generated this prompt
    for (const [name, plugin] of this.plugins) {
      try {
        // Check if this plugin would generate this prompt
        const prompts = plugin.generatePrompts(context);
        const hasPrompt = prompts.some(p => p.name === promptName);

        if (hasPrompt) {
          plugin.provideFeedback(promptName, success, confidence, context);
          this.updatePluginMetrics(name, success, confidence);
        }
      } catch (error) {
        // Ignore errors in feedback - don't want to break the main flow
        console.error(`Error providing feedback to plugin ${name}:`, error);
      }
    }
  }

  /**
   * Update plugin metrics
   */
  private updatePluginMetrics(pluginName: string, success: boolean, confidence: number): void {
    const metrics = this.pluginMetrics.get(pluginName);
    if (!metrics) return;

    metrics.activationCount++;
    if (success) {
      metrics.successCount++;
    }

    // Update rolling average confidence
    const alpha = 0.1; // Learning rate for exponential moving average
    metrics.averageConfidence = (1 - alpha) * metrics.averageConfidence + alpha * confidence;

    metrics.lastUsed = new Date();
  }

  /**
   * Update plugin response time metrics
   */
  private updatePluginResponseTime(pluginName: string, responseTime: number): void {
    const metrics = this.pluginMetrics.get(pluginName);
    if (!metrics) return;

    // Update rolling average response time
    const alpha = 0.1;
    metrics.averageResponseTime = (1 - alpha) * metrics.averageResponseTime + alpha * responseTime;
  }

  /**
   * Update all plugin states with new context
   */
  updatePluginStates(context: PromptContext): void {
    // Store context in history
    this.contextHistory.push(context);

    // Keep history manageable
    if (this.contextHistory.length > 50) {
      this.contextHistory = this.contextHistory.slice(-25);
    }

    // Update all plugin states
    for (const plugin of this.plugins.values()) {
      try {
        plugin.updateState(context);
      } catch (error) {
        console.error(`Error updating plugin state:`, error);
      }
    }
  }

  /**
   * Get plugin activation history for analysis
   */
  getActivationHistory(
    context: PromptContext
  ): Array<{ plugin: string; priority: number; timestamp: Date }> {
    const activePlugins = this.selectActivePlugins(context);
    return activePlugins.map(activation => ({
      plugin: activation.plugin.getMetadata().name,
      priority: activation.priority,
      timestamp: new Date(),
    }));
  }

  /**
   * Configure plugin manager settings
   */
  configure(newConfig: Partial<PluginManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.error(`PluginManager configuration updated:`, this.config);
  }

  /**
   * Reset plugin metrics (useful for testing)
   */
  resetMetrics(): void {
    for (const [pluginName] of this.plugins) {
      this.pluginMetrics.set(pluginName, {
        pluginName,
        activationCount: 0,
        successCount: 0,
        averageConfidence: 0,
        lastUsed: new Date(),
        averageResponseTime: 0,
      });
    }

    console.error('Plugin metrics reset');
  }

  /**
   * Get detailed plugin status report
   */
  getStatusReport(): any {
    const plugins = Array.from(this.plugins.entries()).map(([name, plugin]) => {
      const metadata = plugin.getMetadata();
      const metrics = this.pluginMetrics.get(name);

      return {
        name,
        metadata,
        metrics,
        configOptions: plugin.getConfigOptions(),
      };
    });

    return {
      totalPlugins: this.plugins.size,
      config: this.config,
      plugins,
      contextHistoryLength: this.contextHistory.length,
    };
  }
}
