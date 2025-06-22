/**
 * @fileoverview External Reasoning Plugin
 * 
 * Integrates external reasoning tools with the cognitive system for enhanced capabilities.
 */

import { CognitivePlugin, CognitiveContext, PluginActivation, PluginIntervention } from '../plugin-system.js';
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
      reason: shouldActivate ? 'Mathematical or creative reasoning needs detected' : 'No external reasoning needs detected',
      estimated_impact: activationScore > 0.8 ? 'high' : activationScore > 0.5 ? 'medium' : 'low',
      resource_requirements: {
        cognitive_load: 0.3,
        time_cost: 2,
        creativity_required: needsCreative > 0.5,
        analysis_required: needsMath > 0.5
      }
    };
  }

  async intervene(context: CognitiveContext): Promise<PluginIntervention> {
    const startTime = Date.now();
    const insights: any[] = [];
    const interventions: any[] = [];
    const recommendations: string[] = [];

    try {
      // Determine which tools to use
      const toolsToUse = this.selectTools(context);
      
      // Execute tools
      const results = await this.executeTools(toolsToUse, context);
      
      // Process results
      for (const result of results) {
        if (result.success) {
          insights.push({
            type: 'external_tool_result',
            confidence: result.result?.confidence || 0.7,
            description: `${result.tool_name} provided insights`,
            tool_data: result.result
          });
          
          recommendations.push(`Successfully used ${result.tool_name} for enhanced reasoning`);
        } else {
          interventions.push({
            type: 'tool_failure',
            content: `${result.tool_name} failed: ${result.error}`,
            confidence: 0.8
          });
        }
      }

      return {
        type: 'context_enhancement',
        content: `External reasoning tools provided ${insights.length} insights and ${recommendations.length} recommendations`,
        metadata: {
          plugin_id: this.id,
          confidence: 0.8,
          expected_benefit: 'Enhanced reasoning capabilities through external tools'
        }
      };

    } catch (error) {
      return {
        type: 'meta_guidance',
        content: `External reasoning error: ${(error as Error).message}. Consider manual reasoning approach.`,
        metadata: {
          plugin_id: this.id,
          confidence: 0.7,
          expected_benefit: 'Error recovery guidance'
        }
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
      intervention_type: intervention.type
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
      learning_data: learningData
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
    const mathKeywords = ['calculate', 'equation', 'solve', 'mathematical', 'number', 'pattern'];
    const matches = mathKeywords.filter(keyword => content.includes(keyword)).length;
    return Math.min(1.0, matches * 0.25);
  }

  private detectCreativeNeeds(context: CognitiveContext): number {
    const content = context.current_thought?.toLowerCase() || '';
    const creativeKeywords = ['creative', 'idea', 'brainstorm', 'innovative', 'design', 'metaphor'];
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
          error: result.error?.message
        });
      } catch (error) {
        results.push({
          tool_id: toolId,
          tool_name: this.getToolName(toolId),
          result: null,
          success: false,
          error: (error as Error).message
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
        persona_active: 'general' // Default since not available in context
      }
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

  // Public methods
  public getAvailableTools(): any[] {
    return this.toolRegistry.getAllTools();
  }

  public getToolMetrics(): any[] {
    return this.toolRegistry.getToolMetrics();
  }
} 