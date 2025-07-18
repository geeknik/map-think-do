/**
 * @fileoverview Base plugin architecture for modular prompt system
 *
 * This provides the foundation for a pluggable prompt system that enables
 * different cognitive capabilities to be composed and evolved dynamically.
 * Essential for AGI-like behavior where reasoning patterns can be mixed,
 * matched, and evolved based on context.
 */

import { Prompt, PromptResult } from '../types.js';

/**
 * Context passed to prompt plugins for decision making
 */
export interface PromptContext {
  /** Current thought history */
  thoughtHistory: Array<{
    thought: string;
    thought_number: number;
    timestamp: Date;
    confidence?: number;
    branch_id?: string;
    is_revision?: boolean;
  }>;

  /** Current problem domain/context */
  domain?: string;

  /** User's current goal or objective */
  objective?: string;

  /** Available tools and capabilities */
  availableTools?: string[];

  /** Current cognitive load/complexity */
  complexity?: number;

  /** Time constraints */
  timeConstraints?: {
    urgency: 'low' | 'medium' | 'high';
    deadline?: Date;
  };

  /** Previous outcomes and their success rates */
  historicalOutcomes?: Array<{
    approach: string;
    success: boolean;
    confidence: number;
    timestamp: Date;
  }>;
}

/**
 * Plugin metadata for self-description and discovery
 */
export interface PluginMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;

  /** Cognitive capabilities this plugin provides */
  capabilities: string[];

  /** Domains where this plugin is most effective */
  domains: string[];

  /** Complexity levels this plugin handles well */
  complexityRange: [number, number]; // [min, max] on 1-10 scale

  /** Dependencies on other plugins */
  dependencies?: string[];

  /** Priority/weight for plugin selection */
  priority: number;
}

/**
 * Plugin activation conditions
 */
export interface ActivationConditions {
  /** Minimum confidence threshold to activate */
  minConfidence?: number;

  /** Required context elements */
  requiredContext?: Array<keyof PromptContext>;

  /** Domains where this plugin should activate */
  activeDomains?: string[];

  /** Complexity thresholds */
  complexityThresholds?: {
    min?: number;
    max?: number;
  };

  /** Custom activation logic */
  customCondition?: (context: PromptContext) => boolean;
}

/**
 * Abstract base class for all prompt plugins
 *
 * Plugins are the building blocks of AGI-like reasoning, each providing
 * specialized cognitive capabilities that can be composed dynamically.
 */
export abstract class BasePromptPlugin {
  protected metadata: PluginMetadata;
  protected activationConditions: ActivationConditions;

  constructor(metadata: PluginMetadata, activationConditions: ActivationConditions = {}) {
    this.metadata = metadata;
    this.activationConditions = activationConditions;
  }

  /**
   * Get plugin metadata
   */
  getMetadata(): PluginMetadata {
    return { ...this.metadata };
  }

  /**
   * Check if this plugin should activate given the current context
   */
  shouldActivate(context: PromptContext): boolean {
    const conditions = this.activationConditions;

    // Check minimum confidence
    if (conditions.minConfidence !== undefined && context.thoughtHistory.length > 0) {
      const latestThought = context.thoughtHistory[context.thoughtHistory.length - 1];
      if ((latestThought.confidence || 0) < conditions.minConfidence) {
        return false;
      }
    }

    // Check required context elements
    if (conditions.requiredContext) {
      for (const required of conditions.requiredContext) {
        if (!context[required]) {
          return false;
        }
      }
    }

    // Check domain compatibility
    if (conditions.activeDomains && context.domain) {
      if (!conditions.activeDomains.includes(context.domain)) {
        return false;
      }
    }

    // Check complexity thresholds
    if (context.complexity !== undefined) {
      if (
        conditions.complexityThresholds?.min &&
        context.complexity < conditions.complexityThresholds.min
      ) {
        return false;
      }
      if (
        conditions.complexityThresholds?.max &&
        context.complexity > conditions.complexityThresholds.max
      ) {
        return false;
      }
    }

    // Check custom condition
    if (conditions.customCondition) {
      return conditions.customCondition(context);
    }

    return true;
  }

  /**
   * Calculate activation priority for this plugin given the context
   * Higher numbers = higher priority
   */
  calculatePriority(context: PromptContext): number {
    let priority = this.metadata.priority;

    // Boost priority if we're in a preferred domain
    if (context.domain && this.metadata.domains.includes(context.domain)) {
      priority += 2;
    }

    // Boost priority if complexity is in our sweet spot
    if (context.complexity !== undefined) {
      const [minComplexity, maxComplexity] = this.metadata.complexityRange;
      if (context.complexity >= minComplexity && context.complexity <= maxComplexity) {
        priority += 1;
      }
    }

    // Boost priority based on historical success
    if (context.historicalOutcomes) {
      const relevantOutcomes = context.historicalOutcomes.filter(
        outcome => outcome.approach === this.metadata.name
      );
      if (relevantOutcomes.length > 0) {
        const successRate =
          relevantOutcomes.filter(o => o.success).length / relevantOutcomes.length;
        priority += successRate * 2; // Up to +2 for 100% success rate
      }
    }

    return priority;
  }

  /**
   * Generate prompts for the current context
   * This is the core method that each plugin must implement
   */
  abstract generatePrompts(context: PromptContext): Prompt[];

  /**
   * Generate prompt templates for the current context
   */
  abstract generateTemplates(
    context: PromptContext
  ): Record<string, (args: Record<string, string>) => PromptResult>;

  /**
   * Provide feedback on the effectiveness of prompts generated by this plugin
   * This enables the plugin to learn and improve over time
   */
  provideFeedback(
    promptName: string,
    success: boolean,
    confidence: number,
    context: PromptContext
  ): void {
    // Default implementation - plugins can override for learning
    console.error(
      `Plugin ${this.metadata.name} received feedback: ${promptName} - success: ${success}, confidence: ${confidence}`
    );
  }

  /**
   * Update plugin state based on new information
   * Enables plugins to evolve and adapt
   */
  updateState(context: PromptContext): void {
    // Default implementation - plugins can override for state management
  }

  /**
   * Get plugin-specific configuration options
   */
  getConfigOptions(): Record<string, any> {
    return {};
  }

  /**
   * Configure plugin with new settings
   */
  configure(options: Record<string, any>): void {
    // Default implementation - plugins can override for configuration
  }
}
