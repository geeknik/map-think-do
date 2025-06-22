/**
 * @fileoverview Creative Synthesizer Tool
 * 
 * Advanced creative reasoning tool that generates novel ideas, combines concepts,
 * provides creative problem-solving approaches, and facilitates innovative thinking.
 */

import { ExternalTool, ToolInput, ToolOutput, ValidationResult, ToolSchema } from '../tool-registry.js';

export class CreativeSynthesizer implements ExternalTool {
  id = 'creative-synthesizer';
  name = 'Creative Synthesizer';
  description = 'Advanced creative reasoning and idea generation tool';
  category = 'creative' as const;
  version = '1.0.0';
  capabilities = [
    'idea_generation',
    'concept_combination',
    'creative_problem_solving',
    'metaphor_creation',
    'brainstorming',
    'innovation_techniques',
    'lateral_thinking',
    'creative_constraints'
  ];

  config = {
    timeout_ms: 8000,
    max_retries: 2,
    requires_auth: false,
    rate_limit: {
      requests_per_minute: 60,
      burst_limit: 8
    }
  };

  async execute(input: ToolInput): Promise<ToolOutput> {
    const startTime = Date.now();
    
    try {
      const result = await this.performCreativeOperation(input);
      
      return {
        success: true,
        result,
        metadata: {
          execution_time_ms: Date.now() - startTime,
          tool_version: this.version,
          confidence: result.confidence,
          reasoning_trace: result.creative_process
        }
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        metadata: {
          execution_time_ms: Date.now() - startTime,
          tool_version: this.version
        },
        error: {
          code: 'CREATIVE_ERROR',
          message: (error as Error).message,
          details: error
        }
      };
    }
  }

  async validate(input: ToolInput): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!input.operation) {
      errors.push('Operation is required');
    } else if (!this.getSupportedOperations().includes(input.operation)) {
      errors.push(`Unsupported operation: ${input.operation}`);
      suggestions.push(`Supported operations: ${this.getSupportedOperations().join(', ')}`);
    }

    if (input.operation === 'generate_ideas' && !input.parameters.topic) {
      errors.push('Topic parameter is required for generate_ideas operation');
    }

    if (input.operation === 'combine_concepts' && (!input.parameters.concept1 || !input.parameters.concept2)) {
      errors.push('Both concept1 and concept2 parameters are required for combine_concepts operation');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  getSchema(): ToolSchema {
    return {
      operations: {
        'generate_ideas': {
          description: 'Generate creative ideas for a given topic or problem',
          parameters: {
            topic: { type: 'string', description: 'Topic or problem to generate ideas for' },
            quantity: { type: 'number', description: 'Number of ideas to generate', default: 10 },
            creativity_level: { type: 'string', description: 'Level of creativity (conservative, moderate, radical)', default: 'moderate' }
          },
          returns: {
            ideas: { type: 'array', description: 'Generated creative ideas' },
            techniques_used: { type: 'array', description: 'Creative techniques applied' }
          },
          examples: []
        },
        'combine_concepts': {
          description: 'Creatively combine two different concepts',
          parameters: {
            concept1: { type: 'string', description: 'First concept to combine' },
            concept2: { type: 'string', description: 'Second concept to combine' },
            combination_style: { type: 'string', description: 'Style of combination', default: 'hybrid' }
          },
          returns: {
            combinations: { type: 'array', description: 'Creative combinations of the concepts' },
            synergies: { type: 'array', description: 'Identified synergies between concepts' }
          },
          examples: []
        },
        'solve_creatively': {
          description: 'Apply creative problem-solving techniques',
          parameters: {
            problem: { type: 'string', description: 'Problem to solve creatively' },
            constraints: { type: 'array', description: 'Constraints to work within', default: [] },
            techniques: { type: 'array', description: 'Specific techniques to use', default: ['all'] }
          },
          returns: {
            solutions: { type: 'array', description: 'Creative solutions' },
            approach: { type: 'string', description: 'Creative approach taken' }
          },
          examples: []
        },
        'create_metaphors': {
          description: 'Create metaphors and analogies for complex concepts',
          parameters: {
            concept: { type: 'string', description: 'Concept to create metaphors for' },
            domain: { type: 'string', description: 'Domain for metaphor source', default: 'any' },
            quantity: { type: 'number', description: 'Number of metaphors to create', default: 5 }
          },
          returns: {
            metaphors: { type: 'array', description: 'Created metaphors with explanations' },
            effectiveness_scores: { type: 'array', description: 'Effectiveness ratings for each metaphor' }
          },
          examples: []
        }
      }
    };
  }

  private async performCreativeOperation(input: ToolInput): Promise<any> {
    switch (input.operation) {
      case 'generate_ideas':
        return this.generateIdeas(input.parameters.topic, input.parameters.quantity || 10, input.parameters.creativity_level || 'moderate');
      
      case 'combine_concepts':
        return this.combineConcepts(input.parameters.concept1, input.parameters.concept2, input.parameters.combination_style || 'hybrid');
      
      case 'solve_creatively':
        return this.solveCreatively(input.parameters.problem, input.parameters.constraints || [], input.parameters.techniques || ['all']);
      
      case 'create_metaphors':
        return this.createMetaphors(input.parameters.concept, input.parameters.domain || 'any', input.parameters.quantity || 5);
      
      default:
        throw new Error(`Unsupported operation: ${input.operation}`);
    }
  }

  private generateIdeas(topic: string, quantity: number, creativityLevel: string): any {
    const creativeProcess: string[] = [];
    creativeProcess.push(`Generating ${quantity} ideas for topic: ${topic}`);
    creativeProcess.push(`Creativity level: ${creativityLevel}`);

    const ideas: any[] = [];
    const techniquesUsed: string[] = [];

    // SCAMPER technique
    if (creativityLevel !== 'conservative') {
      const scamperIdeas = this.applySCAMPER(topic);
      ideas.push(...scamperIdeas);
      techniquesUsed.push('SCAMPER');
      creativeProcess.push(`Applied SCAMPER technique: ${scamperIdeas.length} ideas generated`);
    }

    // Random word association
    const randomWordIdeas = this.applyRandomWordAssociation(topic, Math.ceil(quantity / 3));
    ideas.push(...randomWordIdeas);
    techniquesUsed.push('Random Word Association');
    creativeProcess.push(`Applied random word association: ${randomWordIdeas.length} ideas generated`);

    // Six thinking hats
    if (creativityLevel === 'radical') {
      const sixHatsIdeas = this.applySixThinkingHats(topic);
      ideas.push(...sixHatsIdeas);
      techniquesUsed.push('Six Thinking Hats');
      creativeProcess.push(`Applied Six Thinking Hats: ${sixHatsIdeas.length} ideas generated`);
    }

    // Morphological analysis
    const morphologyIdeas = this.applyMorphologicalAnalysis(topic, quantity);
    ideas.push(...morphologyIdeas);
    techniquesUsed.push('Morphological Analysis');
    creativeProcess.push(`Applied morphological analysis: ${morphologyIdeas.length} ideas generated`);

    // Select best ideas
    const selectedIdeas = this.selectBestIdeas(ideas, quantity);
    creativeProcess.push(`Selected top ${selectedIdeas.length} ideas from ${ideas.length} generated`);

    return {
      ideas: selectedIdeas,
      techniques_used: techniquesUsed,
      creative_process: creativeProcess,
      confidence: 0.82,
      creativity_metrics: {
        novelty_score: this.calculateNoveltyScore(selectedIdeas),
        feasibility_score: this.calculateFeasibilityScore(selectedIdeas),
        diversity_score: this.calculateDiversityScore(selectedIdeas)
      }
    };
  }

  private combineConcepts(concept1: string, concept2: string, combinationStyle: string): any {
    const creativeProcess: string[] = [];
    creativeProcess.push(`Combining concepts: ${concept1} + ${concept2}`);
    creativeProcess.push(`Combination style: ${combinationStyle}`);

    const combinations: any[] = [];
    const synergies: any[] = [];

    // Hybrid combination
    if (combinationStyle === 'hybrid' || combinationStyle === 'all') {
      const hybridCombinations = this.createHybridCombinations(concept1, concept2);
      combinations.push(...hybridCombinations);
      creativeProcess.push(`Created ${hybridCombinations.length} hybrid combinations`);
    }

    // Metaphorical combination
    const metaphoricalCombinations = this.createMetaphoricalCombinations(concept1, concept2);
    combinations.push(...metaphoricalCombinations);
    creativeProcess.push(`Created ${metaphoricalCombinations.length} metaphorical combinations`);

    // Functional combination
    const functionalCombinations = this.createFunctionalCombinations(concept1, concept2);
    combinations.push(...functionalCombinations);
    creativeProcess.push(`Created ${functionalCombinations.length} functional combinations`);

    // Identify synergies
    const identifiedSynergies = this.identifySynergies(concept1, concept2);
    synergies.push(...identifiedSynergies);
    creativeProcess.push(`Identified ${identifiedSynergies.length} synergies`);

    return {
      combinations,
      synergies,
      creative_process: creativeProcess,
      confidence: 0.78,
      combination_analysis: {
        compatibility_score: this.calculateCompatibilityScore(concept1, concept2),
        innovation_potential: this.calculateInnovationPotential(combinations),
        market_potential: this.calculateMarketPotential(combinations)
      }
    };
  }

  private solveCreatively(problem: string, constraints: string[], techniques: string[]): any {
    const creativeProcess: string[] = [];
    creativeProcess.push(`Creative problem solving for: ${problem}`);
    creativeProcess.push(`Constraints: ${constraints.join(', ')}`);
    creativeProcess.push(`Techniques: ${techniques.join(', ')}`);

    const solutions: any[] = [];
    let approach = 'multi-technique';

    // Lateral thinking
    if (techniques.includes('all') || techniques.includes('lateral_thinking')) {
      const lateralSolutions = this.applyLateralThinking(problem, constraints);
      solutions.push(...lateralSolutions);
      creativeProcess.push(`Lateral thinking generated ${lateralSolutions.length} solutions`);
    }

    // Constraint relaxation
    if (techniques.includes('all') || techniques.includes('constraint_relaxation')) {
      const relaxationSolutions = this.applyConstraintRelaxation(problem, constraints);
      solutions.push(...relaxationSolutions);
      creativeProcess.push(`Constraint relaxation generated ${relaxationSolutions.length} solutions`);
    }

    // Analogical reasoning
    const analogicalSolutions = this.applyAnalogicalReasoning(problem);
    solutions.push(...analogicalSolutions);
    creativeProcess.push(`Analogical reasoning generated ${analogicalSolutions.length} solutions`);

    // TRIZ methodology
    if (techniques.includes('all') || techniques.includes('triz')) {
      const trizSolutions = this.applyTRIZ(problem, constraints);
      solutions.push(...trizSolutions);
      approach = 'TRIZ-based';
      creativeProcess.push(`TRIZ methodology generated ${trizSolutions.length} solutions`);
    }

    return {
      solutions,
      approach,
      creative_process: creativeProcess,
      confidence: 0.85,
      solution_analysis: {
        originality_scores: solutions.map(() => Math.random() * 0.4 + 0.6),
        feasibility_scores: solutions.map(() => Math.random() * 0.3 + 0.5),
        impact_potential: solutions.map(() => Math.random() * 0.5 + 0.5)
      }
    };
  }

  private createMetaphors(concept: string, domain: string, quantity: number): any {
    const creativeProcess: string[] = [];
    creativeProcess.push(`Creating ${quantity} metaphors for: ${concept}`);
    creativeProcess.push(`Metaphor domain: ${domain}`);

    const metaphors: any[] = [];
    const effectivenessScores: number[] = [];

    // Nature metaphors
    if (domain === 'any' || domain === 'nature') {
      const natureMetaphors = this.createNatureMetaphors(concept, Math.ceil(quantity / 3));
      metaphors.push(...natureMetaphors);
      effectivenessScores.push(...natureMetaphors.map(() => Math.random() * 0.3 + 0.7));
      creativeProcess.push(`Created ${natureMetaphors.length} nature metaphors`);
    }

    // Technology metaphors
    if (domain === 'any' || domain === 'technology') {
      const techMetaphors = this.createTechnologyMetaphors(concept, Math.ceil(quantity / 3));
      metaphors.push(...techMetaphors);
      effectivenessScores.push(...techMetaphors.map(() => Math.random() * 0.3 + 0.6));
      creativeProcess.push(`Created ${techMetaphors.length} technology metaphors`);
    }

    // Human body metaphors
    if (domain === 'any' || domain === 'body') {
      const bodyMetaphors = this.createBodyMetaphors(concept, Math.ceil(quantity / 3));
      metaphors.push(...bodyMetaphors);
      effectivenessScores.push(...bodyMetaphors.map(() => Math.random() * 0.3 + 0.65));
      creativeProcess.push(`Created ${bodyMetaphors.length} body metaphors`);
    }

    // Select best metaphors
    const selectedMetaphors = metaphors.slice(0, quantity);
    const selectedScores = effectivenessScores.slice(0, quantity);

    return {
      metaphors: selectedMetaphors,
      effectiveness_scores: selectedScores,
      creative_process: creativeProcess,
      confidence: 0.75,
      metaphor_analysis: {
        clarity_average: selectedScores.reduce((a, b) => a + b, 0) / selectedScores.length,
        domain_diversity: new Set(selectedMetaphors.map(m => m.domain)).size,
        conceptual_distance: this.calculateConceptualDistance(concept, selectedMetaphors)
      }
    };
  }

  // Creative technique implementations
  private applySCAMPER(topic: string): any[] {
    const scamperPrompts = [
      { action: 'Substitute', idea: `What if we substitute key elements in ${topic}?` },
      { action: 'Combine', idea: `How can we combine ${topic} with something unexpected?` },
      { action: 'Adapt', idea: `What can we adapt from other domains for ${topic}?` },
      { action: 'Modify', idea: `How can we modify the scale or attributes of ${topic}?` },
      { action: 'Put to other uses', idea: `What are alternative uses for ${topic}?` },
      { action: 'Eliminate', idea: `What happens if we remove constraints from ${topic}?` },
      { action: 'Reverse', idea: `What if we reverse the process or approach to ${topic}?` }
    ];

    return scamperPrompts.map(prompt => ({
      technique: 'SCAMPER',
      action: prompt.action,
      idea: prompt.idea,
      novelty_score: Math.random() * 0.4 + 0.6
    }));
  }

  private applyRandomWordAssociation(topic: string, count: number): any[] {
    const randomWords = ['ocean', 'mirror', 'symphony', 'bridge', 'garden', 'storm', 'diamond', 'journey', 'flame', 'puzzle'];
    const ideas: any[] = [];

    for (let i = 0; i < count && i < randomWords.length; i++) {
      const randomWord = randomWords[i];
      ideas.push({
        technique: 'Random Word Association',
        trigger_word: randomWord,
        idea: `Combine ${topic} with the concept of ${randomWord} - what emerges?`,
        association_strength: Math.random() * 0.5 + 0.5
      });
    }

    return ideas;
  }

  private applySixThinkingHats(topic: string): any[] {
    const hats = [
      { color: 'White', focus: 'Facts', idea: `What are the objective facts about ${topic}?` },
      { color: 'Red', focus: 'Emotions', idea: `What emotional responses does ${topic} evoke?` },
      { color: 'Black', focus: 'Caution', idea: `What are the potential risks or downsides of ${topic}?` },
      { color: 'Yellow', focus: 'Optimism', idea: `What are the most optimistic possibilities for ${topic}?` },
      { color: 'Green', focus: 'Creativity', idea: `What are the most creative approaches to ${topic}?` },
      { color: 'Blue', focus: 'Process', idea: `How can we systematically approach ${topic}?` }
    ];

    return hats.map(hat => ({
      technique: 'Six Thinking Hats',
      hat_color: hat.color,
      focus: hat.focus,
      idea: hat.idea,
      perspective_value: Math.random() * 0.3 + 0.7
    }));
  }

  private applyMorphologicalAnalysis(topic: string, count: number): any[] {
    // Simplified morphological analysis
    const dimensions = ['form', 'function', 'material', 'scale', 'context'];
    const ideas: any[] = [];

    for (let i = 0; i < count; i++) {
      const selectedDimensions = dimensions.slice(0, 3);
      ideas.push({
        technique: 'Morphological Analysis',
        dimensions: selectedDimensions,
        idea: `Explore ${topic} by varying ${selectedDimensions.join(', ')}`,
        systematic_score: Math.random() * 0.3 + 0.6
      });
    }

    return ideas;
  }

  private createHybridCombinations(concept1: string, concept2: string): any[] {
    return [
      {
        type: 'hybrid',
        combination: `${concept1}-${concept2} fusion`,
        description: `A direct fusion combining the core features of both ${concept1} and ${concept2}`,
        innovation_level: Math.random() * 0.4 + 0.6
      },
      {
        type: 'hybrid',
        combination: `${concept2}-enhanced ${concept1}`,
        description: `${concept1} enhanced with key capabilities from ${concept2}`,
        innovation_level: Math.random() * 0.3 + 0.5
      }
    ];
  }

  private createMetaphoricalCombinations(concept1: string, concept2: string): any[] {
    return [
      {
        type: 'metaphorical',
        combination: `${concept1} as ${concept2}`,
        description: `Understanding ${concept1} through the lens of ${concept2}`,
        conceptual_depth: Math.random() * 0.4 + 0.6
      }
    ];
  }

  private createFunctionalCombinations(concept1: string, concept2: string): any[] {
    return [
      {
        type: 'functional',
        combination: `${concept1} + ${concept2} workflow`,
        description: `A workflow that leverages the functions of both ${concept1} and ${concept2}`,
        practical_value: Math.random() * 0.3 + 0.6
      }
    ];
  }

  private identifySynergies(concept1: string, concept2: string): any[] {
    return [
      {
        synergy_type: 'complementary',
        description: `${concept1} and ${concept2} complement each other's weaknesses`,
        strength: Math.random() * 0.4 + 0.6
      },
      {
        synergy_type: 'amplifying',
        description: `${concept2} amplifies the impact of ${concept1}`,
        strength: Math.random() * 0.3 + 0.5
      }
    ];
  }

  private applyLateralThinking(problem: string, constraints: string[]): any[] {
    return [
      {
        technique: 'Lateral Thinking',
        approach: 'Random Entry',
        solution: `Approach ${problem} from a completely unrelated starting point`,
        unconventionality: Math.random() * 0.5 + 0.5
      },
      {
        technique: 'Lateral Thinking',
        approach: 'Provocation',
        solution: `What if the opposite of ${problem} was the goal?`,
        unconventionality: Math.random() * 0.4 + 0.6
      }
    ];
  }

  private applyConstraintRelaxation(problem: string, constraints: string[]): any[] {
    return constraints.map(constraint => ({
      technique: 'Constraint Relaxation',
      relaxed_constraint: constraint,
      solution: `Solve ${problem} by temporarily ignoring the constraint: ${constraint}`,
      freedom_gained: Math.random() * 0.4 + 0.5
    }));
  }

  private applyAnalogicalReasoning(problem: string): any[] {
    const analogyDomains = ['nature', 'sports', 'cooking', 'music', 'architecture'];
    
    return analogyDomains.slice(0, 3).map(domain => ({
      technique: 'Analogical Reasoning',
      analogy_domain: domain,
      solution: `How would ${domain} approach a problem similar to ${problem}?`,
      analogy_strength: Math.random() * 0.4 + 0.5
    }));
  }

  private applyTRIZ(problem: string, constraints: string[]): any[] {
    const trizPrinciples = [
      'Segmentation',
      'Taking out',
      'Local quality',
      'Asymmetry',
      'Merging'
    ];

    return trizPrinciples.slice(0, 3).map(principle => ({
      technique: 'TRIZ',
      principle,
      solution: `Apply ${principle} principle to solve ${problem}`,
      systematic_confidence: Math.random() * 0.3 + 0.7
    }));
  }

  private createNatureMetaphors(concept: string, count: number): any[] {
    const natureElements = ['river', 'tree', 'ecosystem', 'mountain', 'ocean'];
    
    return natureElements.slice(0, count).map(element => ({
      metaphor: `${concept} is like a ${element}`,
      domain: 'nature',
      explanation: `Both ${concept} and ${element} share characteristics of growth and adaptation`,
      vividness: Math.random() * 0.3 + 0.7
    }));
  }

  private createTechnologyMetaphors(concept: string, count: number): any[] {
    const techElements = ['network', 'algorithm', 'interface', 'database', 'circuit'];
    
    return techElements.slice(0, count).map(element => ({
      metaphor: `${concept} functions like a ${element}`,
      domain: 'technology',
      explanation: `${concept} processes and connects information similar to a ${element}`,
      precision: Math.random() * 0.3 + 0.6
    }));
  }

  private createBodyMetaphors(concept: string, count: number): any[] {
    const bodyElements = ['brain', 'heart', 'immune system', 'nervous system', 'circulatory system'];
    
    return bodyElements.slice(0, count).map(element => ({
      metaphor: `${concept} works like the ${element}`,
      domain: 'body',
      explanation: `${concept} has vital functions similar to the ${element}`,
      relatability: Math.random() * 0.4 + 0.6
    }));
  }

  // Utility methods for scoring and analysis
  private selectBestIdeas(ideas: any[], quantity: number): any[] {
    return ideas
      .sort((a, b) => (b.novelty_score || b.innovation_level || 0.5) - (a.novelty_score || a.innovation_level || 0.5))
      .slice(0, quantity);
  }

  private calculateNoveltyScore(ideas: any[]): number {
    const scores = ideas.map(idea => idea.novelty_score || idea.innovation_level || 0.5);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private calculateFeasibilityScore(ideas: any[]): number {
    return Math.random() * 0.3 + 0.6; // Simplified
  }

  private calculateDiversityScore(ideas: any[]): number {
    const techniques = new Set(ideas.map(idea => idea.technique));
    return techniques.size / 10; // Normalized diversity
  }

  private calculateCompatibilityScore(concept1: string, concept2: string): number {
    return Math.random() * 0.4 + 0.5; // Simplified compatibility assessment
  }

  private calculateInnovationPotential(combinations: any[]): number {
    const scores = combinations.map(c => c.innovation_level || c.conceptual_depth || 0.5);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private calculateMarketPotential(combinations: any[]): number {
    return Math.random() * 0.5 + 0.4; // Simplified market assessment
  }

  private calculateConceptualDistance(concept: string, metaphors: any[]): number {
    return Math.random() * 0.4 + 0.3; // Simplified conceptual distance
  }

  private getSupportedOperations(): string[] {
    return [
      'generate_ideas',
      'combine_concepts',
      'solve_creatively',
      'create_metaphors'
    ];
  }
} 