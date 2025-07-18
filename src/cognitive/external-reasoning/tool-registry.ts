/**
 * @fileoverview External Tool Registry for AGI System
 *
 * This module manages external reasoning tools that the AGI can use to extend
 * its cognitive capabilities. Tools can include mathematical solvers, code
 * analyzers, web search, database queries, and other specialized reasoning modules.
 */

import { EventEmitter } from 'events';

/**
 * External tool capability definition
 */
export interface ExternalTool {
  id: string;
  name: string;
  description: string;
  category:
    | 'mathematical'
    | 'analytical'
    | 'creative'
    | 'research'
    | 'computational'
    | 'communication'
    | 'storage';
  version: string;
  capabilities: string[];

  // Tool configuration
  config: {
    timeout_ms: number;
    max_retries: number;
    requires_auth: boolean;
    rate_limit?: {
      requests_per_minute: number;
      burst_limit: number;
    };
  };

  // Tool interface
  execute(input: ToolInput): Promise<ToolOutput>;
  validate(input: ToolInput): Promise<ValidationResult>;
  getSchema(): ToolSchema;
}

/**
 * Tool input/output interfaces
 */
export interface ToolInput {
  operation: string;
  parameters: Record<string, any>;
  context?: {
    session_id: string;
    thought_id: string;
    persona_active?: string;
    cognitive_state?: any;
  };
  metadata?: Record<string, any>;
}

export interface ToolOutput {
  success: boolean;
  result: any;
  metadata: {
    execution_time_ms: number;
    tool_version: string;
    confidence?: number;
    reasoning_trace?: string[];
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ToolSchema {
  operations: {
    [operation: string]: {
      description: string;
      parameters: Record<string, any>;
      returns: Record<string, any>;
      examples: any[];
    };
  };
}

/**
 * Tool usage analytics
 */
export interface ToolUsageMetrics {
  tool_id: string;
  total_calls: number;
  success_rate: number;
  average_execution_time: number;
  error_patterns: Record<string, number>;
  performance_trend: {
    timestamp: Date;
    success_rate: number;
    avg_time: number;
  }[];
}

/**
 * External Tool Registry
 */
export class ExternalToolRegistry extends EventEmitter {
  private tools: Map<string, ExternalTool> = new Map();
  private usageMetrics: Map<string, ToolUsageMetrics> = new Map();
  private toolCategories: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.initializeCategories();
  }

  /**
   * Register a new external tool
   */
  registerTool(tool: ExternalTool): void {
    // Validate tool
    this.validateTool(tool);

    // Register tool
    this.tools.set(tool.id, tool);

    // Initialize metrics
    this.usageMetrics.set(tool.id, {
      tool_id: tool.id,
      total_calls: 0,
      success_rate: 1.0,
      average_execution_time: 0,
      error_patterns: {},
      performance_trend: [],
    });

    // Add to category
    if (!this.toolCategories.has(tool.category)) {
      this.toolCategories.set(tool.category, new Set());
    }
    this.toolCategories.get(tool.category)!.add(tool.id);

    this.emit('tool_registered', { tool_id: tool.id, category: tool.category });
    console.error(`🔧 External tool registered: ${tool.name} (${tool.id})`);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolId: string): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) return false;

    this.tools.delete(toolId);
    this.usageMetrics.delete(toolId);

    // Remove from category
    const category = this.toolCategories.get(tool.category);
    if (category) {
      category.delete(toolId);
    }

    this.emit('tool_unregistered', { tool_id: toolId });
    console.error(`🔧 External tool unregistered: ${toolId}`);
    return true;
  }

  /**
   * Execute a tool operation
   */
  async executeTool(toolId: string, input: ToolInput): Promise<ToolOutput> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const startTime = Date.now();

    try {
      // Validate input
      const validation = await tool.validate(input);
      if (!validation.valid) {
        throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
      }

      // Execute tool
      const result = await tool.execute(input);
      const executionTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(toolId, true, executionTime);

      this.emit('tool_executed', {
        tool_id: toolId,
        success: true,
        execution_time: executionTime,
        input: input.operation,
      });

      return {
        ...result,
        metadata: {
          ...result.metadata,
          execution_time_ms: executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateMetrics(toolId, false, executionTime, error as Error);

      this.emit('tool_executed', {
        tool_id: toolId,
        success: false,
        execution_time: executionTime,
        error: (error as Error).message,
      });

      return {
        success: false,
        result: null,
        metadata: {
          execution_time_ms: executionTime,
          tool_version: tool.version,
        },
        error: {
          code: 'EXECUTION_ERROR',
          message: (error as Error).message,
          details: error,
        },
      };
    }
  }

  /**
   * Get available tools by category
   */
  getToolsByCategory(category: string): ExternalTool[] {
    const toolIds = this.toolCategories.get(category) || new Set();
    return Array.from(toolIds)
      .map(id => this.tools.get(id))
      .filter(tool => tool !== undefined) as ExternalTool[];
  }

  /**
   * Search tools by capability
   */
  searchToolsByCapability(capability: string): ExternalTool[] {
    return Array.from(this.tools.values()).filter(tool =>
      tool.capabilities.some(cap => cap.toLowerCase().includes(capability.toLowerCase()))
    );
  }

  /**
   * Get tool recommendations based on context
   */
  recommendTools(context: {
    domain?: string;
    complexity?: number;
    persona_active?: string;
    required_capabilities?: string[];
  }): ExternalTool[] {
    const recommendations: { tool: ExternalTool; score: number }[] = [];

    for (const tool of this.tools.values()) {
      let score = 0;

      // Domain matching
      if (context.domain) {
        if (tool.capabilities.some(cap => cap.includes(context.domain!))) {
          score += 3;
        }
      }

      // Complexity matching
      if (context.complexity) {
        const toolComplexity = this.estimateToolComplexity(tool);
        const complexityMatch = 1 - Math.abs(toolComplexity - context.complexity) / 10;
        score += complexityMatch * 2;
      }

      // Persona matching
      if (context.persona_active) {
        const personaMatch = this.getPersonaToolAffinity(context.persona_active, tool);
        score += personaMatch;
      }

      // Required capabilities
      if (context.required_capabilities) {
        const capabilityMatch =
          context.required_capabilities.filter(req =>
            tool.capabilities.some(cap => cap.includes(req))
          ).length / context.required_capabilities.length;
        score += capabilityMatch * 4;
      }

      // Performance factor
      const metrics = this.usageMetrics.get(tool.id);
      if (metrics) {
        score += metrics.success_rate * 1;
        score -= Math.log(metrics.average_execution_time + 1) * 0.1;
      }

      recommendations.push({ tool, score });
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(rec => rec.tool);
  }

  /**
   * Get tool usage analytics
   */
  getToolMetrics(toolId?: string): ToolUsageMetrics[] {
    if (toolId) {
      const metrics = this.usageMetrics.get(toolId);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.usageMetrics.values());
  }

  /**
   * Get all available tools
   */
  getAllTools(): ExternalTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): ExternalTool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Private helper methods
   */
  private validateTool(tool: ExternalTool): void {
    if (!tool.id || !tool.name || !tool.execute) {
      throw new Error('Invalid tool: missing required fields');
    }

    if (this.tools.has(tool.id)) {
      throw new Error(`Tool already registered: ${tool.id}`);
    }
  }

  private initializeCategories(): void {
    const categories = [
      'mathematical',
      'analytical',
      'creative',
      'research',
      'computational',
      'communication',
      'storage',
    ];
    categories.forEach(cat => this.toolCategories.set(cat, new Set()));
  }

  private updateMetrics(
    toolId: string,
    success: boolean,
    executionTime: number,
    error?: Error
  ): void {
    const metrics = this.usageMetrics.get(toolId);
    if (!metrics) return;

    metrics.total_calls++;

    // Update success rate (exponential moving average)
    const alpha = 0.1;
    metrics.success_rate = success
      ? metrics.success_rate * (1 - alpha) + alpha
      : metrics.success_rate * (1 - alpha);

    // Update average execution time
    metrics.average_execution_time =
      (metrics.average_execution_time * (metrics.total_calls - 1) + executionTime) /
      metrics.total_calls;

    // Track error patterns
    if (error) {
      const errorType = error.constructor.name;
      metrics.error_patterns[errorType] = (metrics.error_patterns[errorType] || 0) + 1;
    }

    // Update performance trend
    metrics.performance_trend.push({
      timestamp: new Date(),
      success_rate: metrics.success_rate,
      avg_time: metrics.average_execution_time,
    });

    // Keep only last 100 trend points
    if (metrics.performance_trend.length > 100) {
      metrics.performance_trend = metrics.performance_trend.slice(-100);
    }
  }

  private estimateToolComplexity(tool: ExternalTool): number {
    // Simple heuristic based on capabilities and configuration
    let complexity = tool.capabilities.length * 0.5;

    if (tool.config.requires_auth) complexity += 1;
    if (tool.config.rate_limit) complexity += 1;
    if (tool.config.timeout_ms > 5000) complexity += 1;

    return Math.min(10, complexity);
  }

  private getPersonaToolAffinity(persona: string, tool: ExternalTool): number {
    const affinities: Record<string, Record<string, number>> = {
      strategist: {
        analytical: 3,
        research: 3,
        computational: 2,
      },
      engineer: {
        computational: 3,
        analytical: 2,
        mathematical: 3,
      },
      creative: {
        creative: 3,
        research: 2,
        communication: 2,
      },
      analyst: {
        analytical: 3,
        mathematical: 3,
        computational: 2,
      },
      philosopher: {
        research: 3,
        analytical: 2,
        communication: 2,
      },
    };

    return affinities[persona]?.[tool.category] || 1;
  }
}
