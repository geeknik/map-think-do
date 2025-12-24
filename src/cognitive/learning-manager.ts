/**
 * @fileoverview Active Learning Manager v2.0
 *
 * Enhanced learning system with:
 * - Multi-armed bandit strategy selection (UCB1 algorithm)
 * - Thompson Sampling for exploration/exploitation
 * - Cognitive strategy effectiveness tracking
 * - Adaptive learning rate based on performance variance
 * - Pattern-based strategy recommendations
 * - Cross-session knowledge transfer
 * - Experience replay for stable learning
 */

import { EventEmitter } from 'events';
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

/**
 * Cognitive strategy definition
 */
export interface CognitiveStrategy {
  id: string;
  name: string;
  description: string;
  suitable_for: {
    domains: string[];
    complexity_range: [number, number];
    urgency_levels: ('low' | 'medium' | 'high')[];
  };
  parameters: Record<string, number>;
}

/**
 * Strategy performance record for multi-armed bandit
 */
interface StrategyArm {
  strategy_id: string;
  pulls: number; // Number of times this strategy was selected
  total_reward: number; // Cumulative reward
  mean_reward: number; // Average reward
  variance: number; // Reward variance for UCB calculations
  last_reward: number;
  alpha: number; // Beta distribution alpha (successes + 1)
  beta: number; // Beta distribution beta (failures + 1)
  reward_history: number[]; // Recent rewards for variance calculation
}

/**
 * Context feature vector for strategy selection
 */
interface ContextFeatures {
  complexity: number;
  urgency_score: number;
  domain_encoded: number;
  session_progress: number;
  confidence_level: number;
  creative_pressure: number;
  metacognitive_awareness: number;
}

/**
 * Learning episode for experience replay
 */
interface LearningEpisode {
  context_features: ContextFeatures;
  strategy_id: string;
  reward: number;
  timestamp: Date;
}

/**
 * Strategy recommendation with confidence
 */
export interface StrategyRecommendation {
  strategy: CognitiveStrategy;
  confidence: number;
  expected_reward: number;
  reasoning: string;
  alternative_strategies: Array<{
    strategy: CognitiveStrategy;
    confidence: number;
  }>;
}

export class LearningManager extends EventEmitter {
  private readonly learningData = new Map<string, LearningData>();
  private readonly performanceMetrics = new Map<string, number>();
  private readonly adaptationTriggers = new Set<string>();
  private readonly interventionPatterns = new Map<string, InterventionPattern>();
  private readonly insightPatterns = new Map<string, InsightPattern>();
  private readonly pluginEffectiveness = new Map<string, number>();

  // Strategy selection via multi-armed bandit
  private readonly strategyArms = new Map<string, StrategyArm>();
  private readonly strategies = new Map<string, CognitiveStrategy>();

  // Experience replay buffer
  private readonly experienceBuffer: LearningEpisode[] = [];
  private readonly maxExperienceBuffer = 1000;

  // Domain-specific learning
  private readonly domainStrategies = new Map<string, Map<string, StrategyArm>>();

  // Adaptive learning rate
  private currentLearningRate: number;
  private readonly minLearningRate = 0.01;
  private readonly maxLearningRate = 0.3;
  private performanceHistory: number[] = [];
  private readonly performanceWindowSize = 50;

  // UCB exploration parameter
  private explorationParam = 2.0; // sqrt(2) is commonly used
  private totalPulls = 0;

  // Domain encoding for feature vectors
  private readonly domainEncoding = new Map<string, number>();
  private domainCounter = 0;

  constructor(baseLearningRate: number) {
    super();
    this.currentLearningRate = baseLearningRate;
    this.initializeDefaultStrategies();
  }

  // ============================================================================
  // Strategy Initialization
  // ============================================================================

  /**
   * Initialize default cognitive strategies
   */
  private initializeDefaultStrategies(): void {
    const defaultStrategies: CognitiveStrategy[] = [
      {
        id: 'analytical_decomposition',
        name: 'Analytical Decomposition',
        description: 'Break complex problems into smaller, manageable parts',
        suitable_for: {
          domains: ['technical', 'engineering', 'mathematics', 'general'],
          complexity_range: [5, 10],
          urgency_levels: ['low', 'medium'],
        },
        parameters: {
          depth: 3,
          breadth: 4,
          iteration_limit: 10,
        },
      },
      {
        id: 'creative_exploration',
        name: 'Creative Exploration',
        description: 'Generate diverse ideas through lateral thinking',
        suitable_for: {
          domains: ['creative', 'design', 'innovation', 'general'],
          complexity_range: [3, 8],
          urgency_levels: ['low', 'medium'],
        },
        parameters: {
          divergence_factor: 0.8,
          novelty_weight: 0.7,
          constraint_relaxation: 0.5,
        },
      },
      {
        id: 'systematic_verification',
        name: 'Systematic Verification',
        description: 'Rigorous step-by-step validation of reasoning',
        suitable_for: {
          domains: ['technical', 'scientific', 'legal', 'general'],
          complexity_range: [4, 10],
          urgency_levels: ['low', 'medium', 'high'],
        },
        parameters: {
          verification_depth: 2,
          counterexample_search: 0.6,
          confidence_threshold: 0.8,
        },
      },
      {
        id: 'rapid_heuristic',
        name: 'Rapid Heuristic',
        description: 'Quick pattern-based decision making for time pressure',
        suitable_for: {
          domains: ['general'],
          complexity_range: [1, 6],
          urgency_levels: ['high'],
        },
        parameters: {
          heuristic_weight: 0.9,
          deliberation_limit: 3,
          satisficing_threshold: 0.7,
        },
      },
      {
        id: 'metacognitive_monitoring',
        name: 'Metacognitive Monitoring',
        description: 'Continuous self-reflection and strategy adjustment',
        suitable_for: {
          domains: ['general'],
          complexity_range: [6, 10],
          urgency_levels: ['low', 'medium'],
        },
        parameters: {
          reflection_frequency: 0.3,
          bias_detection_sensitivity: 0.7,
          strategy_switching_threshold: 0.4,
        },
      },
      {
        id: 'analogical_transfer',
        name: 'Analogical Transfer',
        description: 'Apply solutions from similar past problems',
        suitable_for: {
          domains: ['general'],
          complexity_range: [4, 9],
          urgency_levels: ['low', 'medium', 'high'],
        },
        parameters: {
          similarity_threshold: 0.6,
          adaptation_depth: 2,
          cross_domain_weight: 0.4,
        },
      },
      {
        id: 'constraint_satisfaction',
        name: 'Constraint Satisfaction',
        description: 'Find solutions that satisfy all given constraints',
        suitable_for: {
          domains: ['technical', 'engineering', 'scheduling', 'general'],
          complexity_range: [5, 10],
          urgency_levels: ['low', 'medium'],
        },
        parameters: {
          constraint_priority_decay: 0.9,
          backtrack_limit: 5,
          relaxation_factor: 0.2,
        },
      },
      {
        id: 'collaborative_synthesis',
        name: 'Collaborative Synthesis',
        description: 'Integrate multiple perspectives and approaches',
        suitable_for: {
          domains: ['general'],
          complexity_range: [5, 10],
          urgency_levels: ['low', 'medium'],
        },
        parameters: {
          perspective_count: 4,
          integration_depth: 2,
          conflict_resolution_weight: 0.6,
        },
      },
    ];

    for (const strategy of defaultStrategies) {
      this.registerStrategy(strategy);
    }
  }

  /**
   * Register a new cognitive strategy
   */
  public registerStrategy(strategy: CognitiveStrategy): void {
    this.strategies.set(strategy.id, strategy);

    // Initialize arm for multi-armed bandit
    this.strategyArms.set(strategy.id, {
      strategy_id: strategy.id,
      pulls: 0,
      total_reward: 0,
      mean_reward: 0.5, // Optimistic initialization
      variance: 0.25,
      last_reward: 0.5,
      alpha: 1, // Uniform prior
      beta: 1,
      reward_history: [],
    });

    this.emit('strategy_registered', { strategy });
  }

  // ============================================================================
  // Strategy Selection (Multi-Armed Bandit)
  // ============================================================================

  /**
   * Select the best strategy for the given context using UCB1 with Thompson Sampling
   */
  public selectStrategy(context: CognitiveContext): StrategyRecommendation {
    const features = this.extractContextFeatures(context);
    const eligibleStrategies = this.filterEligibleStrategies(context);

    if (eligibleStrategies.length === 0) {
      // Fallback to analytical decomposition
      const fallback = this.strategies.get('analytical_decomposition')!;
      return {
        strategy: fallback,
        confidence: 0.5,
        expected_reward: 0.5,
        reasoning: 'No eligible strategies found, using default',
        alternative_strategies: [],
      };
    }

    // Calculate UCB scores for each eligible strategy
    const strategyScores: Array<{
      strategy: CognitiveStrategy;
      ucb_score: number;
      thompson_sample: number;
      combined_score: number;
      expected_reward: number;
    }> = [];

    for (const strategy of eligibleStrategies) {
      const arm = this.getStrategyArm(strategy.id, context.domain);
      const ucb_score = this.calculateUCB(arm);
      const thompson_sample = this.thompsonSample(arm);
      const context_fit = this.calculateContextFit(strategy, features);

      // Combined score: UCB for exploration, Thompson for randomization, context fit for relevance
      const combined_score = 0.4 * ucb_score + 0.3 * thompson_sample + 0.3 * context_fit;

      strategyScores.push({
        strategy,
        ucb_score,
        thompson_sample,
        combined_score,
        expected_reward: arm.mean_reward,
      });
    }

    // Sort by combined score
    strategyScores.sort((a, b) => b.combined_score - a.combined_score);

    const best = strategyScores[0];
    const alternatives = strategyScores.slice(1, 4).map(s => ({
      strategy: s.strategy,
      confidence: s.combined_score,
    }));

    // Generate reasoning
    const reasoning = this.generateSelectionReasoning(best, features, context);

    return {
      strategy: best.strategy,
      confidence: Math.min(1, best.combined_score),
      expected_reward: best.expected_reward,
      reasoning,
      alternative_strategies: alternatives,
    };
  }

  /**
   * Calculate Upper Confidence Bound (UCB1) score
   */
  private calculateUCB(arm: StrategyArm): number {
    if (arm.pulls === 0) {
      return Infinity; // Ensure unexplored arms are tried
    }

    const exploitation = arm.mean_reward;
    const exploration =
      this.explorationParam * Math.sqrt(Math.log(this.totalPulls + 1) / arm.pulls);

    return exploitation + exploration;
  }

  /**
   * Thompson Sampling: sample from Beta distribution
   */
  private thompsonSample(arm: StrategyArm): number {
    // Use approximation for Beta distribution sampling
    // Beta(alpha, beta) ≈ Gamma(alpha, 1) / (Gamma(alpha, 1) + Gamma(beta, 1))
    const gammaSample = (shape: number): number => {
      // Marsaglia and Tsang's method for gamma sampling
      if (shape < 1) {
        return gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
      }

      const d = shape - 1 / 3;
      const c = 1 / Math.sqrt(9 * d);

      while (true) {
        let x: number, v: number;
        do {
          x = this.normalRandom();
          v = 1 + c * x;
        } while (v <= 0);

        v = v * v * v;
        const u = Math.random();

        if (u < 1 - 0.0331 * x * x * x * x) {
          return d * v;
        }

        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
          return d * v;
        }
      }
    };

    const sample_alpha = gammaSample(arm.alpha);
    const sample_beta = gammaSample(arm.beta);

    return sample_alpha / (sample_alpha + sample_beta);
  }

  /**
   * Generate standard normal random number (Box-Muller)
   */
  private normalRandom(): number {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Calculate how well a strategy fits the current context
   */
  private calculateContextFit(strategy: CognitiveStrategy, features: ContextFeatures): number {
    let score = 0;
    let factors = 0;

    // Complexity fit
    const [minComp, maxComp] = strategy.suitable_for.complexity_range;
    if (features.complexity >= minComp && features.complexity <= maxComp) {
      // Prefer strategies that match complexity well
      const mid = (minComp + maxComp) / 2;
      const range = (maxComp - minComp) / 2;
      const fit = 1 - Math.abs(features.complexity - mid) / range;
      score += fit;
    } else {
      score += 0.2; // Penalty for out-of-range
    }
    factors++;

    // Urgency fit
    const contextUrgency = ['low', 'medium', 'high'][Math.floor(features.urgency_score * 2.99)] as
      | 'low'
      | 'medium'
      | 'high';
    if (strategy.suitable_for.urgency_levels.includes(contextUrgency)) {
      score += 1;
    } else {
      score += 0.3;
    }
    factors++;

    // Creative pressure alignment
    if (strategy.id === 'creative_exploration' && features.creative_pressure > 0.6) {
      score += features.creative_pressure;
      factors++;
    }

    // Metacognitive alignment
    if (strategy.id === 'metacognitive_monitoring' && features.metacognitive_awareness > 0.7) {
      score += features.metacognitive_awareness;
      factors++;
    }

    return score / factors;
  }

  /**
   * Filter strategies eligible for the current context
   */
  private filterEligibleStrategies(context: CognitiveContext): CognitiveStrategy[] {
    return Array.from(this.strategies.values()).filter(strategy => {
      // Check domain match (empty domains means universal)
      if (
        strategy.suitable_for.domains.length > 0 &&
        !strategy.suitable_for.domains.includes('general')
      ) {
        if (context.domain && !strategy.suitable_for.domains.includes(context.domain)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Extract feature vector from context
   */
  private extractContextFeatures(context: CognitiveContext): ContextFeatures {
    // Encode domain as number
    if (context.domain && !this.domainEncoding.has(context.domain)) {
      this.domainEncoding.set(context.domain, this.domainCounter++);
    }

    const urgencyMap: Record<string, number> = { low: 0.33, medium: 0.66, high: 1.0 };

    return {
      complexity: context.complexity / 10, // Normalize to 0-1
      urgency_score: urgencyMap[context.urgency] || 0.5,
      domain_encoded: context.domain ? (this.domainEncoding.get(context.domain)! % 10) / 10 : 0.5,
      session_progress: context.session?.total_thoughts
        ? Math.min(1, context.session.total_thoughts / 20)
        : 0,
      confidence_level: context.confidence_level,
      creative_pressure: context.creative_pressure,
      metacognitive_awareness: context.metacognitive_awareness,
    };
  }

  /**
   * Get strategy arm, domain-specific if available
   */
  private getStrategyArm(strategyId: string, domain?: string): StrategyArm {
    if (domain) {
      const domainArms = this.domainStrategies.get(domain);
      if (domainArms?.has(strategyId)) {
        return domainArms.get(strategyId)!;
      }
    }
    return (
      this.strategyArms.get(strategyId) || {
        strategy_id: strategyId,
        pulls: 0,
        total_reward: 0,
        mean_reward: 0.5,
        variance: 0.25,
        last_reward: 0.5,
        alpha: 1,
        beta: 1,
        reward_history: [],
      }
    );
  }

  /**
   * Generate human-readable reasoning for strategy selection
   */
  private generateSelectionReasoning(
    selected: {
      strategy: CognitiveStrategy;
      ucb_score: number;
      thompson_sample: number;
      combined_score: number;
    },
    features: ContextFeatures,
    context: CognitiveContext
  ): string {
    const reasons: string[] = [];

    reasons.push(
      `Selected "${selected.strategy.name}" (score: ${selected.combined_score.toFixed(2)})`
    );

    if (features.complexity > 0.7) {
      reasons.push(
        `High complexity (${(features.complexity * 10).toFixed(1)}) favors structured approach`
      );
    }

    if (features.urgency_score > 0.8) {
      reasons.push('High urgency requires rapid decision-making');
    }

    if (features.creative_pressure > 0.6) {
      reasons.push('Elevated creative pressure suggests exploratory approach');
    }

    const arm = this.getStrategyArm(selected.strategy.id, context.domain);
    if (arm.pulls > 5) {
      reasons.push(
        `Historical success rate: ${(arm.mean_reward * 100).toFixed(0)}% over ${arm.pulls} uses`
      );
    } else {
      reasons.push('Limited historical data - exploring this strategy');
    }

    return reasons.join('. ');
  }

  // ============================================================================
  // Learning and Feedback
  // ============================================================================

  /**
   * Update strategy performance based on outcome
   */
  public updateStrategyReward(strategyId: string, reward: number, context: CognitiveContext): void {
    const arm = this.getStrategyArm(strategyId, context.domain);

    // Update pull count
    arm.pulls++;
    this.totalPulls++;

    // Update reward history for variance calculation
    arm.reward_history.push(reward);
    if (arm.reward_history.length > 50) {
      arm.reward_history.shift();
    }

    // Update running mean
    const oldMean = arm.mean_reward;
    arm.total_reward += reward;
    arm.mean_reward = arm.total_reward / arm.pulls;
    arm.last_reward = reward;

    // Update variance using Welford's online algorithm
    if (arm.pulls > 1) {
      const delta = reward - oldMean;
      const delta2 = reward - arm.mean_reward;
      arm.variance = (arm.variance * (arm.pulls - 2) + delta * delta2) / (arm.pulls - 1);
    }

    // Update Beta distribution parameters
    if (reward >= 0.5) {
      arm.alpha += reward; // Proportional success
    } else {
      arm.beta += 1 - reward; // Proportional failure
    }

    // Store in global and domain-specific maps
    this.strategyArms.set(strategyId, arm);

    if (context.domain) {
      if (!this.domainStrategies.has(context.domain)) {
        this.domainStrategies.set(context.domain, new Map());
      }
      this.domainStrategies.get(context.domain)!.set(strategyId, { ...arm });
    }

    // Add to experience buffer
    this.addExperience({
      context_features: this.extractContextFeatures(context),
      strategy_id: strategyId,
      reward,
      timestamp: new Date(),
    });

    // Update performance history for adaptive learning rate
    this.updatePerformanceHistory(reward);

    this.emit('strategy_reward_updated', { strategyId, reward, arm });
  }

  /**
   * Add experience to replay buffer
   */
  private addExperience(episode: LearningEpisode): void {
    this.experienceBuffer.push(episode);
    if (this.experienceBuffer.length > this.maxExperienceBuffer) {
      this.experienceBuffer.shift();
    }
  }

  /**
   * Update performance history and adapt learning rate
   */
  private updatePerformanceHistory(reward: number): void {
    this.performanceHistory.push(reward);
    if (this.performanceHistory.length > this.performanceWindowSize) {
      this.performanceHistory.shift();
    }

    // Adapt learning rate based on performance variance
    if (this.performanceHistory.length >= 10) {
      const mean =
        this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
      const variance =
        this.performanceHistory.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
        this.performanceHistory.length;

      // High variance -> increase learning rate (need to adapt faster)
      // Low variance -> decrease learning rate (stable, fine-tune)
      const varianceNorm = Math.min(1, variance * 4); // Normalize, assuming max variance ~0.25
      this.currentLearningRate =
        this.minLearningRate +
        (this.maxLearningRate - this.minLearningRate) * (0.5 + 0.5 * varianceNorm);

      // Also adapt exploration
      this.explorationParam = 1.5 + varianceNorm; // More exploration when unstable
    }
  }

  // ============================================================================
  // Original Methods (Enhanced)
  // ============================================================================

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
      const newScore =
        existingScore * (1 - this.currentLearningRate) + effectiveness * this.currentLearningRate;
      this.pluginEffectiveness.set(contextKey, Math.max(0.1, Math.min(1.0, newScore)));
    }

    this.emit('feedback_learned', { outcome, impactScore, context: context.domain });
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
    this.performanceMetrics.set('current_learning_rate', this.currentLearningRate);
    this.performanceMetrics.set('total_strategy_pulls', this.totalPulls);
    this.performanceMetrics.set('exploration_param', this.explorationParam);

    // Add strategy performance summary
    for (const [id, arm] of this.strategyArms) {
      if (arm.pulls > 0) {
        this.performanceMetrics.set(`strategy_${id}_mean_reward`, arm.mean_reward);
        this.performanceMetrics.set(`strategy_${id}_pulls`, arm.pulls);
      }
    }
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
        // Increase exploration when performance is poor
        this.explorationParam = Math.min(3.0, this.explorationParam * 1.2);
        break;
      case 'low_success_rate':
        // Reset poorly performing strategies
        for (const [_id, arm] of this.strategyArms) {
          if (arm.pulls > 10 && arm.mean_reward < 0.3) {
            arm.alpha = 1;
            arm.beta = 1;
            arm.mean_reward = 0.5;
            this.strategyArms.set(arm.strategy_id, arm);
          }
        }
        break;
      case 'low_efficiency':
        // Reduce exploration when we need more exploitation
        this.explorationParam = Math.max(1.0, this.explorationParam * 0.8);
        break;
    }

    this.emit('adaptation_performed', { trigger });
  }

  // ============================================================================
  // Analytics and Reporting
  // ============================================================================

  /**
   * Get strategy performance summary
   */
  public getStrategyPerformance(): Array<{
    id: string;
    name: string;
    pulls: number;
    mean_reward: number;
    variance: number;
    confidence_interval: [number, number];
  }> {
    const results: Array<{
      id: string;
      name: string;
      pulls: number;
      mean_reward: number;
      variance: number;
      confidence_interval: [number, number];
    }> = [];

    for (const [id, arm] of this.strategyArms) {
      const strategy = this.strategies.get(id);
      if (!strategy) continue;

      // 95% confidence interval
      const z = 1.96;
      const se = arm.pulls > 0 ? Math.sqrt(arm.variance / arm.pulls) : 0.5;
      const ci: [number, number] = [
        Math.max(0, arm.mean_reward - z * se),
        Math.min(1, arm.mean_reward + z * se),
      ];

      results.push({
        id,
        name: strategy.name,
        pulls: arm.pulls,
        mean_reward: arm.mean_reward,
        variance: arm.variance,
        confidence_interval: ci,
      });
    }

    return results.sort((a, b) => b.mean_reward - a.mean_reward);
  }

  /**
   * Get domain-specific insights
   */
  public getDomainInsights(domain: string): {
    best_strategies: string[];
    avg_performance: number;
    total_episodes: number;
    recommendations: string[];
  } {
    const domainArms = this.domainStrategies.get(domain);
    if (!domainArms) {
      return {
        best_strategies: [],
        avg_performance: 0.5,
        total_episodes: 0,
        recommendations: ['No domain-specific data available yet'],
      };
    }

    const strategies = Array.from(domainArms.entries())
      .filter(([_, arm]) => arm.pulls > 2)
      .sort((a, b) => b[1].mean_reward - a[1].mean_reward);

    const totalPulls = strategies.reduce((sum, [_, arm]) => sum + arm.pulls, 0);
    const weightedAvg =
      strategies.reduce((sum, [_, arm]) => sum + arm.mean_reward * arm.pulls, 0) /
      Math.max(1, totalPulls);

    const recommendations: string[] = [];
    if (strategies.length > 0) {
      const best = this.strategies.get(strategies[0][0]);
      if (best) {
        recommendations.push(`"${best.name}" performs best in ${domain} domain`);
      }

      if (strategies.length > 1) {
        const worst = strategies[strategies.length - 1];
        const worstStrategy = this.strategies.get(worst[0]);
        if (worstStrategy && worst[1].mean_reward < 0.4) {
          recommendations.push(`Consider avoiding "${worstStrategy.name}" for ${domain} problems`);
        }
      }
    }

    return {
      best_strategies: strategies.slice(0, 3).map(([id]) => id),
      avg_performance: weightedAvg,
      total_episodes: totalPulls,
      recommendations,
    };
  }

  /**
   * Get current learning rate
   */
  public getCurrentLearningRate(): number {
    return this.currentLearningRate;
  }

  /**
   * Get all registered strategies
   */
  public getStrategies(): CognitiveStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Export learning state for persistence
   */
  public exportState(): {
    strategyArms: Record<string, StrategyArm>;
    domainStrategies: Record<string, Record<string, StrategyArm>>;
    performanceHistory: number[];
    totalPulls: number;
  } {
    const domainStrategiesObj: Record<string, Record<string, StrategyArm>> = {};
    for (const [domain, arms] of this.domainStrategies) {
      domainStrategiesObj[domain] = Object.fromEntries(arms);
    }

    return {
      strategyArms: Object.fromEntries(this.strategyArms),
      domainStrategies: domainStrategiesObj,
      performanceHistory: [...this.performanceHistory],
      totalPulls: this.totalPulls,
    };
  }

  /**
   * Import learning state from persistence
   */
  public importState(state: {
    strategyArms: Record<string, StrategyArm>;
    domainStrategies: Record<string, Record<string, StrategyArm>>;
    performanceHistory: number[];
    totalPulls: number;
  }): void {
    for (const [id, arm] of Object.entries(state.strategyArms)) {
      if (this.strategies.has(id)) {
        this.strategyArms.set(id, arm);
      }
    }

    for (const [domain, arms] of Object.entries(state.domainStrategies)) {
      this.domainStrategies.set(domain, new Map(Object.entries(arms)));
    }

    this.performanceHistory = state.performanceHistory;
    this.totalPulls = state.totalPulls;

    this.emit('state_imported');
  }
}
