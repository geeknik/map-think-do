import { CognitiveContext, PluginIntervention } from './plugin-system.js';
import { CognitiveInsight } from './insight-detector.js';

interface LearningData {
  count: number;
  total_impact: number;
  interventions: Array<{
    plugin_id: string;
    effectiveness: number;
    context_complexity: number;
    outcome_quality: number;
    timestamp: string;
  }>;
}

interface InterventionPattern {
  success_count: number;
  total_count: number;
  typical_impact: number;
  contexts_used: string[];
}

interface InsightPattern {
  insight_frequency: number;
  average_novelty: number;
  breakthrough_contexts: Array<{
    domain?: string;
    complexity: number;
    urgency: string;
    session_phase: number;
    timestamp: string;
  }>;
  total_insights: number;
}

export class LearningManager {
  private readonly learningData = new Map<string, LearningData>();
  private readonly performanceMetrics = new Map<string, number>();
  private readonly adaptationTriggers = new Set<string>();
  private readonly interventionPatterns = new Map<string, InterventionPattern>();
  private readonly insightPatterns = new Map<string, InsightPattern>();
  private readonly pluginEffectiveness = new Map<string, number>();

  constructor(private readonly learningRate: number) {}

  public getPerformanceMetrics(): Map<string, number> {
    return this.performanceMetrics;
  }

  public learnFromFeedback(
    interventions: PluginIntervention[],
    outcome: string,
    impactScore: number,
    context: CognitiveContext
  ): void {
    const learningKey = `${context.domain}_${context.complexity}_${outcome}`;
    const existing = this.learningData.get(learningKey) || {
      count: 0,
      total_impact: 0,
      interventions: [],
    };

    const interventionEffectiveness = new Map<string, number>();
    for (const iv of interventions) {
      const id = iv.metadata.plugin_id;
      const score = interventionEffectiveness.get(id) || 0;
      interventionEffectiveness.set(id, score + impactScore / interventions.length);
    }

    const updated = [...existing.interventions];
    interventions.forEach(iv => {
      updated.push({
        plugin_id: iv.metadata.plugin_id,
        effectiveness: interventionEffectiveness.get(iv.metadata.plugin_id) || 0,
        context_complexity: context.complexity,
        outcome_quality: impactScore,
        timestamp: new Date().toISOString(),
      });
    });

    this.learningData.set(learningKey, {
      count: existing.count + 1,
      total_impact: existing.total_impact + impactScore,
      interventions: updated.slice(-50),
    });

    for (const [pluginId, effectiveness] of interventionEffectiveness.entries()) {
      const contextKey = `${pluginId}_${context.domain}_${context.complexity}`;
      const existingScore = this.pluginEffectiveness.get(contextKey) || 0.5;
      const newScore = existingScore * (1 - this.learningRate) + effectiveness * this.learningRate;
      this.pluginEffectiveness.set(contextKey, Math.max(0.1, Math.min(1.0, newScore)));
    }
  }

  public learnInterventionPatterns(
    context: CognitiveContext,
    interventions: PluginIntervention[]
  ): void {
    for (const iv of interventions) {
      const key = `${iv.metadata.plugin_id}_${context.domain}_${context.complexity}`;
      const existing = this.interventionPatterns.get(key) || {
        success_count: 0,
        total_count: 0,
        typical_impact: 0,
        contexts_used: [],
      };

      existing.total_count++;
      if (iv.metadata.confidence > 0.6) {
        existing.success_count++;
      }
      existing.typical_impact =
        (existing.typical_impact * (existing.total_count - 1) + iv.metadata.confidence) /
        existing.total_count;

      const signature = `${context.domain}_${context.complexity}_${context.urgency}`;
      if (!existing.contexts_used.includes(signature)) {
        existing.contexts_used.push(signature);
        existing.contexts_used = existing.contexts_used.slice(-20);
      }

      this.interventionPatterns.set(key, existing);
    }
  }

  public learnInsightPatterns(context: CognitiveContext, insights: CognitiveInsight[]): void {
    for (const insight of insights) {
      const key = `insights_${context.domain}_${context.complexity}`;
      const existing = this.insightPatterns.get(key) || {
        insight_frequency: 0,
        average_novelty: 0,
        breakthrough_contexts: [],
        total_insights: 0,
      };

      existing.total_insights++;
      const length = context.session?.total_thoughts || context.thought_history.length || 1;
      existing.insight_frequency = existing.total_insights / Math.max(1, length);
      existing.average_novelty =
        (existing.average_novelty * (existing.total_insights - 1) + insight.novelty_score) /
        existing.total_insights;

      if (insight.confidence > 0.7 && insight.novelty_score > 0.7) {
        const snapshot = {
          domain: context.domain,
          complexity: context.complexity,
          urgency: context.urgency,
          session_phase: context.session?.total_thoughts || context.thought_history.length || 0,
          timestamp: new Date().toISOString(),
        };
        existing.breakthrough_contexts.push(snapshot);
        existing.breakthrough_contexts = existing.breakthrough_contexts.slice(-10);
      }

      this.insightPatterns.set(key, existing);
    }
  }

  public updatePerformanceMetrics(
    context: CognitiveContext,
    interventions: PluginIntervention[],
    insights: CognitiveInsight[]
  ): void {
    this.performanceMetrics.set('interventions_per_thought', interventions.length);
    this.performanceMetrics.set('insights_per_thought', insights.length);
  }

  public shouldAdapt(): boolean {
    return this.adaptationTriggers.size > 0;
  }

  public async performAdaptation(): Promise<void> {
    for (const trigger of this.adaptationTriggers) {
      await this.handleAdaptationTrigger(trigger);
    }
    this.adaptationTriggers.clear();
  }

  private async handleAdaptationTrigger(trigger: string): Promise<void> {
    switch (trigger) {
      case 'poor_performance':
        break;
      case 'low_success_rate':
        break;
      case 'low_efficiency':
        break;
    }
  }
}
