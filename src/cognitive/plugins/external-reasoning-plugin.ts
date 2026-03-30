/**
 * @fileoverview External Reasoning Plugin
 *
 * Integrates external reasoning tools with the cognitive system for enhanced capabilities.
 */

import {
  CognitivePlugin,
  CognitiveContext,
  PluginActivation,
  PluginIntervention,
} from '../plugin-system.js';
import { ExternalToolRegistry, ToolInput } from '../external-reasoning/tool-registry.js';
import { MathematicalSolver } from '../external-reasoning/tools/mathematical-solver.js';
import { CreativeSynthesizer } from '../external-reasoning/tools/creative-synthesizer.js';

export class ExternalReasoningPlugin extends CognitivePlugin {
  private toolRegistry: ExternalToolRegistry;
  private activationThreshold = 0.6;

  constructor() {
    super(
      'external-reasoning',
      'External Reasoning Plugin',
      'Integrates external reasoning tools for enhanced cognitive capabilities',
      '1.0.0'
    );
    this.toolRegistry = new ExternalToolRegistry();
    this.initializeTools();
  }

  async shouldActivate(context: CognitiveContext): Promise<PluginActivation> {
    const needsMath = this.detectMathematicalNeeds(context);
    const needsCreative = this.detectCreativeNeeds(context);
    const activationScore = Math.max(needsMath, needsCreative);

    const shouldActivate = activationScore >= this.activationThreshold;

    return {
      should_activate: shouldActivate,
      priority: activationScore * 100,
      confidence: activationScore,
      reason: shouldActivate
        ? 'Mathematical or creative reasoning needs detected'
        : 'No external reasoning needs detected',
      estimated_impact: activationScore > 0.8 ? 'high' : activationScore > 0.5 ? 'medium' : 'low',
      resource_requirements: {
        cognitive_load: 0.3,
        time_cost: 2,
        creativity_required: needsCreative > 0.5,
        analysis_required: needsMath > 0.5,
      },
    };
  }

  async intervene(context: CognitiveContext): Promise<PluginIntervention> {
    try {
      // Determine which tools to use
      const toolsToUse = this.selectTools(context);

      // Execute tools
      const results = await this.executeTools(toolsToUse, context);
      const content = this.buildInterventionSummary(results, context);
      const confidence = this.deriveInterventionConfidence(results);

      return {
        type: 'context_enhancement',
        content,
        metadata: {
          plugin_id: this.id,
          confidence,
          expected_benefit:
            'Grounds reasoning in concrete tool output instead of unsupported intuition',
        },
      };
    } catch (error) {
      return {
        type: 'meta_guidance',
        content: `External reasoning error: ${(error as Error).message}. Consider manual reasoning approach.`,
        metadata: {
          plugin_id: this.id,
          confidence: 0.7,
          expected_benefit: 'Error recovery guidance',
        },
      };
    }
  }

  async receiveFeedback(
    intervention: PluginIntervention,
    outcome: 'success' | 'failure' | 'partial',
    impact_score: number,
    context: CognitiveContext
  ): Promise<void> {
    // Update metrics based on feedback
    this.updateMetrics(intervention, outcome, impact_score, Date.now(), context);

    // Emit feedback event for monitoring
    this.emit('feedback_received', {
      plugin_id: this.id,
      outcome,
      impact_score,
      intervention_type: intervention.type,
    });
  }

  async adapt(learningData: any): Promise<void> {
    // Adapt activation threshold based on performance
    if (learningData.success_rate < 0.5) {
      this.activationThreshold = Math.min(0.9, this.activationThreshold + 0.1);
    } else if (learningData.success_rate > 0.8) {
      this.activationThreshold = Math.max(0.3, this.activationThreshold - 0.05);
    }

    // Emit adaptation event
    this.emit('adapted', {
      plugin_id: this.id,
      new_threshold: this.activationThreshold,
      learning_data: learningData,
    });
  }

  private initializeTools(): void {
    try {
      this.toolRegistry.registerTool(new MathematicalSolver());
      this.toolRegistry.registerTool(new CreativeSynthesizer());
    } catch (error) {
      console.error(`Failed to initialize tools: ${(error as Error).message}`);
    }
  }

  private detectMathematicalNeeds(context: CognitiveContext): number {
    const content = context.current_thought?.toLowerCase() || '';
    const mathKeywords = [
      'calculate',
      'equation',
      'solve',
      'mathematical',
      'number',
      'pattern',
      'latency',
      'throughput',
      'estimate',
      'compare',
      'probability',
      'rate',
    ];
    const matches = mathKeywords.filter(keyword => content.includes(keyword)).length;
    return Math.min(1.0, matches * 0.25);
  }

  private detectCreativeNeeds(context: CognitiveContext): number {
    const content = context.current_thought?.toLowerCase() || '';
    const creativeKeywords = [
      'creative',
      'idea',
      'brainstorm',
      'innovative',
      'design',
      'metaphor',
      'alternative',
      'concept',
      'combine',
      'reframe',
    ];
    const matches = creativeKeywords.filter(keyword => content.includes(keyword)).length;
    // Note: persona_active is not available in CognitiveContext, so we'll skip this check
    return Math.min(1.0, matches * 0.3);
  }

  private selectTools(context: CognitiveContext): string[] {
    const tools: string[] = [];

    if (this.detectMathematicalNeeds(context) > 0.5) {
      tools.push('mathematical-solver');
    }

    if (this.detectCreativeNeeds(context) > 0.5) {
      tools.push('creative-synthesizer');
    }

    return tools;
  }

  private async executeTools(toolIds: string[], context: CognitiveContext): Promise<any[]> {
    const results: any[] = [];

    for (const toolId of toolIds) {
      try {
        const toolInput = this.createToolInput(toolId, context);
        const result = await this.toolRegistry.executeTool(toolId, toolInput);

        results.push({
          tool_id: toolId,
          tool_name: this.getToolName(toolId),
          result: result.result,
          success: result.success,
          error: result.error?.message,
        });
      } catch (error) {
        results.push({
          tool_id: toolId,
          tool_name: this.getToolName(toolId),
          result: null,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return results;
  }

  private createToolInput(toolId: string, context: CognitiveContext): ToolInput {
    const content = context.current_thought || '';

    let operation = 'default';
    const parameters: Record<string, any> = {};

    if (toolId === 'mathematical-solver') {
      if (content.includes('calculate')) {
        operation = 'calculate';
        const expr = content.match(/[\d+\-*/().\s=]+/)?.[0];
        if (expr) parameters.expression = expr.trim();
      } else if (content.includes('solve')) {
        operation = 'solve_equation';
        const eq = content.match(/[^.!?]*=.*[^.!?]*/)?.[0];
        if (eq) parameters.equation = eq.trim();
      } else {
        operation = 'calculate';
        parameters.expression = '2 + 2'; // Default
      }
    }

    if (toolId === 'creative-synthesizer') {
      if (content.includes('idea')) {
        operation = 'generate_ideas';
        parameters.topic = this.extractTopic(content);
      } else if (content.includes('combine')) {
        operation = 'combine_concepts';
        parameters.concept1 = 'innovation';
        parameters.concept2 = 'technology';
      } else {
        operation = 'generate_ideas';
        parameters.topic = this.extractTopic(content);
      }
    }

    return {
      operation,
      parameters,
      context: {
        session_id: context.session?.id || 'default',
        thought_id: context.thought_history[0]?.id || 'current',
        persona_active: 'general', // Default since not available in context
      },
    };
  }

  private extractTopic(content: string): string {
    const topicMatch = content.match(/ideas?\s+(?:for|about)\s+([^.!?]+)/i);
    if (topicMatch) return topicMatch[1].trim();

    const words = content.split(/\s+/).slice(0, 3);
    return words.join(' ') || 'general topic';
  }

  private getToolName(toolId: string): string {
    const tool = this.toolRegistry.getTool(toolId);
    return tool?.name || toolId;
  }

  private buildInterventionSummary(results: any[], context: CognitiveContext): string {
    const successfulResults = results.filter(result => result.success);
    const failedResults = results.filter(result => !result.success);
    const findings = successfulResults.map(result => this.summarizeSuccessfulResult(result));
    const nextChecks = this.generateNextChecks(successfulResults, failedResults, context);

    if (successfulResults.length === 0 && failedResults.length === 0) {
      return 'External reasoning was requested but no suitable tool could be selected. Continue manually and refine the request if tool support is needed.';
    }

    const sections: string[] = [];

    if (findings.length > 0) {
      sections.push(`External tool findings:\n${findings.map(line => `- ${line}`).join('\n')}`);
    }

    if (failedResults.length > 0) {
      sections.push(
        `Tool issues:\n${failedResults
          .map(result => `- ${result.tool_name} failed: ${result.error || 'unknown error'}`)
          .join('\n')}`
      );
    }

    if (nextChecks.length > 0) {
      sections.push(`Recommended next checks:\n${nextChecks.map(line => `- ${line}`).join('\n')}`);
    }

    return sections.join('\n\n');
  }

  private summarizeSuccessfulResult(result: any): string {
    const payload = result.result || {};

    if (result.tool_id === 'mathematical-solver') {
      if (typeof payload.formatted === 'string') {
        return `${result.tool_name}: computed ${payload.formatted}.`;
      }
      if (Array.isArray(payload.solutions) && payload.solutions.length > 0) {
        return `${result.tool_name}: found solution set ${payload.solutions.join(', ')}.`;
      }
    }

    if (result.tool_id === 'creative-synthesizer') {
      if (Array.isArray(payload.ideas) && payload.ideas.length > 0) {
        const topIdea = payload.ideas[0];
        const ideaText =
          typeof topIdea === 'string'
            ? topIdea
            : topIdea.idea || topIdea.description || topIdea.prompt || 'a promising idea';
        return `${result.tool_name}: surfaced "${ideaText}".`;
      }
      if (Array.isArray(payload.candidate_solutions) && payload.candidate_solutions.length > 0) {
        const topSolution = payload.candidate_solutions[0];
        return `${result.tool_name}: suggested "${topSolution.solution || 'an analogy-driven option'}".`;
      }
    }

    return `${result.tool_name}: produced structured output with confidence ${Math.round((payload.confidence || 0.7) * 100)}%.`;
  }

  private generateNextChecks(
    successfulResults: any[],
    failedResults: any[],
    context: CognitiveContext
  ): string[] {
    const checks: string[] = [];

    if (successfulResults.some(result => result.tool_id === 'mathematical-solver')) {
      checks.push(
        'Use the computed result to verify the numeric assumption behind the current plan.'
      );
    }

    if (successfulResults.some(result => result.tool_id === 'creative-synthesizer')) {
      checks.push(
        'Compare the top generated idea against the baseline approach on feasibility and risk.'
      );
    }

    if (failedResults.length > 0) {
      checks.push(
        'If a tool failed, simplify the request or restate the problem in a more structured form.'
      );
    }

    if (context.confidence_level < 0.4) {
      checks.push(
        'Prefer a small validation step before building further reasoning on these results.'
      );
    }

    return Array.from(new Set(checks)).slice(0, 3);
  }

  private deriveInterventionConfidence(results: any[]): number {
    const successful = results.filter(result => result.success);
    if (successful.length === 0) {
      return 0.45;
    }

    const averageConfidence =
      successful.reduce((sum, result) => sum + (result.result?.confidence || 0.7), 0) /
      successful.length;

    return Math.max(0.55, Math.min(0.95, averageConfidence));
  }

  // Public methods
  public getAvailableTools(): any[] {
    return this.toolRegistry.getAllTools();
  }

  public getToolMetrics(): any[] {
    return this.toolRegistry.getToolMetrics();
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await super.destroy();
    // The tool registry doesn't have persistent connections
    // but we should clear any references
    this.toolRegistry = null as any;
  }
}
