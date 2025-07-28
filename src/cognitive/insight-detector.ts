import { MemoryStore, StoredThought } from '../memory/memory-store.js';
import { CognitiveContext, PluginIntervention } from './plugin-system.js';
import { CognitiveState } from './state-tracker.js';

export interface CognitiveInsight {
  type: 'pattern_recognition' | 'breakthrough' | 'synthesis' | 'paradigm_shift';
  confidence: number;
  description: string;
  implications: string[];
  evidence: string[];
  novelty_score: number;
  impact_potential: number;
}

export class InsightDetector {
  private readonly insightHistory: CognitiveInsight[] = [];

  constructor(
    private readonly memoryStore: MemoryStore | undefined,
    private readonly state: CognitiveState,
    private readonly performanceMetrics: Map<string, number>
  ) {}

  public getHistory(): CognitiveInsight[] {
    return [...this.insightHistory];
  }

  public async detectInsights(
    context: CognitiveContext,
    interventions: PluginIntervention[]
  ): Promise<CognitiveInsight[]> {
    const insights: CognitiveInsight[] = [];

    insights.push(...(await this.detectPatternInsights(context)));
    insights.push(...(await this.detectBreakthroughs(context, interventions)));
    insights.push(...(await this.detectSynthesis(context, interventions)));

    this.insightHistory.push(...insights);
    if (this.insightHistory.length > 50) {
      this.insightHistory.splice(0, this.insightHistory.length - 50);
    }
    return insights;
  }

  private async detectPatternInsights(context: CognitiveContext): Promise<CognitiveInsight[]> {
    const insights: CognitiveInsight[] = [];
    if (!this.memoryStore) return insights;
    try {
      const recent = context.thought_history.slice(-10);
      const themes = this.extractThemes(recent);
      const recurring = themes.filter(t => t.frequency >= 3);
      for (const theme of recurring) {
        insights.push({
          type: 'pattern_recognition',
          description: `Recurring theme: "${theme.pattern}"`,
          confidence: Math.min(0.9, theme.frequency / 5),
          impact_potential: 0.6,
          implications: [`Pattern "${theme.pattern}" may be important to the problem domain`],
          evidence: theme.contexts,
          novelty_score: 0.3,
        });
      }
    } catch (err) {
      console.error('pattern insight error', err);
    }
    return insights;
  }

  private async detectBreakthroughs(
    context: CognitiveContext,
    interventions: PluginIntervention[]
  ): Promise<CognitiveInsight[]> {
    const insights: CognitiveInsight[] = [];
    const breakthroughScore = this.calculateBreakthroughScore(context, interventions);
    if (breakthroughScore > 0.7) {
      insights.push({
        type: 'breakthrough',
        description: 'Possible cognitive breakthrough detected',
        confidence: breakthroughScore,
        impact_potential: 0.8,
        implications: ['May accelerate problem solving'],
        evidence: [context.current_thought || ''],
        novelty_score: 0.8,
      });
    }
    return insights;
  }

  private async detectSynthesis(
    context: CognitiveContext,
    interventions: PluginIntervention[]
  ): Promise<CognitiveInsight[]> {
    const insights: CognitiveInsight[] = [];
    const perspectives = interventions.map(i => i.metadata.plugin_id);
    const unique = new Set(perspectives);
    if (unique.size > 1) {
      insights.push({
        type: 'synthesis',
        description: `Synthesis of ${unique.size} perspectives`,
        confidence: 0.7,
        impact_potential: 0.7,
        implications: ['Multiple viewpoints merged'],
        evidence: Array.from(unique),
        novelty_score: 0.6,
      });
    }
    return insights;
  }

  private extractThemes(
    thoughts: StoredThought[]
  ): Array<{ pattern: string; frequency: number; contexts: string[] }> {
    const themeMap = new Map<string, { count: number; contexts: string[] }>();
    thoughts.forEach(t => {
      const words = t.thought
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4);
      words.forEach(word => {
        const cur = themeMap.get(word) || { count: 0, contexts: [] };
        cur.count++;
        cur.contexts.push(t.thought.slice(0, 50));
        themeMap.set(word, cur);
      });
    });
    return Array.from(themeMap.entries()).map(([pattern, data]) => ({
      pattern,
      frequency: data.count,
      contexts: data.contexts,
    }));
  }

  private calculateBreakthroughScore(
    context: CognitiveContext,
    interventions: PluginIntervention[]
  ): number {
    let score = 0;
    score += Math.min(0.3, interventions.length * 0.1);
    score += context.metacognitive_awareness * 0.3;
    score += context.creative_pressure * 0.2 + context.confidence_level * 0.2;
    return Math.min(1, score);
  }
}
