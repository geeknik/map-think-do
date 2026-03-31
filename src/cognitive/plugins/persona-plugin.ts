/**
 * @fileoverview Persona Plugin - Multi-Perspective Cognitive Roles
 *
 * This plugin implements different cognitive personas that can be activated
 * based on context to provide diverse perspectives and reasoning approaches.
 * Each persona has distinct characteristics, biases, and problem-solving styles.
 *
 * The personas work together to provide comprehensive analysis and avoid
 * single-perspective blind spots.
 */

import {
  CognitivePlugin,
  CognitiveContext,
  PluginActivation,
  PluginIntervention,
} from '../plugin-system.js';

/**
 * Cognitive persona definition
 */
interface CognitivePersona {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
  strengths: string[];
  weaknesses: string[];
  preferred_domains: string[];
  activation_triggers: string[];
  thinking_style: 'analytical' | 'creative' | 'practical' | 'strategic' | 'critical' | 'empathetic';
  risk_tolerance: 'low' | 'medium' | 'high';
  time_horizon: 'short' | 'medium' | 'long';
  complexity_preference: 'simple' | 'moderate' | 'complex';
}

interface PersonaPosition {
  persona: CognitivePersona;
  recommendation: string;
  concern: string;
  validation_check: string;
  stance: 'accelerate' | 'validate' | 'expand' | 'balance';
}

interface PersonaDisagreement {
  topic: string;
  summary: string;
}

/**
 * Persona Plugin Implementation
 */
export class PersonaPlugin extends CognitivePlugin {
  private readonly personas: CognitivePersona[] = [
    {
      id: 'strategist',
      name: 'The Strategist',
      description: 'Long-term thinker focused on overall direction and competitive advantage',
      characteristics: [
        'Systems thinking',
        'Big picture focus',
        'Long-term orientation',
        'Competitive analysis',
        'Resource optimization',
        'Risk assessment',
      ],
      strengths: [
        'Identifies long-term consequences',
        'Sees interconnections',
        'Plans for multiple scenarios',
        'Optimizes resource allocation',
      ],
      weaknesses: [
        'May overlook immediate needs',
        'Can be overly complex',
        'Sometimes paralyzed by too many options',
      ],
      preferred_domains: ['business', 'architecture', 'planning', 'design'],
      activation_triggers: [
        'long-term',
        'strategy',
        'planning',
        'architecture',
        'scalability',
        'competitive',
        'roadmap',
        'vision',
        'direction',
        'future',
      ],
      thinking_style: 'strategic',
      risk_tolerance: 'medium',
      time_horizon: 'long',
      complexity_preference: 'complex',
    },
    {
      id: 'engineer',
      name: 'The Engineer',
      description: 'Systematic problem solver focused on technical feasibility and implementation',
      characteristics: [
        'Systematic approach',
        'Technical depth',
        'Implementation focus',
        'Quality emphasis',
        'Process oriented',
        'Evidence-based',
      ],
      strengths: [
        'Identifies technical constraints',
        'Ensures feasibility',
        'Focuses on implementation details',
        'Values reliability',
      ],
      weaknesses: [
        'May get lost in details',
        'Can be overly conservative',
        'Sometimes ignores user needs for technical elegance',
      ],
      preferred_domains: ['technology', 'engineering', 'development', 'technical'],
      activation_triggers: [
        'implementation',
        'technical',
        'engineering',
        'system',
        'architecture',
        'performance',
        'reliability',
        'scalability',
        'code',
        'algorithm',
      ],
      thinking_style: 'analytical',
      risk_tolerance: 'low',
      time_horizon: 'medium',
      complexity_preference: 'complex',
    },
    {
      id: 'skeptic',
      name: 'The Skeptic',
      description: 'Critical thinker who questions assumptions and identifies potential problems',
      characteristics: [
        'Critical analysis',
        'Assumption questioning',
        'Risk identification',
        "Devil's advocate",
        'Evidence scrutiny',
        'Worst-case thinking',
      ],
      strengths: [
        'Identifies hidden risks',
        'Questions assumptions',
        'Prevents costly mistakes',
        'Ensures thorough analysis',
      ],
      weaknesses: [
        'Can be overly negative',
        'May paralyze decision-making',
        'Sometimes focuses too much on problems vs solutions',
      ],
      preferred_domains: ['security', 'risk', 'quality', 'testing'],
      activation_triggers: [
        'risk',
        'problem',
        'failure',
        'security',
        'testing',
        'validation',
        'assumption',
        'concern',
        'issue',
        'challenge',
        'threat',
      ],
      thinking_style: 'critical',
      risk_tolerance: 'low',
      time_horizon: 'short',
      complexity_preference: 'moderate',
    },
    {
      id: 'creative',
      name: 'The Creative',
      description: 'Innovative thinker who generates novel solutions and approaches',
      characteristics: [
        'Divergent thinking',
        'Innovation focus',
        'Pattern breaking',
        'Possibility exploration',
        'Unconventional approaches',
        'Inspiration seeking',
      ],
      strengths: [
        'Generates novel solutions',
        'Breaks conventional thinking',
        'Finds unexpected connections',
        'Inspires breakthrough ideas',
      ],
      weaknesses: [
        'May lack practical grounding',
        'Can be unrealistic',
        'Sometimes ignores constraints',
        'May overcomplicate simple problems',
      ],
      preferred_domains: ['design', 'innovation', 'creative', 'artistic'],
      activation_triggers: [
        'creative',
        'innovative',
        'novel',
        'unique',
        'original',
        'breakthrough',
        'artistic',
        'design',
        'inspiration',
        'imagination',
        'unconventional',
      ],
      thinking_style: 'creative',
      risk_tolerance: 'high',
      time_horizon: 'medium',
      complexity_preference: 'complex',
    },
    {
      id: 'analyst',
      name: 'The Analyst',
      description: 'Data-driven thinker who relies on evidence and systematic analysis',
      characteristics: [
        'Data-driven',
        'Quantitative analysis',
        'Pattern recognition',
        'Evidence-based',
        'Logical reasoning',
        'Measurement focus',
      ],
      strengths: [
        'Provides objective analysis',
        'Identifies patterns in data',
        'Makes evidence-based decisions',
        'Quantifies impact and risk',
      ],
      weaknesses: [
        'May overlook qualitative factors',
        'Can be slow to decide',
        'Sometimes paralyzed by insufficient data',
      ],
      preferred_domains: ['analytics', 'research', 'data', 'metrics'],
      activation_triggers: [
        'data',
        'analysis',
        'metrics',
        'research',
        'evidence',
        'statistics',
        'measurement',
        'quantify',
        'pattern',
        'trend',
        'correlation',
      ],
      thinking_style: 'analytical',
      risk_tolerance: 'low',
      time_horizon: 'medium',
      complexity_preference: 'complex',
    },
    {
      id: 'philosopher',
      name: 'The Philosopher',
      description: 'Deep thinker focused on fundamental principles and ethical implications',
      characteristics: [
        'Deep thinking',
        'Principle-based',
        'Ethical consideration',
        'Meaning exploration',
        'Value alignment',
        'Wisdom seeking',
      ],
      strengths: [
        'Considers ethical implications',
        'Identifies underlying principles',
        'Provides philosophical grounding',
        'Ensures value alignment',
      ],
      weaknesses: [
        'Can be overly abstract',
        'May slow down practical progress',
        'Sometimes paralyzed by ethical dilemmas',
      ],
      preferred_domains: ['ethics', 'philosophy', 'values', 'principles'],
      activation_triggers: [
        'ethics',
        'values',
        'principles',
        'philosophy',
        'meaning',
        'purpose',
        'moral',
        'right',
        'wrong',
        'should',
        'ought',
        'wisdom',
      ],
      thinking_style: 'empathetic',
      risk_tolerance: 'medium',
      time_horizon: 'long',
      complexity_preference: 'complex',
    },
    {
      id: 'pragmatist',
      name: 'The Pragmatist',
      description: 'Practical thinker focused on what works and can be implemented quickly',
      characteristics: [
        'Practical focus',
        'Implementation oriented',
        'Resource conscious',
        'Time sensitive',
        'Result driven',
        'Compromise willing',
      ],
      strengths: [
        'Gets things done',
        'Focuses on practical solutions',
        'Considers resource constraints',
        'Delivers results quickly',
      ],
      weaknesses: [
        'May sacrifice quality for speed',
        'Can be short-sighted',
        'Sometimes ignores important principles',
      ],
      preferred_domains: ['operations', 'execution', 'delivery', 'practical'],
      activation_triggers: [
        'practical',
        'implement',
        'execute',
        'deliver',
        'quick',
        'simple',
        'efficient',
        'cost',
        'time',
        'resource',
        'realistic',
        'workable',
      ],
      thinking_style: 'practical',
      risk_tolerance: 'medium',
      time_horizon: 'short',
      complexity_preference: 'simple',
    },
    {
      id: 'synthesizer',
      name: 'The Synthesizer',
      description: 'Integrative thinker who combines different perspectives into coherent wholes',
      characteristics: [
        'Integrative thinking',
        'Pattern synthesis',
        'Perspective combination',
        'Holistic view',
        'Connection making',
        'Balance seeking',
      ],
      strengths: [
        'Combines multiple perspectives',
        'Finds common ground',
        'Creates coherent solutions',
        'Balances competing concerns',
      ],
      weaknesses: [
        'Can be indecisive',
        'May create overly complex solutions',
        'Sometimes lacks strong opinions',
      ],
      preferred_domains: ['integration', 'coordination', 'synthesis', 'balance'],
      activation_triggers: [
        'integrate',
        'combine',
        'synthesize',
        'balance',
        'coordinate',
        'unify',
        'merge',
        'connect',
        'holistic',
        'overall',
        'together',
      ],
      thinking_style: 'strategic',
      risk_tolerance: 'medium',
      time_horizon: 'medium',
      complexity_preference: 'moderate',
    },
  ];

  private activePersonas: Set<string> = new Set();
  private personaPerformance: Map<string, number> = new Map();

  constructor() {
    super(
      'persona',
      'Multi-Persona Reasoner',
      'Provides diverse cognitive perspectives through role-based reasoning personas',
      '1.0.0',
      {
        max_active_personas: 2,
        persona_switching_enabled: true,
        perspective_synthesis_enabled: true,
        adaptive_persona_selection: true,
      }
    );

    // Initialize persona performance tracking
    this.personas.forEach(persona => {
      this.personaPerformance.set(persona.id, 0.5); // Start with neutral performance
    });
  }

  async shouldActivate(context: CognitiveContext): Promise<PluginActivation> {
    try {
      // Calculate persona relevance scores
      const personaScores = this.calculatePersonaRelevance(context);
      const topPersonas = this.selectTopPersonas(personaScores);

      if (topPersonas.length === 0) {
        return {
          should_activate: false,
          priority: 0,
          confidence: 0,
          reason: 'No relevant personas identified',
          estimated_impact: 'low',
          resource_requirements: {
            cognitive_load: 0,
            time_cost: 0,
            creativity_required: false,
            analysis_required: false,
          },
        };
      }

      // Calculate activation strength
      const maxScore = Math.max(...topPersonas.map(p => p.score));
      const diversityBonus = this.calculateDiversityBonus(topPersonas, context);
      const activationScore = maxScore + diversityBonus;

      const shouldActivate = activationScore > 0.4;
      const priority = Math.min(90, activationScore * 100); // Slightly lower than metacognitive

      return {
        should_activate: shouldActivate,
        priority,
        confidence: activationScore,
        reason: `Relevant personas identified: ${topPersonas.map(p => p.persona.name).join(', ')}`,
        estimated_impact: activationScore > 0.7 ? 'high' : activationScore > 0.5 ? 'medium' : 'low',
        resource_requirements: {
          cognitive_load: 0.4, // Moderate cognitive load for perspective switching
          time_cost: topPersonas.length, // One thought per active persona
          creativity_required: topPersonas.some(p => p.persona.thinking_style === 'creative'),
          analysis_required: topPersonas.some(p => p.persona.thinking_style === 'analytical'),
        },
      };
    } catch (error) {
      console.error('Error in PersonaPlugin shouldActivate:', error);
      return {
        should_activate: false,
        priority: 0,
        confidence: 0,
        reason: 'Error in persona assessment',
        estimated_impact: 'low',
        resource_requirements: {
          cognitive_load: 0,
          time_cost: 0,
          creativity_required: false,
          analysis_required: false,
        },
      };
    }
  }

  async intervene(context: CognitiveContext): Promise<PluginIntervention> {
    try {
      // Select the most relevant personas
      const personaScores = this.calculatePersonaRelevance(context);
      const selectedPersonas = this.selectTopPersonas(personaScores).slice(
        0,
        this.config.max_active_personas
      );

      // Generate multi-persona intervention
      const content = await this.generatePersonaIntervention(selectedPersonas, context);

      // Update active personas
      this.activePersonas.clear();
      selectedPersonas.forEach(p => this.activePersonas.add(p.persona.id));

      const intervention: PluginIntervention = {
        type: 'context_enhancement',
        content,
        metadata: {
          plugin_id: this.id,
          confidence: this.calculateInterventionConfidence(selectedPersonas),
          expected_benefit: 'Diverse perspectives and reduced single-viewpoint bias',
          side_effects: ['Potential decision complexity', 'Analysis paralysis if overused'],
        },
        follow_up_needed: selectedPersonas.length > 1,
        next_check_after: 2,
        success_metrics: ['perspective_diversity', 'solution_quality', 'bias_reduction'],
        failure_indicators: ['confusion', 'decision_paralysis', 'conflicting_advice'],
      };

      return intervention;
    } catch (error) {
      console.error('Error in PersonaPlugin intervene:', error);
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
      // Update persona performance based on feedback
      for (const personaId of this.activePersonas) {
        const currentPerformance = this.personaPerformance.get(personaId) || 0.5;
        const adjustment = this.calculatePerformanceAdjustment(outcome, impact_score);
        const newPerformance = Math.max(0.1, Math.min(0.9, currentPerformance + adjustment));

        this.personaPerformance.set(personaId, newPerformance);
      }

      // Learn from context patterns
      this.learnPersonaContextPatterns(context, outcome, impact_score);
    } catch (error) {
      console.error('Error in PersonaPlugin receiveFeedback:', error);
    }
  }

  async adapt(learningData: any): Promise<void> {
    if (!this.learning_enabled) return;

    try {
      // Adapt persona selection based on successful patterns
      if (learningData.successful_persona_combinations) {
        this.adaptPersonaCombinations(learningData.successful_persona_combinations);
      }

      // Update persona activation thresholds
      if (learningData.persona_performance_data) {
        this.updatePersonaThresholds(learningData.persona_performance_data);
      }
    } catch (error) {
      console.error('Error in PersonaPlugin adapt:', error);
    }
  }

  /**
   * Calculate relevance scores for all personas based on context
   */
  private calculatePersonaRelevance(
    context: CognitiveContext
  ): Array<{ persona: CognitivePersona; score: number }> {
    return this.personas
      .map(persona => ({
        persona,
        score: this.calculatePersonaScore(persona, context),
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate individual persona relevance score
   */
  private calculatePersonaScore(persona: CognitivePersona, context: CognitiveContext): number {
    let score = 0;

    // Domain matching
    if (context.domain) {
      const domainMatch = persona.preferred_domains.some(domain =>
        context.domain!.toLowerCase().includes(domain.toLowerCase())
      );
      if (domainMatch) score += 0.3;
    }

    // Trigger word matching
    if (context.current_thought) {
      const thoughtLower = context.current_thought.toLowerCase();
      const triggerMatches = persona.activation_triggers.filter(trigger =>
        thoughtLower.includes(trigger.toLowerCase())
      ).length;
      score += (triggerMatches / persona.activation_triggers.length) * 0.4;
    }

    // Complexity preference matching
    const complexityMatch = this.calculateComplexityMatch(persona, context.complexity);
    score += complexityMatch * 0.2;

    // Historical performance
    const performance = this.personaPerformance.get(persona.id) || 0.5;
    score += (performance - 0.5) * 0.1; // Adjust based on past performance

    // Context-specific factors
    score += this.calculateContextSpecificScore(persona, context);

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate complexity preference matching
   */
  private calculateComplexityMatch(persona: CognitivePersona, complexity: number): number {
    const normalizedComplexity = complexity / 10;

    switch (persona.complexity_preference) {
      case 'simple':
        return 1 - normalizedComplexity; // Prefers lower complexity
      case 'moderate':
        return 1 - Math.abs(normalizedComplexity - 0.5) * 2; // Prefers medium complexity
      case 'complex':
        return normalizedComplexity; // Prefers higher complexity
      default:
        return 0.5;
    }
  }

  /**
   * Calculate context-specific scoring factors
   */
  private calculateContextSpecificScore(
    persona: CognitivePersona,
    context: CognitiveContext
  ): number {
    let score = 0;

    // Urgency matching
    if (context.urgency === 'high' && persona.time_horizon === 'short') {
      score += 0.15;
    } else if (context.urgency === 'low' && persona.time_horizon === 'long') {
      score += 0.1;
    }

    // Confidence level considerations
    if (context.confidence_level < 0.5 && persona.id === 'skeptic') {
      score += 0.1; // Skeptic helps when confidence is low
    } else if (context.confidence_level > 0.8 && persona.id === 'skeptic') {
      score += 0.15; // Skeptic especially valuable when overconfident
    }

    // Creative pressure
    if (context.creative_pressure > 0.7 && persona.thinking_style === 'creative') {
      score += 0.2;
    }

    // Metacognitive awareness
    if (context.metacognitive_awareness < 0.5 && persona.id === 'philosopher') {
      score += 0.1;
    }

    return score;
  }

  /**
   * Select top personas avoiding redundancy
   */
  private selectTopPersonas(
    personaScores: Array<{ persona: CognitivePersona; score: number }>
  ): Array<{ persona: CognitivePersona; score: number }> {
    const selected: Array<{ persona: CognitivePersona; score: number }> = [];
    const usedThinkingStyles = new Set<string>();

    for (const personaScore of personaScores) {
      if (personaScore.score < 0.3) break; // Minimum threshold

      // Avoid duplicate thinking styles unless score is very high
      if (usedThinkingStyles.has(personaScore.persona.thinking_style) && personaScore.score < 0.7) {
        continue;
      }

      selected.push(personaScore);
      usedThinkingStyles.add(personaScore.persona.thinking_style);

      if (selected.length >= this.config.max_active_personas) break;
    }

    return selected;
  }

  /**
   * Calculate diversity bonus for multiple personas
   */
  private calculateDiversityBonus(
    personas: Array<{ persona: CognitivePersona; score: number }>,
    context: CognitiveContext
  ): number {
    if (personas.length < 2) return 0;

    // Bonus for diverse thinking styles
    const thinkingStyles = new Set(personas.map(p => p.persona.thinking_style));
    const diversityBonus = (thinkingStyles.size - 1) * 0.1;

    // Bonus for complementary personas (e.g., creative + skeptic)
    const complementaryBonus = this.calculateComplementaryBonus(personas);

    return diversityBonus + complementaryBonus;
  }

  /**
   * Calculate bonus for complementary persona combinations
   */
  private calculateComplementaryBonus(
    personas: Array<{ persona: CognitivePersona; score: number }>
  ): number {
    const ids = personas.map(p => p.persona.id);

    // Predefined complementary pairs
    const complementaryPairs = [
      ['creative', 'engineer'],
      ['strategist', 'pragmatist'],
      ['analyst', 'philosopher'],
      ['skeptic', 'creative'],
    ];

    for (const pair of complementaryPairs) {
      if (pair.every(id => ids.includes(id))) {
        return 0.15; // Bonus for complementary combination
      }
    }

    return 0;
  }

  /**
   * Generate multi-persona intervention content
   */
  private async generatePersonaIntervention(
    selectedPersonas: Array<{ persona: CognitivePersona; score: number }>,
    context: CognitiveContext
  ): Promise<string> {
    if (selectedPersonas.length === 1) {
      return this.generateSinglePersonaIntervention(selectedPersonas[0].persona, context);
    } else {
      return this.generateMultiPersonaIntervention(selectedPersonas, context);
    }
  }

  /**
   * Generate single persona intervention
   */
  private generateSinglePersonaIntervention(
    persona: CognitivePersona,
    context: CognitiveContext
  ): string {
    const perspective = this.generatePersonaPerspective(persona, context);

    return `🎭 **${persona.name} Perspective**

*${persona.description}*

**${persona.name}'s Take:**
${perspective}

**Key Considerations from this perspective:**
${this.generatePersonaConsiderations(persona, context)}

**Questions ${persona.name} would ask:**
${this.generatePersonaQuestions(persona, context)}`;
  }

  /**
   * Generate multi-persona intervention
   */
  private generateMultiPersonaIntervention(
    selectedPersonas: Array<{ persona: CognitivePersona; score: number }>,
    context: CognitiveContext
  ): string {
    const positions = selectedPersonas.map(({ persona }) => this.buildPersonaPosition(persona));
    const perspectives = selectedPersonas
      .map(({ persona }, index) => {
        const perspective = this.generatePersonaPerspective(persona, context);
        const position = positions[index];
        return `**${persona.name}**: ${perspective}
Recommendation: ${position.recommendation}
Primary concern: ${position.concern}
Validation focus: ${position.validation_check}`;
      })
      .join('\n\n');

    const disagreement = this.detectPersonaDisagreement(positions);
    const synthesis = this.generatePerspectiveSynthesis(positions, disagreement, context);
    const balancedApproach = this.generateBalancedApproach(positions, disagreement, context);

    const ids = selectedPersonas.map(p => p.persona.id);
    let feedbackLoop = '';
    if (ids.includes('engineer') && ids.includes('philosopher') && ids.includes('synthesizer')) {
      feedbackLoop =
        '\n\n**Feedback Loop:**\n1. Engineer proposes a technical path.' +
        '\n2. Philosopher examines principles and ethics.' +
        '\n3. Synthesizer integrates both views into a coherent solution.';
    }

    return `🎭 **Multi-Perspective Analysis**

${perspectives}${feedbackLoop}

**Where they disagree:**
${disagreement?.summary || 'The selected perspectives are broadly aligned, but they emphasize different guardrails.'}

**Synthesis & Integration:**
${synthesis}

**Balanced Approach:**
${balancedApproach}`;
  }

  /**
   * Generate individual persona perspective
   */
  private generatePersonaPerspective(persona: CognitivePersona, context: CognitiveContext): string {
    const templates = this.getPersonaTemplates(persona.id);
    const template = this.selectDeterministicTemplate(templates, persona, context);

    return this.customizeTemplate(template, persona, context);
  }

  /**
   * Get persona-specific response templates
   */
  private getPersonaTemplates(personaId: string): string[] {
    const templates: Record<string, string[]> = {
      strategist: [
        "Looking at the bigger picture, this approach needs to consider long-term scalability and competitive positioning. What's the 5-year vision here?",
        'From a strategic standpoint, we should evaluate how this fits into our overall roadmap and what resources it will require over time.',
        "This decision will have ripple effects across multiple areas. Let's map out the interconnections and potential strategic implications.",
      ],
      engineer: [
        'From a technical perspective, we need to consider implementation complexity, maintainability, and performance implications.',
        "Let's break this down into concrete technical requirements and identify potential implementation challenges early.",
        'The engineering reality is that we need to balance technical debt, performance, and maintainability. What are the trade-offs?',
      ],
      skeptic: [
        "I'm concerned about the assumptions we're making here. What could go wrong, and how confident are we in our premises?",
        "Let's stress-test this approach. What are the failure modes, and do we have contingency plans?",
        'Before we proceed, what evidence do we have that this approach will actually work? What are we potentially overlooking?',
      ],
      creative: [
        "What if we approached this from a completely different angle? There might be unconventional solutions we haven't considered.",
        'This problem reminds me of [creative analogy]. Could we adapt that approach or find inspiration from unexpected sources?',
        "Let's break free from conventional thinking. What would the most innovative solution look like, even if it seems impractical at first?",
      ],
      analyst: [
        'We need more data to make an informed decision. What metrics should we be tracking, and what does the evidence actually show?',
        "Let's quantify the impact and risks. What are the key performance indicators, and how will we measure success?",
        "Based on the available data, here are the patterns I'm seeing and the statistical implications we should consider.",
      ],
      philosopher: [
        'We should consider the deeper implications and ethical dimensions of this decision. What values are we optimizing for?',
        'This raises fundamental questions about our principles and long-term purpose. Are we aligned with our core values?',
        "Let's step back and consider the meaning and broader impact of this choice. What kind of precedent are we setting?",
      ],
      pragmatist: [
        "What's the simplest solution that actually works? We need something we can implement with current resources and constraints.",
        "Let's focus on what's practical and achievable. What can we deliver quickly that provides real value?",
        "Time and resources are limited. What's the minimum viable approach that gets us 80% of the benefit with 20% of the effort?",
      ],
      synthesizer: [
        'I see value in multiple approaches here. How can we combine the best elements from different perspectives?',
        'There are trade-offs between different viewpoints, but perhaps we can find a balanced solution that addresses multiple concerns.',
        "Let's integrate these various perspectives into a coherent approach that leverages the strengths of each viewpoint.",
      ],
    };

    return templates[personaId] || ['Let me consider this from my unique perspective...'];
  }

  /**
   * Customize template with context-specific information
   */
  private customizeTemplate(
    template: string,
    persona: CognitivePersona,
    context: CognitiveContext
  ): string {
    let customized = template;

    if (customized.includes('[creative analogy]')) {
      customized = customized.replace('[creative analogy]', this.describeCreativeAnalogy(context));
    }

    const anchor = this.generatePersonaContextAnchor(persona, context);
    return anchor ? `${customized} ${anchor}` : customized;
  }

  /**
   * Generate persona-specific considerations
   */
  private generatePersonaConsiderations(
    persona: CognitivePersona,
    context: CognitiveContext
  ): string {
    const considerations = [
      ...persona.strengths.slice(0, 2).map(strength => `${strength} in this context`),
      ...this.generateContextSpecificConsiderations(persona, context),
    ]
      .slice(0, 4)
      .map(strength => `• ${strength}`)
      .join('\n');

    return considerations;
  }

  /**
   * Generate persona-specific questions
   */
  private generatePersonaQuestions(persona: CognitivePersona, context: CognitiveContext): string {
    const questionTemplates: Record<string, string[]> = {
      strategist: [
        'How does this align with our long-term objectives?',
        'What are the competitive implications?',
        'How will this scale over time?',
      ],
      engineer: [
        'What are the technical constraints and requirements?',
        'How will we handle edge cases and error conditions?',
        "What's the maintenance and operational overhead?",
      ],
      skeptic: [
        'What assumptions are we making that might be wrong?',
        'What are the biggest risks and failure modes?',
        'What evidence contradicts our current approach?',
      ],
      creative: [
        "What unconventional approaches haven't we considered?",
        'How might we completely reimagine this problem?',
        'What would the most innovative solution look like?',
      ],
      analyst: [
        'What data do we need to validate this approach?',
        'How will we measure success and track progress?',
        'What patterns in historical data inform this decision?',
      ],
      philosopher: [
        'What are the ethical implications of this choice?',
        'How does this align with our core values and principles?',
        "What's the deeper meaning and purpose behind this decision?",
      ],
      pragmatist: [
        "What's the simplest solution that actually works?",
        'What can we realistically achieve with current resources?',
        "What's the fastest path to a working solution?",
      ],
      synthesizer: [
        'How can we combine the best aspects of different approaches?',
        'What common ground exists between conflicting viewpoints?',
        'How do we balance competing priorities and constraints?',
      ],
    };

    const questions = questionTemplates[persona.id] || ['What questions should we be asking?'];
    const contextualQuestion = this.generateContextualQuestion(persona, context);
    return questions
      .slice(0, 2)
      .concat(contextualQuestion ? [contextualQuestion] : [])
      .map(q => `• ${q}`)
      .join('\n');
  }

  /**
   * Generate synthesis of multiple perspectives
   */
  private generatePerspectiveSynthesis(
    positions: PersonaPosition[],
    disagreement: PersonaDisagreement | null,
    context: CognitiveContext
  ): string {
    if (disagreement?.topic === 'Execution horizon') {
      return 'Decision: protect the long-term constraint, but express it as the smallest reversible slice that can be executed now.\nTradeoff accepted: less immediate scope in exchange for lower rework and lock-in risk.';
    }

    if (disagreement?.topic === 'Risk posture') {
      return 'Decision: keep one bold option alive, but force it through an explicit safety boundary and comparison against the conservative path.\nTradeoff accepted: a small amount of extra exploration to avoid defaulting into the wrong answer.';
    }

    if (
      disagreement?.topic === 'Speed vs verification' ||
      disagreement?.topic === 'Option breadth vs proof' ||
      context.confidence_level < 0.4
    ) {
      return 'Decision: take the smallest step that both moves the work forward and produces evidence on the highest-risk assumption.\nTradeoff accepted: slower momentum right now in exchange for less false confidence later.';
    }

    const personaNames = positions.map(position => position.persona.name).join(' + ');
    return `Decision: combine ${personaNames} into one plan with explicit guardrails before expanding scope.\nTradeoff accepted: a narrower next move in exchange for a clearer decision path.`;
  }

  /**
   * Generate balanced approach recommendation
   */
  private generateBalancedApproach(
    positions: PersonaPosition[],
    disagreement: PersonaDisagreement | null,
    context: CognitiveContext
  ): string {
    if (disagreement?.topic === 'Execution horizon') {
      return 'Next move: write the interface, constraint, or success boundary that preserves the long-term path, then implement the smallest useful increment against it.';
    }

    if (disagreement?.topic === 'Risk posture') {
      return 'Next move: prototype the boldest plausible option behind a rollback boundary and compare it against the safer baseline using one shared success metric.';
    }

    if (
      disagreement?.topic === 'Speed vs verification' ||
      disagreement?.topic === 'Option breadth vs proof' ||
      context.confidence_level < 0.4
    ) {
      return 'Next move: name the assumption most likely to fail, run one targeted check, and only expand scope if that check passes.';
    }

    const orderedChecks = positions.map(position => position.validation_check).slice(0, 2);
    return `Next move: ${orderedChecks.join(' Then ')}`;
  }

  private buildPersonaPosition(persona: CognitivePersona): PersonaPosition {
    switch (persona.id) {
      case 'strategist':
        return {
          persona,
          recommendation:
            'Preserve long-term scalability and avoid local fixes that create future lock-in.',
          concern: 'A quick answer may undermine roadmap flexibility or architectural leverage.',
          validation_check: 'State the long-term constraint this step must not violate.',
          stance: 'expand',
        };
      case 'engineer':
        return {
          persona,
          recommendation:
            'Reduce the problem to interfaces, failure modes, and implementation constraints before committing.',
          concern: 'Unseen technical complexity can break an otherwise attractive plan.',
          validation_check: 'Prototype or benchmark the riskiest technical boundary.',
          stance: 'validate',
        };
      case 'skeptic':
        return {
          persona,
          recommendation: 'Pressure-test the strongest assumption before treating it as a fact.',
          concern: 'The current path may rest on unverified or contradictory evidence.',
          validation_check: 'Try to falsify the assumption most likely to fail.',
          stance: 'validate',
        };
      case 'creative':
        return {
          persona,
          recommendation:
            'Generate one non-obvious alternative before the team converges on the default plan.',
          concern: 'The obvious solution may hide a simpler or higher-leverage option.',
          validation_check: 'Compare the default path against one unconventional alternative.',
          stance: 'expand',
        };
      case 'analyst':
        return {
          persona,
          recommendation:
            'Choose the next move that can be judged by a concrete metric or observation.',
          concern: 'Reasoning may drift if the decision is not anchored to evidence.',
          validation_check: 'Define the metric or observation that would change the decision.',
          stance: 'validate',
        };
      case 'philosopher':
        return {
          persona,
          recommendation:
            'Make the principle behind the decision explicit before optimizing for convenience.',
          concern: 'A locally efficient move may conflict with broader values or precedent.',
          validation_check: 'State the principle that would make this path unacceptable.',
          stance: 'balance',
        };
      case 'pragmatist':
        return {
          persona,
          recommendation:
            'Pick the smallest reversible step that delivers real progress under current constraints.',
          concern: 'Further analysis may cost more than it teaches right now.',
          validation_check:
            'Timebox the next step so it produces progress within current resource limits.',
          stance: 'accelerate',
        };
      case 'synthesizer':
      default:
        return {
          persona,
          recommendation:
            'Combine the best parts of competing views into one bounded plan with explicit tradeoffs.',
          concern: 'The team may optimize for one dimension and ignore the rest.',
          validation_check: 'List the tradeoff being accepted and the guardrail that contains it.',
          stance: 'balance',
        };
    }
  }

  private detectPersonaDisagreement(positions: PersonaPosition[]): PersonaDisagreement | null {
    const highRiskPosition = positions.find(position => position.persona.risk_tolerance === 'high');
    const lowRiskPosition = positions.find(position => position.persona.risk_tolerance === 'low');

    if (highRiskPosition && lowRiskPosition) {
      return {
        topic: 'Risk posture',
        summary: `${lowRiskPosition.persona.name} wants stronger proof before commitment, while ${highRiskPosition.persona.name} wants to keep a bolder alternative alive instead of defaulting early.`,
      };
    }

    const shortHorizonPosition = positions.find(
      position => position.persona.time_horizon === 'short'
    );
    const longHorizonPosition = positions.find(
      position => position.persona.time_horizon === 'long'
    );

    if (shortHorizonPosition && longHorizonPosition) {
      return {
        topic: 'Execution horizon',
        summary: `${shortHorizonPosition.persona.name} is optimizing for the next deliverable, while ${longHorizonPosition.persona.name} is guarding against long-term rework or strategic drift.`,
      };
    }

    const acceleratePosition = positions.find(position => position.stance === 'accelerate');
    const validatePosition = positions.find(position => position.stance === 'validate');

    if (acceleratePosition && validatePosition) {
      return {
        topic: 'Speed vs verification',
        summary: `${acceleratePosition.persona.name} wants immediate forward motion, while ${validatePosition.persona.name} wants evidence before expanding the plan.`,
      };
    }

    const expandPosition = positions.find(position => position.stance === 'expand');

    if (expandPosition && validatePosition) {
      return {
        topic: 'Option breadth vs proof',
        summary: `${expandPosition.persona.name} wants to widen the option set, while ${validatePosition.persona.name} wants to prove the current claim before adding more branches.`,
      };
    }

    return null;
  }

  private selectDeterministicTemplate(
    templates: string[],
    persona: CognitivePersona,
    context: CognitiveContext
  ): string {
    if (templates.length === 0) {
      return 'Let me consider this from a different angle.';
    }

    const seed = `${persona.id}:${context.current_thought || ''}:${context.domain || ''}:${context.urgency}:${Math.round(context.complexity)}`;
    let hash = 0;
    for (const char of seed) {
      hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }

    return templates[hash % templates.length];
  }

  private describeCreativeAnalogy(context: CognitiveContext): string {
    if (context.domain?.includes('software')) return 'incident response drill';
    if (context.domain?.includes('design')) return 'gallery critique';
    if (context.domain?.includes('business')) return 'portfolio rebalancing';
    if (context.urgency === 'high') return 'pit-stop under race conditions';
    return 'systems rehearsal';
  }

  private generatePersonaContextAnchor(
    persona: CognitivePersona,
    context: CognitiveContext
  ): string {
    const anchors: string[] = [];

    if (context.current_thought) {
      anchors.push(`Current focus: "${this.summarizeThought(context.current_thought)}".`);
    }
    if (context.urgency === 'high' && persona.id === 'pragmatist') {
      anchors.push('Time pressure means the next step should be reversible and concrete.');
    }
    if (context.confidence_level < 0.4 && ['skeptic', 'analyst'].includes(persona.id)) {
      anchors.push('Low confidence suggests we should prefer verification over elaboration.');
    }
    if (context.time_constraints?.deadline) {
      anchors.push(
        'A deadline is present, so prioritization matters more than exhaustive exploration.'
      );
    }

    return anchors.slice(0, 2).join(' ');
  }

  private generateContextSpecificConsiderations(
    persona: CognitivePersona,
    context: CognitiveContext
  ): string[] {
    const considerations: string[] = [];

    if (context.domain) {
      considerations.push(`Applies ${persona.name}'s lens to the ${context.domain} domain`);
    }
    if (context.urgency === 'high') {
      considerations.push('Keeps the recommendation usable under time pressure');
    }
    if (context.confidence_level < 0.4) {
      considerations.push('Pushes for evidence before committing further');
    }
    if (context.thought_history.length > 0) {
      considerations.push('Builds on the recent reasoning trail instead of restarting analysis');
    }

    return considerations;
  }

  private generateContextualQuestion(
    persona: CognitivePersona,
    context: CognitiveContext
  ): string | null {
    if (context.time_constraints?.deadline) {
      return 'What is the single most important thing to validate before the deadline?';
    }
    if (context.confidence_level < 0.4 && ['skeptic', 'analyst', 'engineer'].includes(persona.id)) {
      return 'Which assumption can we test quickly to raise confidence?';
    }
    if (context.thought_history.length > 1 && persona.id === 'synthesizer') {
      return 'Which earlier conclusion still holds up after the latest reasoning step?';
    }

    return null;
  }

  private summarizeThought(thought: string): string {
    return thought.length > 80 ? `${thought.slice(0, 77)}...` : thought;
  }

  // Helper methods for learning and adaptation
  private calculatePerformanceAdjustment(outcome: string, impact_score: number): number {
    const baseAdjustment = outcome === 'success' ? 0.05 : outcome === 'partial' ? 0.02 : -0.03;
    const impactMultiplier = (impact_score - 0.5) * 0.1; // Scale by impact
    return baseAdjustment + impactMultiplier;
  }

  private calculateInterventionConfidence(
    selectedPersonas: Array<{ persona: CognitivePersona; score: number }>
  ): number {
    const averageScore =
      selectedPersonas.reduce((sum, p) => sum + p.score, 0) / selectedPersonas.length;
    const diversityBonus = selectedPersonas.length > 1 ? 0.1 : 0;
    return Math.min(0.95, averageScore + diversityBonus);
  }

  private learnPersonaContextPatterns(
    context: CognitiveContext,
    outcome: string,
    impact: number
  ): void {
    // Learn which personas work well in which contexts
    // This would be implemented with more sophisticated learning algorithms
  }

  private adaptPersonaCombinations(combinations: any[]): void {
    // Adapt persona combination preferences based on successful patterns
  }

  private updatePersonaThresholds(performanceData: any): void {
    // Update activation thresholds based on performance data
  }
}
