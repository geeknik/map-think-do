/**
 * @fileoverview Metacognitive Plugin - Self-Reflection and Meta-Reasoning
 * 
 * This plugin provides the system with metacognitive awareness - the ability
 * to think about its own thinking. It monitors reasoning patterns, identifies
 * cognitive biases, suggests alternative approaches, and provides self-reflection.
 * 
 * Key capabilities:
 * - Confidence calibration and uncertainty quantification
 * - Assumption detection and questioning
 * - Reasoning pattern analysis
 * - Alternative perspective generation
 * - Cognitive bias detection
 * - Self-doubt and overconfidence regulation
 */

import { 
  CognitivePlugin, 
  CognitiveContext, 
  PluginActivation, 
  PluginIntervention 
} from '../plugin-system.js';

/**
 * Metacognitive intervention types
 */
type MetacognitiveInterventionType = 
  | 'confidence_calibration'
  | 'assumption_questioning' 
  | 'alternative_generation'
  | 'bias_detection'
  | 'reasoning_evaluation'
  | 'uncertainty_acknowledgment'
  | 'perspective_shift';

/**
 * Metacognitive patterns that trigger interventions
 */
interface MetacognitivePattern {
  pattern_name: string;
  description: string;
  triggers: string[];
  intervention_type: MetacognitiveInterventionType;
  confidence_threshold?: number;
  complexity_threshold?: number;
}

/**
 * Metacognitive Plugin Implementation
 */
export class MetacognitivePlugin extends CognitivePlugin {
  private readonly patterns: MetacognitivePattern[] = [
    {
      pattern_name: 'overconfidence',
      description: 'Detected high confidence without sufficient evidence',
      triggers: ['definitely', 'certainly', 'obviously', 'clearly', 'without doubt'],
      intervention_type: 'confidence_calibration',
      confidence_threshold: 0.9
    },
    {
      pattern_name: 'assumption_heavy',
      description: 'Multiple assumptions made without validation',
      triggers: ['assume', 'probably', 'likely', 'should be', 'must be'],
      intervention_type: 'assumption_questioning'
    },
    {
      pattern_name: 'tunnel_vision',
      description: 'Single approach focus without considering alternatives',
      triggers: ['only way', 'best approach', 'single solution', 'no other'],
      intervention_type: 'alternative_generation'
    },
    {
      pattern_name: 'confirmation_bias',
      description: 'Seeking information that confirms existing beliefs',
      triggers: ['confirms', 'proves', 'validates', 'supports my view'],
      intervention_type: 'bias_detection'
    },
    {
      pattern_name: 'complexity_underestimation',
      description: 'Treating complex problems as simple',
      triggers: ['simple', 'easy', 'straightforward', 'just need to'],
      intervention_type: 'reasoning_evaluation',
      complexity_threshold: 7
    },
    {
      pattern_name: 'uncertainty_avoidance',
      description: 'Not acknowledging uncertainty when present',
      triggers: ['will work', 'is correct', 'final answer', 'solved'],
      intervention_type: 'uncertainty_acknowledgment',
      confidence_threshold: 0.7
    }
  ];

  private readonly biasDetectors = [
    'anchoring', 'availability', 'confirmation', 'overconfidence', 
    'planning_fallacy', 'sunk_cost', 'representativeness'
  ];

  constructor() {
    super(
      'metacognitive',
      'Metacognitive Reasoner',
      'Provides self-reflection, confidence calibration, and meta-reasoning capabilities',
      '1.0.0',
      {
        sensitivity: 0.7, // How sensitive to trigger metacognitive interventions
        max_interventions_per_session: 5,
        confidence_calibration_enabled: true,
        bias_detection_enabled: true,
        alternative_generation_enabled: true
      }
    );
  }

  async shouldActivate(context: CognitiveContext): Promise<PluginActivation> {
    const startTime = Date.now();
    
    try {
      // Calculate activation factors
      const metacognitiveNeed = this.assessMetacognitiveNeed(context);
      const complexityFactor = context.complexity / 10; // Normalize to 0-1
      const uncertaintyFactor = 1 - context.confidence_level;
      const historyFactor = this.analyzeThoughtHistory(context);
      
      // Determine if intervention is needed
      const activationScore = (
        metacognitiveNeed * 0.4 +
        complexityFactor * 0.2 +
        uncertaintyFactor * 0.2 +
        historyFactor * 0.2
      );
      
      const shouldActivate = activationScore > this.config.sensitivity;
      const priority = Math.min(95, activationScore * 100); // Cap at 95 to allow other plugins
      
      const activation: PluginActivation = {
        should_activate: shouldActivate,
        priority,
        confidence: activationScore,
        reason: this.generateActivationReason(metacognitiveNeed, context),
        estimated_impact: activationScore > 0.8 ? 'high' : activationScore > 0.5 ? 'medium' : 'low',
        resource_requirements: {
          cognitive_load: 0.3, // Metacognition is moderately resource intensive
          time_cost: 1, // Usually adds 1 additional thought
          creativity_required: false,
          analysis_required: true
        }
      };

      return activation;

    } catch (error) {
      console.error('Error in MetacognitivePlugin shouldActivate:', error);
      return {
        should_activate: false,
        priority: 0,
        confidence: 0,
        reason: 'Error in metacognitive assessment',
        estimated_impact: 'low',
        resource_requirements: {
          cognitive_load: 0,
          time_cost: 0,
          creativity_required: false,
          analysis_required: false
        }
      };
    }
  }

  async intervene(context: CognitiveContext): Promise<PluginIntervention> {
    const startTime = Date.now();
    
    try {
      // Identify the most relevant metacognitive intervention
      const interventionType = this.selectInterventionType(context);
      const content = await this.generateIntervention(interventionType, context);
      
      const intervention: PluginIntervention = {
        type: 'meta_guidance',
        content,
        metadata: {
          plugin_id: this.id,
          confidence: this.calculateInterventionConfidence(interventionType, context),
          expected_benefit: this.getExpectedBenefit(interventionType),
          side_effects: this.getPotentialSideEffects(interventionType)
        },
        follow_up_needed: this.needsFollowUp(interventionType),
        next_check_after: interventionType === 'confidence_calibration' ? 2 : 3,
        success_metrics: ['improved_accuracy', 'better_uncertainty_handling', 'reduced_bias'],
        failure_indicators: ['increased_confusion', 'analysis_paralysis', 'reduced_confidence']
      };

      const responseTime = Date.now() - startTime;
      this.updateMetrics(intervention, 'partial', 0.7, responseTime, context);

      return intervention;

    } catch (error) {
      console.error('Error in MetacognitivePlugin intervene:', error);
      throw error;
    }
  }

  async receiveFeedback(
    intervention: PluginIntervention,
    outcome: 'success' | 'failure' | 'partial',
    impact_score: number,
    context: CognitiveContext
  ): Promise<void> {
    if (!this.learning_enabled) return;

    try {
      // Update intervention success rates by type
      const interventionContent = intervention.content;
      const interventionType = this.extractInterventionType(interventionContent);
      
      if (interventionType) {
        this.updateInterventionTypeMetrics(interventionType, outcome, impact_score);
      }

      // Adjust sensitivity based on feedback
      if (outcome === 'failure' && impact_score < 0.3) {
        this.config.sensitivity = Math.min(1.0, this.config.sensitivity + 0.05);
      } else if (outcome === 'success' && impact_score > 0.8) {
        this.config.sensitivity = Math.max(0.3, this.config.sensitivity - 0.02);
      }

      // Learn from context patterns
      this.learnFromContext(context, outcome, impact_score);

    } catch (error) {
      console.error('Error in MetacognitivePlugin receiveFeedback:', error);
    }
  }

  async adapt(learningData: any): Promise<void> {
    if (!this.learning_enabled) return;

    try {
      // Adapt based on successful intervention patterns
      if (learningData.successful_interventions) {
        this.adaptInterventionPatterns(learningData.successful_interventions);
      }

      // Adjust pattern sensitivity based on performance
      if (learningData.pattern_performance) {
        this.adaptPatternSensitivity(learningData.pattern_performance);
      }

      // Update bias detection based on discovered biases
      if (learningData.detected_biases) {
        this.updateBiasDetection(learningData.detected_biases);
      }

    } catch (error) {
      console.error('Error in MetacognitivePlugin adapt:', error);
    }
  }

  /**
   * Assess the need for metacognitive intervention
   */
  private assessMetacognitiveNeed(context: CognitiveContext): number {
    let need = 0;

    // Check current thought for metacognitive triggers
    if (context.current_thought) {
      need += this.analyzeThoughtForPatterns(context.current_thought);
    }

    // Analyze confidence vs complexity mismatch
    const confidenceComplexityMismatch = Math.abs(
      context.confidence_level - (1 - context.complexity / 10)
    );
    need += confidenceComplexityMismatch * 0.5;

    // Check for metacognitive awareness level
    need += (1 - context.metacognitive_awareness) * 0.3;

    // Check self-doubt levels (both too high and too low are problematic)
    const optimalSelfDoubt = 0.3;
    const selfDoubtDeviation = Math.abs(context.self_doubt_level - optimalSelfDoubt);
    need += selfDoubtDeviation * 0.4;

    return Math.min(1.0, need);
  }

  /**
   * Analyze thought history for patterns requiring metacognitive intervention
   */
  private analyzeThoughtHistory(context: CognitiveContext): number {
    if (context.thought_history.length < 2) return 0;

    let historyFactor = 0;
    const recentThoughts = context.thought_history.slice(-3);

    // Check for repetitive patterns
    const repetitivePatterns = this.detectRepetitivePatterns(recentThoughts);
    historyFactor += repetitivePatterns * 0.4;

    // Check for escalating confidence without evidence
    const confidenceEscalation = this.detectConfidenceEscalation(recentThoughts);
    historyFactor += confidenceEscalation * 0.3;

    // Check for lack of alternative consideration
    const alternativeConsideration = this.detectAlternativeConsideration(recentThoughts);
    historyFactor += (1 - alternativeConsideration) * 0.3;

    return Math.min(1.0, historyFactor);
  }

  /**
   * Analyze current thought for metacognitive patterns
   */
  private analyzeThoughtForPatterns(thought: string): number {
    let patternScore = 0;
    const thoughtLower = thought.toLowerCase();

    for (const pattern of this.patterns) {
      const triggerCount = pattern.triggers.filter(trigger => 
        thoughtLower.includes(trigger.toLowerCase())
      ).length;

      if (triggerCount > 0) {
        patternScore += (triggerCount / pattern.triggers.length) * 0.2;
      }
    }

    return Math.min(1.0, patternScore);
  }

  /**
   * Select the most appropriate intervention type
   */
  private selectInterventionType(context: CognitiveContext): MetacognitiveInterventionType {
    const scores: Record<MetacognitiveInterventionType, number> = {
      'confidence_calibration': 0,
      'assumption_questioning': 0,
      'alternative_generation': 0,
      'bias_detection': 0,
      'reasoning_evaluation': 0,
      'uncertainty_acknowledgment': 0,
      'perspective_shift': 0
    };

    // Score each intervention type based on context
    if (context.confidence_level > 0.8 && context.complexity > 6) {
      scores.confidence_calibration += 0.8;
    }

    if (context.current_thought && this.containsAssumptions(context.current_thought)) {
      scores.assumption_questioning += 0.7;
    }

    if (context.thought_history.length > 2 && this.lacksAlternatives(context)) {
      scores.alternative_generation += 0.6;
    }

    if (this.detectsPotentialBias(context)) {
      scores.bias_detection += 0.7;
    }

    if (context.complexity > 7 && context.confidence_level > 0.7) {
      scores.reasoning_evaluation += 0.6;
    }

    if (context.confidence_level > 0.8 && context.self_doubt_level < 0.2) {
      scores.uncertainty_acknowledgment += 0.5;
    }

    if (context.thought_history.length > 3 && this.needsPerspectiveShift(context)) {
      scores.perspective_shift += 0.4;
    }

    // Return the intervention type with the highest score
    const entries = Object.entries(scores) as [MetacognitiveInterventionType, number][];
    return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  /**
   * Generate metacognitive intervention content
   */
  private async generateIntervention(
    type: MetacognitiveInterventionType, 
    context: CognitiveContext
  ): Promise<string> {
    switch (type) {
      case 'confidence_calibration':
        return this.generateConfidenceCalibration(context);
      
      case 'assumption_questioning':
        return this.generateAssumptionQuestioning(context);
      
      case 'alternative_generation':
        return this.generateAlternativeGeneration(context);
      
      case 'bias_detection':
        return this.generateBiasDetection(context);
      
      case 'reasoning_evaluation':
        return this.generateReasoningEvaluation(context);
      
      case 'uncertainty_acknowledgment':
        return this.generateUncertaintyAcknowledgment(context);
      
      case 'perspective_shift':
        return this.generatePerspectiveShift(context);
      
      default:
        return 'Consider taking a step back and reflecting on your reasoning process.';
    }
  }

  /**
   * Generate confidence calibration intervention
   */
  private generateConfidenceCalibration(context: CognitiveContext): string {
    const interventions = [
      `🎯 **Confidence Check**: You seem quite confident (${Math.round(context.confidence_level * 100)}%) about this ${context.complexity}/10 complexity problem. Let's calibrate:

• What evidence specifically supports this confidence level?
• What could you be missing or overlooking?
• On similar problems, how often have high-confidence predictions been correct?
• What would need to be true for this confidence to be justified?`,

      `⚖️ **Reality Check**: High confidence + high complexity often signals overconfidence bias. Consider:

• Are you anchoring on initial impressions?
• Have you considered failure modes and edge cases?
• What would an expert skeptic question about your approach?
• Could you be right for the wrong reasons?`,

      `🔍 **Evidence Audit**: Before proceeding with high confidence, let's examine:

• Strength of evidence: Is it direct or circumstantial?
• Completeness: What information might be missing?
• Alternative explanations: Could other factors explain the same observations?
• Base rates: How often do solutions like this actually work?`
    ];

    return interventions[Math.floor(Math.random() * interventions.length)];
  }

  /**
   * Generate assumption questioning intervention
   */
  private generateAssumptionQuestioning(context: CognitiveContext): string {
    const assumptions = this.extractAssumptions(context.current_thought || '');
    
    return `🤔 **Assumption Check**: I notice several assumptions in your reasoning. Let's examine them:

${assumptions.map((assumption, i) => `${i + 1}. "${assumption}"`).join('\n')}

For each assumption, consider:
• Is this necessarily true, or just likely?
• What evidence supports this assumption?
• What would happen if this assumption is wrong?
• Are there alternative assumptions that could lead to different conclusions?
• Can you test or validate this assumption?

**Remember**: Unexamined assumptions are often the source of reasoning errors.`;
  }

  /**
   * Generate alternative generation intervention
   */
  private generateAlternativeGeneration(context: CognitiveContext): string {
    return `🌟 **Alternative Thinking**: You seem focused on one approach. Let's expand the solution space:

**Different Approaches to Consider:**
• What would the opposite approach look like?
• How would someone from a different domain solve this?
• What if the constraints were different?
• What creative/unconventional solutions exist?
• What would you do with unlimited resources? With minimal resources?

**Perspective Shifts:**
• Customer/user perspective: What would they want?
• Long-term vs short-term thinking
• Risk-averse vs risk-taking approaches
• Simple vs sophisticated solutions

**Question**: What are 2-3 completely different ways to approach this problem?`;
  }

  /**
   * Generate bias detection intervention
   */
  private generateBiasDetection(context: CognitiveContext): string {
    const detectedBias = this.identifyLikelyBias(context);
    
    return `⚠️ **Bias Alert**: Potential ${detectedBias} detected. Let's counteract:

**${detectedBias} Characteristics:**
${this.getBiasDescription(detectedBias)}

**Debiasing Strategies:**
• Actively seek disconfirming evidence
• Consider why you might be wrong
• Ask: "What would convince me otherwise?"
• Generate alternative explanations
• Consult different perspectives/sources

**Critical Questions:**
• Am I seeing what I expect to see?
• What evidence am I ignoring or downplaying?
• How might someone who disagrees with me view this?`;
  }

  /**
   * Generate reasoning evaluation intervention
   */
  private generateReasoningEvaluation(context: CognitiveContext): string {
    return `🧠 **Reasoning Audit**: Let's evaluate the quality of our reasoning process:

**Logic Check:**
• Are the conclusions following logically from the premises?
• Are there any logical fallacies present?
• Is the reasoning chain complete and valid?

**Evidence Assessment:**
• Is the evidence sufficient for the conclusions?
• Are there gaps in the evidence?
• Is the evidence reliable and relevant?

**Completeness Review:**
• Have all important factors been considered?
• Are there unstated assumptions?
• What perspectives or angles might be missing?

**Robustness Test:**
• How sensitive are the conclusions to changes in assumptions?
• What are the failure modes of this reasoning?
• How would this hold up under scrutiny?`;
  }

  /**
   * Generate uncertainty acknowledgment intervention
   */
  private generateUncertaintyAcknowledgment(context: CognitiveContext): string {
    return `🌫️ **Uncertainty Reality**: It's important to acknowledge what we don't know:

**Sources of Uncertainty:**
• Information gaps: What key information is missing?
• Model uncertainty: How reliable are our mental models?
• Future variability: What could change unexpectedly?
• Implementation challenges: What could go wrong in practice?

**Uncertainty Quantification:**
• What's your confidence interval for key predictions?
• What are the most likely failure modes?
• What early warning signs should you monitor?
• What contingency plans make sense?

**Humble Confidence:**
• "I'm reasonably confident that..." (instead of "I'm certain")
• "Based on current evidence..." (acknowledging limitations)
• "This seems likely, but..." (expressing appropriate doubt)

Remember: Acknowledging uncertainty isn't weakness—it's intellectual honesty.`;
  }

  /**
   * Generate perspective shift intervention
   */
  private generatePerspectiveShift(context: CognitiveContext): string {
    return `🔄 **Perspective Shift**: Let's break out of current thinking patterns:

**Time Perspectives:**
• How will this look in 6 months? 5 years?
• What would past-you think about this approach?
• What will future-you wish current-you had considered?

**Stakeholder Perspectives:**
• End users: What do they really need?
• Maintainers: What will they have to deal with?
• Decision makers: What are their real priorities?
• Critics: What would they attack first?

**Scale Perspectives:**
• What if this needed to work for 10x more users/data/complexity?
• What if resources were 10x more constrained?
• What if the timeline was 10x shorter or longer?

**Domain Perspectives:**
• How would a startup approach this vs a large corporation?
• What would an academic vs practitioner prioritize?
• How do different cultures/regions handle similar problems?

Pick one perspective that's most different from your current approach and explore it.`;
  }

  // Helper methods for pattern detection and analysis
  private detectRepetitivePatterns(thoughts: any[]): number {
    // Implementation for detecting repetitive reasoning patterns
    return 0.3; // Placeholder
  }

  private detectConfidenceEscalation(thoughts: any[]): number {
    // Implementation for detecting escalating confidence
    return 0.2; // Placeholder
  }

  private detectAlternativeConsideration(thoughts: any[]): number {
    // Implementation for detecting alternative consideration
    return 0.5; // Placeholder
  }

  private containsAssumptions(thought: string): boolean {
    const assumptionIndicators = ['assume', 'probably', 'likely', 'should be', 'must be', 'obviously'];
    return assumptionIndicators.some(indicator => thought.toLowerCase().includes(indicator));
  }

  private lacksAlternatives(context: CognitiveContext): boolean {
    // Simple heuristic: check if recent thoughts mention alternatives
    const recentThoughts = context.thought_history.slice(-3);
    const alternativeIndicators = ['alternative', 'another way', 'different approach', 'option', 'instead'];
    
    return !recentThoughts.some(thought => 
      alternativeIndicators.some(indicator => 
        thought.thought.toLowerCase().includes(indicator)
      )
    );
  }

  private detectsPotentialBias(context: CognitiveContext): boolean {
    // Simple bias detection based on confidence and complexity mismatch
    return context.confidence_level > 0.8 && context.complexity > 6;
  }

  private needsPerspectiveShift(context: CognitiveContext): boolean {
    // Check if reasoning has been stuck in similar patterns
    return context.thought_history.length > 3 && context.metacognitive_awareness < 0.5;
  }

  private extractAssumptions(thought: string): string[] {
    // Simple assumption extraction (could be made more sophisticated)
    const sentences = thought.split(/[.!?]+/);
    return sentences.filter(sentence => 
      ['assume', 'probably', 'likely', 'should be', 'must be'].some(indicator =>
        sentence.toLowerCase().includes(indicator)
      )
    ).map(s => s.trim()).filter(s => s.length > 0);
  }

  private identifyLikelyBias(context: CognitiveContext): string {
    // Simple bias identification logic
    if (context.confidence_level > 0.8) return 'overconfidence bias';
    if (context.current_thought?.includes('confirms')) return 'confirmation bias';
    return 'availability bias'; // Default
  }

  private getBiasDescription(bias: string): string {
    const descriptions: Record<string, string> = {
      'overconfidence bias': '• Tendency to overestimate accuracy of beliefs\n• Underestimating risks and uncertainties\n• Insufficient consideration of alternatives',
      'confirmation bias': '• Seeking information that confirms existing beliefs\n• Ignoring contradictory evidence\n• Interpreting ambiguous evidence as confirmatory',
      'availability bias': '• Overweighting easily recalled information\n• Recent/memorable events seem more likely\n• Ignoring base rates and statistical evidence'
    };
    return descriptions[bias] || 'General cognitive bias affecting judgment';
  }

  // Additional helper methods for learning and adaptation
  private extractInterventionType(content: string): MetacognitiveInterventionType | null {
    if (content.includes('Confidence Check')) return 'confidence_calibration';
    if (content.includes('Assumption Check')) return 'assumption_questioning';
    if (content.includes('Alternative Thinking')) return 'alternative_generation';
    if (content.includes('Bias Alert')) return 'bias_detection';
    if (content.includes('Reasoning Audit')) return 'reasoning_evaluation';
    if (content.includes('Uncertainty Reality')) return 'uncertainty_acknowledgment';
    if (content.includes('Perspective Shift')) return 'perspective_shift';
    return null;
  }

  private updateInterventionTypeMetrics(
    type: MetacognitiveInterventionType, 
    outcome: string, 
    impact: number
  ): void {
    // Update intervention-specific metrics (implementation would store this data)
    console.error(`Metacognitive intervention ${type}: ${outcome} (impact: ${impact})`);
  }

  private learnFromContext(context: CognitiveContext, outcome: string, impact: number): void {
    // Learn from successful/unsuccessful interventions in specific contexts
    // This would update the plugin's learning model
  }

  private adaptInterventionPatterns(successfulInterventions: any[]): void {
    // Adapt intervention patterns based on successful examples
  }

  private adaptPatternSensitivity(patternPerformance: Record<string, number>): void {
    // Adjust pattern sensitivity based on performance data
  }

  private updateBiasDetection(detectedBiases: string[]): void {
    // Update bias detection capabilities based on discovered biases
  }

  private generateActivationReason(need: number, context: CognitiveContext): string {
    if (need > 0.8) return 'High metacognitive need detected - confidence/complexity mismatch or bias indicators';
    if (need > 0.6) return 'Moderate metacognitive need - potential reasoning patterns requiring reflection';
    if (need > 0.4) return 'Low metacognitive need - preventive self-reflection recommended';
    return 'Minimal metacognitive intervention needed';
  }

  private calculateInterventionConfidence(type: MetacognitiveInterventionType, context: CognitiveContext): number {
    // Calculate confidence based on intervention type and context
    const baseConfidence = 0.7;
    const contextMatch = this.assessContextMatch(type, context);
    return Math.min(0.95, baseConfidence + (contextMatch * 0.2));
  }

  private assessContextMatch(type: MetacognitiveInterventionType, context: CognitiveContext): number {
    // Assess how well the intervention type matches the context
    switch (type) {
      case 'confidence_calibration':
        return context.confidence_level > 0.8 ? 0.8 : 0.3;
      case 'assumption_questioning':
        return this.containsAssumptions(context.current_thought || '') ? 0.9 : 0.2;
      default:
        return 0.5;
    }
  }

  private getExpectedBenefit(type: MetacognitiveInterventionType): string {
    const benefits: Record<MetacognitiveInterventionType, string> = {
      'confidence_calibration': 'Better calibrated confidence and reduced overconfidence',
      'assumption_questioning': 'Identification and validation of hidden assumptions',
      'alternative_generation': 'Expanded solution space and creative alternatives',
      'bias_detection': 'Reduced cognitive bias impact on reasoning',
      'reasoning_evaluation': 'Improved logical rigor and evidence assessment',
      'uncertainty_acknowledgment': 'Better uncertainty handling and risk awareness',
      'perspective_shift': 'Fresh viewpoints and breakthrough insights'
    };
    return benefits[type];
  }

  private getPotentialSideEffects(type: MetacognitiveInterventionType): string[] {
    const sideEffects: Record<MetacognitiveInterventionType, string[]> = {
      'confidence_calibration': ['Potential overcautiousness', 'Analysis paralysis'],
      'assumption_questioning': ['Increased uncertainty', 'Delayed decision making'],
      'alternative_generation': ['Decision complexity', 'Option paralysis'],
      'bias_detection': ['Self-doubt', 'Overthinking'],
      'reasoning_evaluation': ['Perfectionism', 'Delayed progress'],
      'uncertainty_acknowledgment': ['Reduced confidence', 'Hesitation'],
      'perspective_shift': ['Confusion', 'Loss of focus']
    };
    return sideEffects[type] || [];
  }

  private needsFollowUp(type: MetacognitiveInterventionType): boolean {
    // Determine if this intervention type typically needs follow-up
    return ['confidence_calibration', 'bias_detection', 'reasoning_evaluation'].includes(type);
  }
} 