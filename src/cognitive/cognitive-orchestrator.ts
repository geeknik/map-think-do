/**
 * @fileoverview Cognitive Orchestrator - The Brain of the AGI System
 *
 * This orchestrator integrates all cognitive plugins and manages the overall
 * cognitive behavior of the system. It provides the high-level intelligence
 * that coordinates different cognitive capabilities to produce AGI-like behavior.
 *
 * Key responsibilities:
 * - Cognitive plugin management and coordination
 * - Context analysis and cognitive state management
 * - Adaptive learning and self-improvement
 * - Memory integration and pattern recognition
 * - Emergent behavior facilitation
 */

import { EventEmitter } from 'events';
import { ErrorSeverity, handleError } from '../utils/error-handler.js';
import { Mutex } from '../utils/mutex.js';
import {
  CognitivePluginManager,
  CognitiveContext,
  PluginIntervention,
  CognitivePlugin,
  PluginMetrics,
} from './plugin-system.js';
import { MetacognitivePlugin } from './plugins/metacognitive-plugin.js';
import { PersonaPlugin } from './plugins/persona-plugin.js';
import { ExternalReasoningPlugin } from './plugins/external-reasoning-plugin.js';
import { Phase5IntegrationPlugin } from './plugins/phase5-integration-plugin.js';
import { MemoryStore, StoredThought, ReasoningSession } from '../memory/memory-store.js';
import { ValidatedThoughtData } from '../server.js';

/**
 * Learning data structure for pattern recognition
 */
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

/**
 * Intervention pattern data for context-specific learning
 */
interface InterventionPattern {
  success_count: number;
  total_count: number;
  typical_impact: number;
  contexts_used: string[];
}

/**
 * Insight pattern data for tracking cognitive breakthroughs
 */
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
 * Cognitive state tracking
 */
interface CognitiveState {
  // Current reasoning state
  session_id: string;
  thought_count: number;
  current_complexity: number;
  confidence_trajectory: number[];

  // Cognitive metrics
  metacognitive_awareness: number;
  creative_pressure: number;
  analytical_depth: number;
  self_doubt_level: number;
  curiosity_level: number;
  frustration_level: number;
  engagement_level: number;

  // Learning state
  pattern_recognition_active: boolean;
  adaptive_learning_enabled: boolean;
  self_reflection_depth: number;

  // Emergent properties
  cognitive_flexibility: number;
  insight_potential: number;
  breakthrough_likelihood: number;

  // Performance tracking
  recent_success_rate: number;
  improvement_trajectory: number;
  cognitive_efficiency: number;
}

/**
 * Orchestrator configuration
 */
interface OrchestratorConfig {
  // Plugin management
  max_concurrent_interventions: number;
  intervention_cooldown_ms: number;
  adaptive_plugin_selection: boolean;

  // Learning settings
  learning_rate: number;
  memory_integration_enabled: boolean;
  pattern_recognition_threshold: number;
  adaptive_learning_enabled: boolean;

  // Emergence settings
  emergence_detection_enabled: boolean;
  breakthrough_detection_sensitivity: number;
  insight_cultivation_enabled: boolean;

  // Performance settings
  performance_monitoring_enabled: boolean;
  self_optimization_enabled: boolean;
  cognitive_load_balancing: boolean;
}

/**
 * Cognitive insight detection
 */
interface CognitiveInsight {
  type: 'pattern_recognition' | 'breakthrough' | 'synthesis' | 'paradigm_shift';
  confidence: number;
  description: string;
  implications: string[];
  evidence: string[];
  novelty_score: number;
  impact_potential: number;
}

/**
 * Main Cognitive Orchestrator
 */
export class CognitiveOrchestrator extends EventEmitter {
  private pluginManager: CognitivePluginManager;
  private memoryStore?: MemoryStore;
  private cognitiveState: CognitiveState;
  private config: OrchestratorConfig;

  // Plugin instances
  private metacognitivePlugin: MetacognitivePlugin;
  private personaPlugin: PersonaPlugin;
  private externalReasoningPlugin: ExternalReasoningPlugin;
  private phase5IntegrationPlugin: Phase5IntegrationPlugin;

  // State tracking
  private sessionHistory: Map<string, ReasoningSession> = new Map();
  private interventionHistory: PluginIntervention[] = [];
  private insightHistory: CognitiveInsight[] = [];
  private lastInterventionTime: number = 0;
  private thoughtOutputHistory: string[] = [];

  // Learning and adaptation
  private learningData: Map<string, LearningData> = new Map();
  private performanceMetrics: Map<string, number> = new Map();
  private adaptationTriggers: Set<string> = new Set();
  private interventionPatterns: Map<string, InterventionPattern> = new Map();
  private insightPatterns: Map<string, InsightPattern> = new Map();
  private pluginEffectiveness: Map<string, number> = new Map();

  // Memory management limits
  private readonly MAX_SESSION_HISTORY = 100;
  private readonly MAX_INTERVENTION_HISTORY = 500;
  private readonly MAX_INSIGHT_HISTORY = 200;
  private readonly MAX_THOUGHT_OUTPUT_HISTORY = 50;

  // Synchronization
  private readonly stateMutex = new Mutex();

  constructor(config: Partial<OrchestratorConfig> = {}, memoryStore?: MemoryStore) {
    super();

    this.config = {
      max_concurrent_interventions: 3,
      intervention_cooldown_ms: 1000,
      adaptive_plugin_selection: true,
      learning_rate: 0.1,
      memory_integration_enabled: true,
      pattern_recognition_threshold: 0.7,
      adaptive_learning_enabled: true,
      emergence_detection_enabled: true,
      breakthrough_detection_sensitivity: 0.8,
      insight_cultivation_enabled: true,
      performance_monitoring_enabled: true,
      self_optimization_enabled: true,
      cognitive_load_balancing: true,
      ...config,
    };

    this.memoryStore = memoryStore;

    // Initialize cognitive state
    this.cognitiveState = {
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
    };

    // Initialize plugin manager
    this.pluginManager = new CognitivePluginManager({
      maxConcurrentPlugins: this.config.max_concurrent_interventions,
      adaptivePriority: this.config.adaptive_plugin_selection,
      learningEnabled: this.config.memory_integration_enabled,
    });

    // Initialize core plugins
    this.metacognitivePlugin = new MetacognitivePlugin();
    this.personaPlugin = new PersonaPlugin();
    this.externalReasoningPlugin = new ExternalReasoningPlugin();
    this.phase5IntegrationPlugin = new Phase5IntegrationPlugin(this.memoryStore!);

    // Register plugins
    this.pluginManager.registerPlugin(this.metacognitivePlugin);
    this.pluginManager.registerPlugin(this.personaPlugin);
    this.pluginManager.registerPlugin(this.externalReasoningPlugin);
    this.pluginManager.registerPlugin(this.phase5IntegrationPlugin);

    // Set up plugin relationships
    this.setupPluginRelationships();

    // Set up event listeners
    this.setupEventListeners();

    console.error('Cognitive Orchestrator initialized with AGI-like capabilities');
  }

  /**
   * Process a thought with full cognitive orchestration
   */
  async processThought(
    thoughtData: ValidatedThoughtData,
    sessionContext?: Partial<ReasoningSession>
  ): Promise<{
    interventions: PluginIntervention[];
    insights: CognitiveInsight[];
    cognitiveState: CognitiveState;
    recommendations: string[];
  }> {
    const startTime = Date.now();

    try {
      // Update cognitive state
      await this.updateCognitiveState(thoughtData, sessionContext);

      // Build cognitive context
      const context = await this.buildCognitiveContext(thoughtData, sessionContext);

      // Check intervention cooldown
      if (Date.now() - this.lastInterventionTime < this.config.intervention_cooldown_ms) {
        return {
          interventions: [],
          insights: [],
          cognitiveState: this.cognitiveState,
          recommendations: ['Cognitive cooldown active - allowing natural processing'],
        };
      }

      // Orchestrate cognitive interventions
      const interventions = await this.orchestrateInterventions(context);

      // Detect insights and emergent patterns
      const insights = await this.detectInsights(context, interventions);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(context, interventions, insights);

      // Record output for reflection
      this.thoughtOutputHistory.push(interventions.map(i => i.content).join('\n'));

      // Enforce memory limits periodically
      if (this.cognitiveState.thought_count % 10 === 0) {
        this.enforceMemoryLimits();
      }

      // Update memory if available
      if (this.memoryStore) {
        await this.updateMemory(thoughtData, context, interventions, insights);
      }

      // Learn and adapt
      await this.learnAndAdapt(context, interventions, insights);

      // Update intervention time
      if (interventions.length > 0) {
        this.lastInterventionTime = Date.now();
      }

      const processingTime = Date.now() - startTime;

      // Emit orchestration event
      this.emit('thought_processed', {
        thought: thoughtData,
        interventions,
        insights,
        cognitiveState: this.cognitiveState,
        processing_time: processingTime,
      });

      return {
        interventions,
        insights,
        cognitiveState: this.cognitiveState,
        recommendations,
      };
    } catch (error) {
      handleError('CognitiveOrchestrator', 'processThought', error, ErrorSeverity.ERROR, {
        thoughtNumber: thoughtData.thought_number,
        sessionId: this.cognitiveState.session_id,
      });

      this.emit('orchestration_error', { error, thought: thoughtData });

      // For critical components, we should propagate the error
      if (this.cognitiveState.thought_count < 1) {
        // First thought failure is critical
        throw error;
      }

      return {
        interventions: [],
        insights: [],
        cognitiveState: this.cognitiveState,
        recommendations: ['Error in cognitive processing - continuing with basic reasoning'],
      };
    }
  }

  /**
   * Provide feedback on intervention effectiveness
   */
  async provideFeedback(
    interventions: PluginIntervention[],
    outcome: 'success' | 'failure' | 'partial',
    impact_score: number,
    context: CognitiveContext
  ): Promise<void> {
    try {
      // Provide feedback to plugin manager
      await this.pluginManager.provideFeedback(interventions, outcome, impact_score, context);

      // Update cognitive state based on feedback
      this.updateCognitiveStateFromFeedback(outcome, impact_score);

      // Learn from feedback
      await this.learnFromFeedback(interventions, outcome, impact_score, context);

      // Check for adaptation triggers
      this.checkAdaptationTriggers(outcome, impact_score);
    } catch (error) {
      handleError('CognitiveOrchestrator', 'provideFeedback', error, ErrorSeverity.WARNING, {
        outcome,
        impactScore: impact_score,
        sessionId: this.cognitiveState.session_id,
      });
      // Feedback errors shouldn't break the flow but should be monitored
    }
  }

  /**
   * Get current cognitive state
   */
  getCognitiveState(): CognitiveState {
    return { ...this.cognitiveState };
  }

  /**
   * Get plugin performance summary
   */
  getPluginPerformance(): Record<string, PluginMetrics> {
    return this.pluginManager.getPerformanceSummary();
  }

  /**
   * Add a custom cognitive plugin
   */
  addPlugin(plugin: CognitivePlugin): void {
    this.pluginManager.registerPlugin(plugin);
  }

  /**
   * Remove a cognitive plugin
   */
  removePlugin(pluginId: string): boolean {
    return this.pluginManager.unregisterPlugin(pluginId);
  }

  /**
   * Update orchestrator configuration
   */
  updateConfig(newConfig: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', this.config);
  }

  /**
   * Get insight history
   */
  getInsightHistory(): CognitiveInsight[] {
    return [...this.insightHistory];
  }

  /**
   * Reset cognitive state (useful for testing)
   */
  reset(): void {
    this.cognitiveState = {
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
    };

    this.sessionHistory.clear();
    this.interventionHistory = [];
    this.insightHistory = [];
    this.lastInterventionTime = 0;
    this.learningData.clear();
    this.performanceMetrics.clear();
    this.adaptationTriggers.clear();
  }

  // Private methods

  /**
   * Update cognitive state based on new thought
   */
  private async updateCognitiveState(
    thoughtData: ValidatedThoughtData,
    sessionContext?: Partial<ReasoningSession>
  ): Promise<void> {
    // Use mutex to prevent race conditions during state updates
    await this.stateMutex.withLock(async () => {
      // Update basic state
      this.cognitiveState.thought_count++;
      this.cognitiveState.current_complexity = this.estimateComplexity(thoughtData);

      // Update confidence trajectory
      const confidence = this.estimateConfidence(thoughtData);
      this.cognitiveState.confidence_trajectory.push(confidence);
      if (this.cognitiveState.confidence_trajectory.length > 10) {
        this.cognitiveState.confidence_trajectory.shift();
      }

      // Update metacognitive awareness
      this.cognitiveState.metacognitive_awareness =
        this.calculateMetacognitiveAwareness(thoughtData);

      // Update emotional/motivational state
      this.updateEmotionalState(thoughtData);

      // Update emergent properties
      this.updateEmergentProperties(thoughtData);

      // Update session ID if needed
      if (sessionContext?.id && this.cognitiveState.session_id !== sessionContext.id) {
        this.cognitiveState.session_id = sessionContext.id;
      }
    });
  }

  /**
   * Build comprehensive cognitive context
   */
  private async buildCognitiveContext(
    thoughtData: ValidatedThoughtData,
    sessionContext?: Partial<ReasoningSession>
  ): Promise<CognitiveContext> {
    // Get thought history from memory or session
    const thoughtHistory = await this.getThoughtHistory();

    // Get similar past sessions
    const similarSessions = await this.getSimilarSessions(sessionContext);

    // Extract success and failure patterns
    const { successPatterns, failurePatterns } = await this.extractPatterns();

    // Determine domain
    const domain = this.inferDomain(thoughtData, sessionContext);

    // Calculate urgency
    const urgency = this.calculateUrgency(thoughtData, sessionContext);

    // Get available tools (this would be expanded based on actual system capabilities)
    const availableTools = ['code-reasoning', 'memory-store', 'pattern-recognition'];

    const context: CognitiveContext = {
      current_thought: thoughtData.thought,
      thought_history: thoughtHistory,
      session: sessionContext || {},
      domain,
      complexity: this.cognitiveState.current_complexity,
      urgency,
      confidence_level: this.cognitiveState.confidence_trajectory.slice(-1)[0] || 0.5,
      available_tools: availableTools,
      time_constraints: this.extractTimeConstraints(thoughtData, sessionContext),
      similar_past_sessions: similarSessions,
      success_patterns: successPatterns,
      failure_patterns: failurePatterns,
      curiosity_level: this.cognitiveState.curiosity_level,
      frustration_level: this.cognitiveState.frustration_level,
      engagement_level: this.cognitiveState.engagement_level,
      metacognitive_awareness: this.cognitiveState.metacognitive_awareness,
      self_doubt_level: this.cognitiveState.self_doubt_level,
      creative_pressure: this.cognitiveState.creative_pressure,
      last_thought_output: this.thoughtOutputHistory.slice(-1)[0],
      context_trace: this.thoughtOutputHistory.slice(-5),
    };

    return context;
  }

  /**
   * Orchestrate cognitive interventions
   */
  private async orchestrateInterventions(context: CognitiveContext): Promise<PluginIntervention[]> {
    // Use plugin manager to orchestrate interventions
    const interventions = await this.pluginManager.orchestrate(context);

    // Store interventions in history
    this.interventionHistory.push(...interventions);

    // Keep intervention history manageable
    if (this.interventionHistory.length > 100) {
      this.interventionHistory = this.interventionHistory.slice(-50);
    }

    return interventions;
  }

  /**
   * Detect cognitive insights and emergent patterns
   */
  private async detectInsights(
    context: CognitiveContext,
    interventions: PluginIntervention[]
  ): Promise<CognitiveInsight[]> {
    if (!this.config.emergence_detection_enabled) {
      return [];
    }

    const insights: CognitiveInsight[] = [];

    // Pattern recognition insights
    const patternInsights = await this.detectPatternInsights(context);
    insights.push(...patternInsights);

    // Breakthrough detection
    const breakthroughInsights = await this.detectBreakthroughs(context, interventions);
    insights.push(...breakthroughInsights);

    // Synthesis insights
    const synthesisInsights = await this.detectSynthesis(context, interventions);
    insights.push(...synthesisInsights);

    // Store insights
    this.insightHistory.push(...insights);

    // Keep insight history manageable
    if (this.insightHistory.length > 50) {
      this.insightHistory = this.insightHistory.slice(-25);
    }

    return insights;
  }

  /**
   * Generate cognitive recommendations
   */
  private async generateRecommendations(
    context: CognitiveContext,
    interventions: PluginIntervention[],
    insights: CognitiveInsight[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Complexity-based recommendations
    if (context.complexity > 8 && context.confidence_level > 0.8) {
      recommendations.push('Consider breaking down this complex problem into smaller components');
    }

    // Confidence-based recommendations
    if (context.confidence_level < 0.3) {
      recommendations.push('Low confidence detected - consider gathering more information');
    }

    // Intervention-based recommendations
    if (interventions.length === 0 && context.complexity > 6) {
      recommendations.push(
        'Complex problem with no cognitive interventions - consider seeking alternative perspectives'
      );
    }

    // Insight-based recommendations
    if (insights.length > 0) {
      recommendations.push(
        `${insights.length} cognitive insight(s) detected - consider exploring these further`
      );
    }

    // Emotional state recommendations
    if (context.frustration_level && context.frustration_level > 0.7) {
      recommendations.push(
        'High frustration detected - consider taking a break or changing approach'
      );
    }

    // Metacognitive recommendations
    if (context.metacognitive_awareness < 0.4) {
      recommendations.push(
        'Low metacognitive awareness - consider reflecting on your thinking process'
      );
    }

    return recommendations;
  }

  /**
   * Update memory with current cognitive state
   */
  private async updateMemory(
    thoughtData: ValidatedThoughtData,
    context: CognitiveContext,
    interventions: PluginIntervention[],
    insights: CognitiveInsight[]
  ): Promise<void> {
    if (!this.memoryStore) return;

    try {
      // Create stored thought
      const storedThought: StoredThought = {
        id: this.generateThoughtId(),
        thought: thoughtData.thought,
        thought_number: thoughtData.thought_number,
        total_thoughts: thoughtData.total_thoughts,
        next_thought_needed: thoughtData.next_thought_needed,
        is_revision: thoughtData.is_revision,
        revises_thought: thoughtData.revises_thought,
        branch_from_thought: thoughtData.branch_from_thought,
        branch_id: thoughtData.branch_id,
        needs_more_thoughts: thoughtData.needs_more_thoughts,
        timestamp: new Date(),
        session_id: this.cognitiveState.session_id,
        confidence: context.confidence_level,
        domain: context.domain,
        complexity: context.complexity,
        context: {
          available_tools: context.available_tools,
          time_constraints: context.time_constraints
            ? {
                urgency: 'medium' as const,
                deadline: context.time_constraints.deadline,
              }
            : undefined,
          problem_type: context.domain,
          cognitive_load: this.calculateCognitiveLoad(interventions),
        },
        output: interventions.map(i => i.content).join('\n'),
        context_trace: this.thoughtOutputHistory.slice(-5),
        tags: this.generateTags(thoughtData, context, interventions, insights),
        patterns_detected: insights.map(insight => insight.type),
        outcome_quality: this.assessOutcomeQuality(context, interventions, insights),
      };

      await this.memoryStore.storeThought(storedThought);
    } catch (error) {
      handleError('CognitiveOrchestrator', 'updateMemory', error, ErrorSeverity.WARNING, {
        thoughtId: thoughtData.thought,
        sessionId: this.cognitiveState.session_id,
      });
      // Memory errors are not critical, but we should track them
    }
  }

  /**
   * Learn and adapt from current processing
   */
  private async learnAndAdapt(
    context: CognitiveContext,
    interventions: PluginIntervention[],
    insights: CognitiveInsight[]
  ): Promise<void> {
    if (!this.config.adaptive_learning_enabled) return;

    try {
      // Learn from intervention patterns
      this.learnInterventionPatterns(context, interventions);

      // Learn from insight patterns
      this.learnInsightPatterns(context, insights);

      // Update performance metrics
      this.updatePerformanceMetrics(context, interventions, insights);

      // Check for adaptation needs
      if (this.shouldAdapt()) {
        await this.performAdaptation();
      }
    } catch (error) {
      console.error('Error in learning and adaptation:', error);
    }
  }

  // Helper methods for cognitive processing

  private estimateComplexity(thoughtData: ValidatedThoughtData): number {
    // Simple heuristic - could be made more sophisticated
    const thought = thoughtData.thought.toLowerCase();
    let complexity = 5; // Base complexity

    // Increase complexity based on certain indicators
    if (thought.includes('complex') || thought.includes('complicated')) complexity += 2;
    if (thought.includes('multiple') || thought.includes('various')) complexity += 1;
    if (thought.includes('system') || thought.includes('architecture')) complexity += 1;
    if (thought.includes('integrate') || thought.includes('coordinate')) complexity += 1;
    if (thoughtData.branch_from_thought) complexity += 1; // Branching adds complexity
    if (thoughtData.is_revision) complexity += 0.5; // Revision indicates some complexity

    return Math.min(10, Math.max(1, complexity));
  }

  private estimateConfidence(thoughtData: ValidatedThoughtData): number {
    // Simple confidence estimation based on language patterns
    const thought = thoughtData.thought.toLowerCase();
    let confidence = 0.5; // Base confidence

    // High confidence indicators
    if (thought.includes('definitely') || thought.includes('certainly')) confidence += 0.3;
    if (thought.includes('clearly') || thought.includes('obviously')) confidence += 0.2;
    if (thought.includes('confident') || thought.includes('sure')) confidence += 0.2;

    // Low confidence indicators
    if (thought.includes('maybe') || thought.includes('perhaps')) confidence -= 0.2;
    if (thought.includes('uncertain') || thought.includes('unsure')) confidence -= 0.3;
    if (thought.includes('might') || thought.includes('could be')) confidence -= 0.1;

    // Revision indicates some uncertainty
    if (thoughtData.is_revision) confidence -= 0.1;

    return Math.min(1, Math.max(0, confidence));
  }

  private calculateMetacognitiveAwareness(thoughtData: ValidatedThoughtData): number {
    const thought = thoughtData.thought.toLowerCase();
    let awareness = 0.5;

    // Metacognitive indicators
    if (thought.includes('thinking') || thought.includes('reasoning')) awareness += 0.2;
    if (thought.includes('assumption') || thought.includes('believe')) awareness += 0.1;
    if (thought.includes('consider') || thought.includes('reflect')) awareness += 0.1;
    if (thought.includes('approach') || thought.includes('strategy')) awareness += 0.1;
    if (thoughtData.is_revision) awareness += 0.2; // Revision shows metacognitive awareness

    return Math.min(1, Math.max(0, awareness));
  }

  private updateEmotionalState(thoughtData: ValidatedThoughtData): void {
    const thought = thoughtData.thought.toLowerCase();

    // Update curiosity
    if (thought.includes('wonder') || thought.includes('curious') || thought.includes('explore')) {
      this.cognitiveState.curiosity_level = Math.min(1, this.cognitiveState.curiosity_level + 0.1);
    }

    // Update frustration
    if (thought.includes('difficult') || thought.includes('stuck') || thought.includes('problem')) {
      this.cognitiveState.frustration_level = Math.min(
        1,
        this.cognitiveState.frustration_level + 0.1
      );
    } else {
      this.cognitiveState.frustration_level = Math.max(
        0,
        this.cognitiveState.frustration_level - 0.05
      );
    }

    // Update engagement
    if (
      thought.includes('interesting') ||
      thought.includes('exciting') ||
      thought.includes('important')
    ) {
      this.cognitiveState.engagement_level = Math.min(
        1,
        this.cognitiveState.engagement_level + 0.1
      );
    }
  }

  private updateEmergentProperties(thoughtData: ValidatedThoughtData): void {
    // Update cognitive flexibility
    if (thoughtData.branch_from_thought || thoughtData.is_revision) {
      this.cognitiveState.cognitive_flexibility = Math.min(
        1,
        this.cognitiveState.cognitive_flexibility + 0.05
      );
    }

    // Update insight potential based on complexity and awareness
    const insightPotential =
      (this.cognitiveState.current_complexity / 10) * 0.3 +
      this.cognitiveState.metacognitive_awareness * 0.4 +
      this.cognitiveState.curiosity_level * 0.3;
    this.cognitiveState.insight_potential = insightPotential;

    // Update breakthrough likelihood
    this.cognitiveState.breakthrough_likelihood = Math.min(
      1,
      this.cognitiveState.insight_potential * 0.5 +
        this.cognitiveState.cognitive_flexibility * 0.3 +
        this.cognitiveState.creative_pressure * 0.2
    );
  }

  // Placeholder methods for memory and learning integration
  private async getThoughtHistory(): Promise<StoredThought[]> {
    if (!this.memoryStore) return [];

    try {
      const query = {
        session_ids: [this.cognitiveState.session_id],
        limit: 10,
        sort_by: 'timestamp' as const,
        sort_order: 'desc' as const,
      };
      return await this.memoryStore.queryThoughts(query);
    } catch (error) {
      console.error('Error getting thought history:', error);
      return [];
    }
  }

  private async getSimilarSessions(
    sessionContext?: Partial<ReasoningSession>
  ): Promise<ReasoningSession[]> {
    if (!this.memoryStore || !sessionContext?.objective) return [];

    try {
      // This would implement similarity search based on objectives and domains
      return await this.memoryStore.getSessions(5);
    } catch (error) {
      console.error('Error getting similar sessions:', error);
      return [];
    }
  }

  private async extractPatterns(): Promise<{
    successPatterns: string[];
    failurePatterns: string[];
  }> {
    // This would analyze memory to extract successful and failed patterns
    return {
      successPatterns: ['systematic_approach', 'evidence_based', 'iterative_refinement'],
      failurePatterns: ['overconfidence', 'assumption_heavy', 'insufficient_analysis'],
    };
  }

  private inferDomain(
    thoughtData: ValidatedThoughtData,
    sessionContext?: Partial<ReasoningSession>
  ): string | undefined {
    if (sessionContext?.domain) return sessionContext.domain;

    const thought = thoughtData.thought.toLowerCase();
    if (thought.includes('code') || thought.includes('programming')) return 'software';
    if (thought.includes('design') || thought.includes('user')) return 'design';
    if (thought.includes('business') || thought.includes('strategy')) return 'business';
    if (thought.includes('data') || thought.includes('analysis')) return 'analytics';

    return undefined;
  }

  private calculateUrgency(
    thoughtData: ValidatedThoughtData,
    sessionContext?: Partial<ReasoningSession>
  ): 'low' | 'medium' | 'high' {
    const thought = thoughtData.thought.toLowerCase();

    // Check for explicit urgency indicators in the thought
    if (
      thought.includes('urgent') ||
      thought.includes('critical') ||
      thought.includes('immediate')
    ) {
      return 'high';
    }

    // Factor in session context for more accurate urgency assessment
    if (sessionContext) {
      // High urgency if this is a late thought in a session with many revisions
      if (sessionContext.revision_count && sessionContext.revision_count > 3) {
        return 'high';
      }

      // Medium urgency if session has been running for a while without goal achievement
      if (sessionContext.start_time && sessionContext.goal_achieved === false) {
        const sessionDuration = Date.now() - sessionContext.start_time.getTime();
        const hoursRunning = sessionDuration / (1000 * 60 * 60);
        if (hoursRunning > 1) {
          return 'medium';
        }
      }

      // Higher urgency for sessions with low confidence
      if (sessionContext.confidence_level && sessionContext.confidence_level < 0.3) {
        return 'medium';
      }
    }

    // Check for time-sensitive keywords
    if (thought.includes('soon') || thought.includes('quickly') || thought.includes('asap')) {
      return 'medium';
    }

    // Default to low urgency for exploratory thoughts
    return 'low';
  }

  private extractTimeConstraints(
    thoughtData: ValidatedThoughtData,
    sessionContext?: Partial<ReasoningSession>
  ): { max_thoughts?: number; deadline?: Date } | undefined {
    const constraints: { max_thoughts?: number; deadline?: Date } = {};

    // Check session context first
    if (sessionContext?.total_thoughts) {
      constraints.max_thoughts = sessionContext.total_thoughts;
    }

    // Extract from thought content using regex patterns
    const thought = thoughtData.thought.toLowerCase();

    // Look for thought limits in the content
    const thoughtLimitMatch = thought.match(/(?:maximum|max|limit.*?)(\d+).*?thoughts?/);
    if (thoughtLimitMatch) {
      constraints.max_thoughts = parseInt(thoughtLimitMatch[1], 10);
    }

    // Look for time-based deadlines
    const timePatterns = [
      { pattern: /(?:deadline|due|finish.*?by).*?(\d{1,2}:\d{2})/i, type: 'time' },
      { pattern: /(?:today|by.*?end.*?day)/i, type: 'today' },
      { pattern: /(?:tomorrow|next.*?day)/i, type: 'tomorrow' },
      { pattern: /(?:this.*?week|by.*?week)/i, type: 'week' },
      { pattern: /urgent|asap|immediately/i, type: 'urgent' },
    ];

    for (const { pattern, type } of timePatterns) {
      if (pattern.test(thought)) {
        const now = new Date();
        switch (type) {
          case 'today':
            constraints.deadline = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              23,
              59,
              59
            );
            break;
          case 'tomorrow':
            constraints.deadline = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() + 1,
              23,
              59,
              59
            );
            break;
          case 'week':
            constraints.deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'urgent':
            constraints.deadline = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes for urgent
            break;
          case 'time': {
            // Try to parse specific time if mentioned
            const timeMatch = thought.match(/(\d{1,2}):(\d{2})/);
            if (timeMatch) {
              const hours = parseInt(timeMatch[1], 10);
              const minutes = parseInt(timeMatch[2], 10);
              constraints.deadline = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                hours,
                minutes
              );
              // If time is in the past, assume next day
              if (constraints.deadline < now) {
                constraints.deadline.setDate(constraints.deadline.getDate() + 1);
              }
            }
            break;
          }
        }
        break; // Use first match
      }
    }

    // Default thought limit based on complexity if none specified
    if (!constraints.max_thoughts && thoughtData.total_thoughts) {
      constraints.max_thoughts = thoughtData.total_thoughts;
    }

    return Object.keys(constraints).length > 0 ? constraints : undefined;
  }

  // Insight detection methods
  private async detectPatternInsights(context: CognitiveContext): Promise<CognitiveInsight[]> {
    const insights: CognitiveInsight[] = [];

    if (!this.memoryStore || !this.config.pattern_recognition_threshold) return insights;

    try {
      // Look for patterns in thought history
      const recentThoughts = context.thought_history.slice(-10);

      // Detect recurring themes
      const themes = this.extractThemes(recentThoughts);
      const recurringThemes = themes.filter(theme => theme.frequency >= 3);

      for (const theme of recurringThemes) {
        insights.push({
          type: 'pattern_recognition',
          description: `Recurring theme detected: "${theme.pattern}" appears ${theme.frequency} times`,
          confidence: Math.min(0.9, theme.frequency / 5),
          impact_potential: theme.frequency > 4 ? 0.8 : 0.6,
          implications: [
            `The pattern "${theme.pattern}" may represent a core concept in your reasoning`,
            'This recurring theme could indicate a cognitive bias or valuable insight',
            'Pattern frequency suggests high relevance to current problem domain',
          ],
          evidence: theme.contexts,
          novelty_score: 0.3,
        });
      }

      // Detect progression patterns
      const progressionInsights = this.detectProgressionPatterns(recentThoughts);
      insights.push(...progressionInsights);

      // Detect contradiction patterns
      const contradictionInsights = this.detectContradictionPatterns(recentThoughts);
      insights.push(...contradictionInsights);
    } catch (error) {
      console.error('Error detecting pattern insights:', error);
    }

    return insights;
  }

  private async detectBreakthroughs(
    context: CognitiveContext,
    interventions: PluginIntervention[]
  ): Promise<CognitiveInsight[]> {
    const insights: CognitiveInsight[] = [];

    // Breakthrough indicators
    const breakthroughScore = this.calculateBreakthroughScore(context, interventions);

    if (breakthroughScore > this.config.breakthrough_detection_sensitivity) {
      // High confidence level after period of uncertainty
      const confidenceJump = this.detectConfidenceJump(context);
      if (confidenceJump > 0.3) {
        insights.push({
          type: 'breakthrough',
          description: `Potential breakthrough detected: confidence increased by ${(confidenceJump * 100).toFixed(1)}%`,
          confidence: breakthroughScore,
          impact_potential: 0.9,
          implications: [
            'This breakthrough may lead to accelerated problem solving',
            'Increased confidence suggests resolution of key uncertainties',
            'Pattern could be applicable to similar future challenges',
          ],
          evidence: [context.current_thought || 'current reasoning'],
          novelty_score: 0.8,
        });
      }

      // Sudden complexity reduction
      const complexityReduction = this.detectComplexityReduction(context);
      if (complexityReduction > 0.3) {
        insights.push({
          type: 'breakthrough',
          description: `Simplification breakthrough: problem complexity reduced by ${(complexityReduction * 100).toFixed(1)}%`,
          confidence: breakthroughScore * 0.9,
          impact_potential: 0.9,
          implications: [
            'Complexity reduction indicates deeper understanding of core issues',
            'Simplified approach may be more maintainable and scalable',
            'This simplification pattern could apply to other complex problems',
          ],
          evidence: [context.current_thought || 'current reasoning'],
          novelty_score: 0.7,
        });
      }

      // Novel connection detection
      const novelConnections = this.detectNovelConnections(context, interventions);
      if (novelConnections.length > 0) {
        insights.push({
          type: 'breakthrough',
          description: `Novel connections discovered: ${novelConnections.length} unexpected relationships found`,
          confidence: breakthroughScore * 0.8,
          impact_potential: 0.7,
          implications: [
            'Cross-domain connections may reveal universal principles',
            'Novel relationships could lead to innovative solutions',
            'These connections expand the solution space significantly',
          ],
          evidence: novelConnections,
          novelty_score: 0.9,
        });
      }
    }

    return insights;
  }

  private async detectSynthesis(
    context: CognitiveContext,
    interventions: PluginIntervention[]
  ): Promise<CognitiveInsight[]> {
    const insights: CognitiveInsight[] = [];

    // Detect integration of multiple perspectives
    const perspectiveIntegration = this.analyzeMultiPerspectiveIntegration(interventions);
    if (perspectiveIntegration.score > 0.7) {
      insights.push({
        type: 'synthesis',
        description: `Successful synthesis of ${perspectiveIntegration.perspectives.length} different perspectives`,
        confidence: perspectiveIntegration.score,
        impact_potential: 0.8,
        implications: [
          'Multi-perspective synthesis reduces cognitive blind spots',
          'Integrated approach is more robust than single-perspective solutions',
          'This synthesis pattern can be applied to future complex problems',
        ],
        evidence: perspectiveIntegration.perspectives,
        novelty_score: 0.6,
      });
    }

    // Detect conceptual bridging
    const conceptualBridges = this.detectConceptualBridging(context, interventions);
    if (conceptualBridges.length > 0) {
      insights.push({
        type: 'synthesis',
        description: `Conceptual bridging detected: ${conceptualBridges.length} domain connections made`,
        confidence: 0.8,
        impact_potential: 0.7,
        implications: [
          'Cross-domain bridging reveals transferable principles',
          'Conceptual connections enable knowledge transfer between fields',
          'This bridging approach can be systematically applied',
        ],
        evidence: conceptualBridges,
        novelty_score: 0.7,
      });
    }

    // Detect emergent understanding
    const emergentUnderstanding = this.detectEmergentUnderstanding(context);
    if (emergentUnderstanding.detected) {
      insights.push({
        type: 'synthesis',
        description: `Emergent understanding: new insight emerged from combination of ideas`,
        confidence: emergentUnderstanding.confidence,
        impact_potential: 0.9,
        implications: [
          'Emergent understanding represents genuine cognitive breakthrough',
          'This insight may have broader applications beyond current context',
          'Emergence indicates successful integration of disparate concepts',
        ],
        evidence: [emergentUnderstanding.description],
        novelty_score: 0.9,
      });
    }

    return insights;
  }

  // Learning and adaptation methods
  private updateCognitiveStateFromFeedback(outcome: string, impact_score: number): void {
    // Update success rate
    const success_value = outcome === 'success' ? 1 : outcome === 'partial' ? 0.5 : 0;
    this.cognitiveState.recent_success_rate =
      this.cognitiveState.recent_success_rate * 0.9 + success_value * 0.1;

    // Update efficiency based on impact
    this.cognitiveState.cognitive_efficiency =
      this.cognitiveState.cognitive_efficiency * 0.9 + impact_score * 0.1;
  }

  private async learnFromFeedback(
    interventions: PluginIntervention[],
    outcome: string,
    impact_score: number,
    context: CognitiveContext
  ): Promise<void> {
    // Store learning data for future adaptation
    const learningKey = `${context.domain}_${context.complexity}_${outcome}`;
    const existingData = this.learningData.get(learningKey) || {
      count: 0,
      total_impact: 0,
      interventions: [],
    };

    // Analyze which interventions were most effective
    const interventionEffectiveness = new Map<string, number>();
    for (const intervention of interventions) {
      const pluginId = intervention.metadata.plugin_id;
      const currentScore = interventionEffectiveness.get(pluginId) || 0;
      interventionEffectiveness.set(pluginId, currentScore + impact_score / interventions.length);
    }

    // Update learning data with intervention-specific insights
    const updatedInterventions = [...(existingData.interventions || [])];
    interventions.forEach(intervention => {
      updatedInterventions.push({
        plugin_id: intervention.metadata.plugin_id,
        effectiveness: interventionEffectiveness.get(intervention.metadata.plugin_id) || 0,
        context_complexity: context.complexity,
        outcome_quality: impact_score,
        timestamp: new Date().toISOString(),
      });
    });

    this.learningData.set(learningKey, {
      count: existingData.count + 1,
      total_impact: existingData.total_impact + impact_score,
      interventions: updatedInterventions.slice(-50), // Keep last 50 interventions
    });

    // Update plugin effectiveness scores based on this feedback
    await this.updatePluginEffectiveness(interventionEffectiveness, context);
  }

  private async updatePluginEffectiveness(
    interventionEffectiveness: Map<string, number>,
    context: CognitiveContext
  ): Promise<void> {
    for (const [pluginId, effectiveness] of interventionEffectiveness.entries()) {
      const contextKey = `${pluginId}_${context.domain}_${context.complexity}`;
      const existingScore = this.pluginEffectiveness.get(contextKey) || 0.5;

      // Exponential moving average for effectiveness scores
      const learningRate = this.config.learning_rate;
      const newScore = existingScore * (1 - learningRate) + effectiveness * learningRate;

      this.pluginEffectiveness.set(contextKey, Math.max(0.1, Math.min(1.0, newScore)));
    }
  }

  private checkAdaptationTriggers(outcome: string, impact_score: number): void {
    if (outcome === 'failure' && impact_score < 0.3) {
      this.adaptationTriggers.add('poor_performance');
    }

    if (this.cognitiveState.recent_success_rate < 0.4) {
      this.adaptationTriggers.add('low_success_rate');
    }

    if (this.cognitiveState.cognitive_efficiency < 0.4) {
      this.adaptationTriggers.add('low_efficiency');
    }
  }

  private learnInterventionPatterns(
    context: CognitiveContext,
    interventions: PluginIntervention[]
  ): void {
    // Learn which interventions work well in which contexts
    for (const intervention of interventions) {
      const patternKey = `${intervention.metadata.plugin_id}_${context.domain}_${context.complexity}`;
      const existingPattern = this.interventionPatterns.get(patternKey) || {
        success_count: 0,
        total_count: 0,
        typical_impact: 0,
        contexts_used: [],
      };

      existingPattern.total_count++;
      if (intervention.metadata.confidence > 0.6) {
        existingPattern.success_count++;
      }

      existingPattern.typical_impact =
        (existingPattern.typical_impact * (existingPattern.total_count - 1) +
          intervention.metadata.confidence) /
        existingPattern.total_count;

      // Track context variations
      const contextSignature = `${context.domain}_${context.complexity}_${context.urgency}`;
      if (!existingPattern.contexts_used.includes(contextSignature)) {
        existingPattern.contexts_used.push(contextSignature);
        // Keep only last 20 context signatures
        existingPattern.contexts_used = existingPattern.contexts_used.slice(-20);
      }

      this.interventionPatterns.set(patternKey, existingPattern);
    }
  }

  private learnInsightPatterns(context: CognitiveContext, insights: CognitiveInsight[]): void {
    // Learn which contexts lead to insights
    for (const insight of insights) {
      const patternKey = `insights_${context.domain}_${context.complexity}`;
      const existingPattern = this.insightPatterns.get(patternKey) || {
        insight_frequency: 0,
        average_novelty: 0,
        breakthrough_contexts: [],
        total_insights: 0,
      };

      existingPattern.total_insights++;
      const sessionLength = context.session?.total_thoughts || context.thought_history.length || 1;
      existingPattern.insight_frequency =
        existingPattern.total_insights / Math.max(1, sessionLength);

      // Update average novelty score
      existingPattern.average_novelty =
        (existingPattern.average_novelty * (existingPattern.total_insights - 1) +
          insight.novelty_score) /
        existingPattern.total_insights;

      // Track breakthrough contexts (high-impact, high-novelty insights)
      if (insight.confidence > 0.7 && insight.novelty_score > 0.7) {
        const contextSnapshot = {
          domain: context.domain,
          complexity: context.complexity,
          urgency: context.urgency,
          session_phase: context.session?.total_thoughts || context.thought_history.length || 0,
          timestamp: new Date().toISOString(),
        };
        existingPattern.breakthrough_contexts.push(contextSnapshot);
        // Keep only last 10 breakthrough contexts
        existingPattern.breakthrough_contexts = existingPattern.breakthrough_contexts.slice(-10);
      }

      this.insightPatterns.set(patternKey, existingPattern);
    }
  }

  private updatePerformanceMetrics(
    context: CognitiveContext,
    interventions: PluginIntervention[],
    insights: CognitiveInsight[]
  ): void {
    // Update various performance metrics
    this.performanceMetrics.set('interventions_per_thought', interventions.length);
    this.performanceMetrics.set('insights_per_thought', insights.length);
    this.performanceMetrics.set('cognitive_load', this.calculateCognitiveLoad(interventions));
  }

  private shouldAdapt(): boolean {
    return this.adaptationTriggers.size > 0 && this.config.self_optimization_enabled;
  }

  private async performAdaptation(): Promise<void> {
    // Perform actual adaptation based on triggers
    for (const trigger of this.adaptationTriggers) {
      await this.handleAdaptationTrigger(trigger);
    }

    this.adaptationTriggers.clear();
  }

  private async handleAdaptationTrigger(trigger: string): Promise<void> {
    switch (trigger) {
      case 'poor_performance':
        // Adjust plugin sensitivity or selection criteria
        break;
      case 'low_success_rate':
        // Modify cognitive strategies
        break;
      case 'low_efficiency':
        // Optimize cognitive resource allocation
        break;
    }
  }

  // Utility methods
  private generateThoughtId(): string {
    return `thought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateCognitiveLoad(interventions: PluginIntervention[]): number {
    return interventions.reduce((total, intervention) => {
      // Estimate cognitive load based on intervention type and complexity
      return total + 0.1; // Placeholder
    }, 0);
  }

  private generateTags(
    thoughtData: ValidatedThoughtData,
    context: CognitiveContext,
    interventions: PluginIntervention[],
    insights: CognitiveInsight[]
  ): string[] {
    const tags: string[] = [];

    if (context.domain) tags.push(context.domain);
    if (context.complexity > 7) tags.push('complex');
    if (context.confidence_level > 0.8) tags.push('high_confidence');
    if (interventions.length > 0) tags.push('cognitive_intervention');
    if (insights.length > 0) tags.push('insight_generated');
    if (thoughtData.is_revision) tags.push('revision');
    if (thoughtData.branch_from_thought) tags.push('branching');

    return tags;
  }

  private assessOutcomeQuality(
    context: CognitiveContext,
    interventions: PluginIntervention[],
    insights: CognitiveInsight[]
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    let score = 0.5; // Base score

    if (insights.length > 0) score += 0.3;
    if (interventions.length > 0) score += 0.1;
    if (context.complexity > 6 && context.confidence_level < 0.9) score += 0.1;

    if (score > 0.8) return 'excellent';
    if (score > 0.6) return 'good';
    if (score > 0.4) return 'fair';
    return 'poor';
  }

  // Setup methods
  private setupPluginRelationships(): void {
    // Set up plugin dependencies and conflicts
    this.pluginManager.setPluginConflicts('metacognitive', []); // No conflicts
    this.pluginManager.setPluginConflicts('persona', []); // No conflicts

    // Metacognitive and persona plugins can work together
    // but we might want to limit concurrent persona activations
  }

  private setupEventListeners(): void {
    // Listen to plugin manager events
    this.pluginManager.on('orchestration_complete', data => {
      this.emit('plugins_orchestrated', data);
    });

    this.pluginManager.on('orchestration_error', data => {
      this.emit('plugin_orchestration_error', data);
    });

    // Listen to individual plugin events
    this.metacognitivePlugin.on('metrics_updated', metrics => {
      this.emit('metacognitive_metrics_updated', metrics);
    });

    this.personaPlugin.on('metrics_updated', metrics => {
      this.emit('persona_metrics_updated', metrics);
    });
  }

  /**
   * Enforce array size limits to prevent memory leaks
   */
  private enforceMemoryLimits(): void {
    // Trim intervention history
    if (this.interventionHistory.length > this.MAX_INTERVENTION_HISTORY) {
      this.interventionHistory = this.interventionHistory.slice(-this.MAX_INTERVENTION_HISTORY);
    }

    // Trim insight history
    if (this.insightHistory.length > this.MAX_INSIGHT_HISTORY) {
      this.insightHistory = this.insightHistory.slice(-this.MAX_INSIGHT_HISTORY);
    }

    // Trim thought output history
    if (this.thoughtOutputHistory.length > this.MAX_THOUGHT_OUTPUT_HISTORY) {
      this.thoughtOutputHistory = this.thoughtOutputHistory.slice(-this.MAX_THOUGHT_OUTPUT_HISTORY);
    }

    // Cleanup old sessions
    if (this.sessionHistory.size > this.MAX_SESSION_HISTORY) {
      const sortedSessions = Array.from(this.sessionHistory.entries()).sort(
        (a, b) => a[1].start_time.getTime() - b[1].start_time.getTime()
      );

      const toRemove = sortedSessions.slice(0, sortedSessions.length - this.MAX_SESSION_HISTORY);
      toRemove.forEach(([id]) => this.sessionHistory.delete(id));
    }
  }

  // Helper methods for insight detection
  private extractThemes(
    thoughts: StoredThought[]
  ): Array<{ pattern: string; frequency: number; contexts: string[] }> {
    const themeMap = new Map<string, { count: number; contexts: string[] }>();

    thoughts.forEach(thought => {
      const words = thought.thought
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 4)
        .filter(
          word =>
            ![
              'that',
              'this',
              'with',
              'from',
              'have',
              'been',
              'were',
              'what',
              'when',
              'where',
              'which',
              'while',
              'would',
              'could',
              'should',
            ].includes(word)
        );

      words.forEach(word => {
        const current = themeMap.get(word) || { count: 0, contexts: [] };
        current.count++;
        current.contexts.push(thought.thought.substring(0, 50) + '...');
        themeMap.set(word, current);
      });
    });

    return Array.from(themeMap.entries())
      .map(([pattern, data]) => ({ pattern, frequency: data.count, contexts: data.contexts }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private detectProgressionPatterns(thoughts: StoredThought[]): CognitiveInsight[] {
    const insights: CognitiveInsight[] = [];

    if (thoughts.length < 3) return insights;

    // Check for increasing confidence over time
    const confidenceProgression = thoughts
      .filter(t => t.confidence !== undefined)
      .map(t => t.confidence!);

    if (confidenceProgression.length >= 3) {
      const trend = this.calculateTrend(confidenceProgression);
      if (trend > 0.1) {
        insights.push({
          type: 'pattern_recognition',
          description: `Confidence is steadily increasing (trend: ${(trend * 100).toFixed(1)}%)`,
          confidence: 0.8,
          impact_potential: 0.7,
          implications: [
            'Increasing confidence suggests effective problem-solving approach',
            'This trend indicates growing mastery of the domain',
            'Pattern may predict continued success on current path',
          ],
          evidence: ['confidence progression pattern'],
          novelty_score: 0.4,
        });
      }
    }

    return insights;
  }

  private detectContradictionPatterns(thoughts: StoredThought[]): CognitiveInsight[] {
    const insights: CognitiveInsight[] = [];

    // Look for contradictory statements using simple keyword analysis
    const contradictionKeywords = [
      ['yes', 'no'],
      ['true', 'false'],
      ['correct', 'incorrect'],
      ['right', 'wrong'],
      ['good', 'bad'],
      ['positive', 'negative'],
      ['agree', 'disagree'],
    ];

    for (const [pos, neg] of contradictionKeywords) {
      const posThoughts = thoughts.filter(t => t.thought.toLowerCase().includes(pos));
      const negThoughts = thoughts.filter(t => t.thought.toLowerCase().includes(neg));

      if (posThoughts.length > 0 && negThoughts.length > 0) {
        insights.push({
          type: 'pattern_recognition',
          description: `Potential contradiction detected: both "${pos}" and "${neg}" perspectives present`,
          confidence: 0.6,
          impact_potential: 0.6,
          implications: [
            'Contradiction may indicate oversimplification or missing context',
            'Resolution could lead to more nuanced understanding',
            'This pattern suggests need for dialectical thinking',
          ],
          evidence: [`${pos} vs ${neg} contradiction`],
          novelty_score: 0.5,
        });
      }
    }

    return insights;
  }

  private calculateBreakthroughScore(
    context: CognitiveContext,
    interventions: PluginIntervention[]
  ): number {
    let score = 0;

    // High intervention activity indicates active problem solving
    score += Math.min(0.3, interventions.length * 0.1);

    // High metacognitive awareness suggests potential for breakthrough
    score += context.metacognitive_awareness * 0.3;

    // Creative pressure combined with analytical depth
    score += context.creative_pressure * 0.2 + context.confidence_level * 0.2;

    return Math.min(1, score);
  }

  private detectConfidenceJump(context: CognitiveContext): number {
    const trajectory = this.cognitiveState.confidence_trajectory;
    if (trajectory.length < 3) return 0;

    const recent = trajectory.slice(-3);
    const earlier = trajectory.slice(-6, -3);

    if (earlier.length === 0) return 0;

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;

    return recentAvg - earlierAvg;
  }

  private detectComplexityReduction(context: CognitiveContext): number {
    // Compare current complexity to historical average
    const avgComplexity = this.performanceMetrics.get('avg_complexity') || context.complexity;
    return Math.max(0, (avgComplexity - context.complexity) / 10);
  }

  private detectNovelConnections(
    context: CognitiveContext,
    interventions: PluginIntervention[]
  ): string[] {
    const connections: string[] = [];

    // Look for cross-domain references in interventions
    const domains = ['technical', 'creative', 'analytical', 'strategic', 'practical'];
    const mentionedDomains = new Set<string>();

    interventions.forEach(intervention => {
      domains.forEach(domain => {
        if (intervention.content.toLowerCase().includes(domain)) {
          mentionedDomains.add(domain);
        }
      });
    });

    if (mentionedDomains.size >= 2) {
      connections.push(`Cross-domain connections: ${Array.from(mentionedDomains).join(', ')}`);
    }

    return connections;
  }

  private analyzeMultiPerspectiveIntegration(interventions: PluginIntervention[]): {
    score: number;
    perspectives: string[];
  } {
    const perspectives = interventions.map(i => i.metadata.plugin_id);
    const uniquePerspectives = [...new Set(perspectives)];

    // Score based on diversity and coherence
    const diversityScore = Math.min(1, uniquePerspectives.length / 3);
    const coherenceScore = interventions.length > 1 ? 0.8 : 0.5; // Assume coherence if multiple interventions

    return {
      score: (diversityScore + coherenceScore) / 2,
      perspectives: uniquePerspectives,
    };
  }

  private detectConceptualBridging(
    context: CognitiveContext,
    interventions: PluginIntervention[]
  ): string[] {
    const bridges: string[] = [];

    // Look for bridging words/phrases in content
    const bridgingPatterns = [
      'similar to',
      'like',
      'analogous',
      'parallel',
      'reminds me of',
      'connects to',
      'relates to',
      'builds on',
      'extends from',
    ];

    interventions.forEach(intervention => {
      bridgingPatterns.forEach(pattern => {
        if (intervention.content.toLowerCase().includes(pattern)) {
          bridges.push(`Conceptual bridge via "${pattern}"`);
        }
      });
    });

    return bridges;
  }

  private detectEmergentUnderstanding(context: CognitiveContext): {
    detected: boolean;
    confidence: number;
    description: string;
  } {
    // Look for sudden clarity or insight indicators
    const thought = context.current_thought?.toLowerCase() || '';

    const insightIndicators = [
      'i see',
      'i understand',
      'now i realize',
      'it becomes clear',
      'the key is',
      'the insight is',
      'suddenly',
      'aha',
      'eureka',
    ];

    const hasInsightIndicator = insightIndicators.some(indicator => thought.includes(indicator));

    if (hasInsightIndicator && context.confidence_level > 0.7) {
      return {
        detected: true,
        confidence: 0.8,
        description: 'Insight language detected with high confidence',
      };
    }

    return { detected: false, confidence: 0, description: '' };
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    let sum = 0;
    for (let i = 1; i < values.length; i++) {
      sum += values[i] - values[i - 1];
    }

    return sum / (values.length - 1);
  }

  /**
   * Cleanup method to prevent memory leaks
   * Removes all event listeners and cleans up resources
   */
  public async destroy(): Promise<void> {
    // Remove all listeners from this orchestrator
    this.removeAllListeners();

    // Remove listeners we added to other components
    this.pluginManager.removeAllListeners('orchestration_complete');
    this.pluginManager.removeAllListeners('orchestration_error');
    this.metacognitivePlugin.removeAllListeners('metrics_updated');
    this.personaPlugin.removeAllListeners('metrics_updated');

    // Destroy all plugins
    await this.pluginManager.destroy();
  }
}
