import { Mutex } from '../utils/mutex.js';
import { ValidatedThoughtData } from '../server.js';
import { ReasoningSession } from '../memory/memory-store.js';

export interface CognitiveState {
  session_id: string;
  thought_count: number;
  current_complexity: number;
  confidence_trajectory: number[];

  metacognitive_awareness: number;
  creative_pressure: number;
  analytical_depth: number;
  self_doubt_level: number;
  curiosity_level: number;
  frustration_level: number;
  engagement_level: number;

  pattern_recognition_active: boolean;
  adaptive_learning_enabled: boolean;
  self_reflection_depth: number;

  cognitive_flexibility: number;
  insight_potential: number;
  breakthrough_likelihood: number;

  recent_success_rate: number;
  improvement_trajectory: number;
  cognitive_efficiency: number;
}

export class StateTracker {
  private readonly state: CognitiveState;
  private readonly mutex = new Mutex();

  constructor(initial?: Partial<CognitiveState>) {
    this.state = {
      session_id: '',
      thought_count: 0,
      current_complexity: 5,
      confidence_trajectory: [],
      metacognitive_awareness: 0.5,
      creative_pressure: 0.3,
      analytical_depth: 0.5,
      self_doubt_level: 0.3,
      curiosity_level: 0.7,
      frustration_level: 0.2,
      engagement_level: 0.8,
      pattern_recognition_active: true,
      adaptive_learning_enabled: true,
      self_reflection_depth: 0.5,
      cognitive_flexibility: 0.6,
      insight_potential: 0.4,
      breakthrough_likelihood: 0.2,
      recent_success_rate: 0.5,
      improvement_trajectory: 0.0,
      cognitive_efficiency: 0.6,
      ...initial,
    };
  }

  public getState(): CognitiveState {
    return this.state;
  }

  public async update(
    thoughtData: ValidatedThoughtData,
    sessionContext?: Partial<ReasoningSession>
  ): Promise<void> {
    await this.mutex.withLock(async () => {
      this.state.thought_count++;
      this.state.current_complexity = this.estimateComplexity(thoughtData);
      const confidence = this.estimateConfidence(thoughtData);
      this.state.confidence_trajectory.push(confidence);
      if (this.state.confidence_trajectory.length > 10) {
        this.state.confidence_trajectory.shift();
      }
      this.state.metacognitive_awareness =
        this.calculateMetacognitiveAwareness(thoughtData);
      this.updateEmotionalState(thoughtData);
      this.updateEmergentProperties(thoughtData);
      if (sessionContext?.id && this.state.session_id !== sessionContext.id) {
        this.state.session_id = sessionContext.id;
      }
    });
  }

  public updateFromFeedback(outcome: string, impactScore: number): void {
    const successValue = outcome === 'success' ? 1 : outcome === 'partial' ? 0.5 : 0;
    this.state.recent_success_rate =
      this.state.recent_success_rate * 0.9 + successValue * 0.1;
    this.state.cognitive_efficiency =
      this.state.cognitive_efficiency * 0.9 + impactScore * 0.1;
  }

  private estimateComplexity(thoughtData: ValidatedThoughtData): number {
    const thought = thoughtData.thought.toLowerCase();
    let complexity = 5;
    if (thought.includes('complex') || thought.includes('complicated')) complexity += 2;
    if (thought.includes('multiple') || thought.includes('various')) complexity += 1;
    if (thought.includes('system') || thought.includes('architecture')) complexity += 1;
    if (thought.includes('integrate') || thought.includes('coordinate')) complexity += 1;
    if (thoughtData.branch_from_thought) complexity += 1;
    if (thoughtData.is_revision) complexity += 0.5;
    return Math.min(10, Math.max(1, complexity));
  }

  private estimateConfidence(thoughtData: ValidatedThoughtData): number {
    const thought = thoughtData.thought.toLowerCase();
    let confidence = 0.5;
    if (thought.includes('definitely') || thought.includes('certainly')) confidence += 0.3;
    if (thought.includes('clearly') || thought.includes('obviously')) confidence += 0.2;
    if (thought.includes('confident') || thought.includes('sure')) confidence += 0.2;
    if (thought.includes('maybe') || thought.includes('perhaps')) confidence -= 0.2;
    if (thought.includes('uncertain') || thought.includes('unsure')) confidence -= 0.3;
    if (thought.includes('might') || thought.includes('could be')) confidence -= 0.1;
    if (thoughtData.is_revision) confidence -= 0.1;
    return Math.min(1, Math.max(0, confidence));
  }

  private calculateMetacognitiveAwareness(thoughtData: ValidatedThoughtData): number {
    const thought = thoughtData.thought.toLowerCase();
    let awareness = 0.5;
    if (thought.includes('thinking') || thought.includes('reasoning')) awareness += 0.2;
    if (thought.includes('assumption') || thought.includes('believe')) awareness += 0.1;
    if (thought.includes('consider') || thought.includes('reflect')) awareness += 0.1;
    if (thought.includes('approach') || thought.includes('strategy')) awareness += 0.1;
    if (thoughtData.is_revision) awareness += 0.2;
    return Math.min(1, Math.max(0, awareness));
  }

  private updateEmotionalState(thoughtData: ValidatedThoughtData): void {
    const thought = thoughtData.thought.toLowerCase();
    if (thought.includes('wonder') || thought.includes('curious') || thought.includes('explore')) {
      this.state.curiosity_level = Math.min(1, this.state.curiosity_level + 0.1);
    }
    if (thought.includes('difficult') || thought.includes('stuck') || thought.includes('problem')) {
      this.state.frustration_level = Math.min(1, this.state.frustration_level + 0.1);
    } else {
      this.state.frustration_level = Math.max(0, this.state.frustration_level - 0.05);
    }
    if (
      thought.includes('interesting') ||
      thought.includes('exciting') ||
      thought.includes('important')
    ) {
      this.state.engagement_level = Math.min(1, this.state.engagement_level + 0.1);
    }
  }

  private updateEmergentProperties(thoughtData: ValidatedThoughtData): void {
    if (thoughtData.branch_from_thought || thoughtData.is_revision) {
      this.state.cognitive_flexibility = Math.min(1, this.state.cognitive_flexibility + 0.05);
    }
    const insightPotential =
      (this.state.current_complexity / 10) * 0.3 +
      this.state.metacognitive_awareness * 0.4 +
      this.state.curiosity_level * 0.3;
    this.state.insight_potential = insightPotential;
    this.state.breakthrough_likelihood = Math.min(
      1,
      this.state.insight_potential * 0.5 + this.state.cognitive_flexibility * 0.3 + this.state.creative_pressure * 0.2
    );
  }
}

