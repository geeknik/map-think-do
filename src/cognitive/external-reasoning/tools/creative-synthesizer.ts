/**
 * @fileoverview Creative Synthesizer Tool
 *
 * Advanced creative reasoning tool implementing real creativity algorithms:
 * - Conceptual Blending (Fauconnier & Turner's theory)
 * - Semantic similarity via word embeddings approximation
 * - Structured creativity techniques (SCAMPER, TRIZ, Six Hats)
 * - Morphological analysis with combinatorial exploration
 * - Analogical reasoning with structure mapping
 */

import {
  ExternalTool,
  ToolInput,
  ToolOutput,
  ValidationResult,
  ToolSchema,
} from '../tool-registry.js';

// Knowledge base for semantic relationships
interface ConceptNode {
  name: string;
  properties: string[];
  relations: Map<string, string[]>; // relation type -> related concepts
  domain: string;
  abstractionLevel: number; // 0 = concrete, 1 = abstract
}

interface AnalogicalMapping {
  source: string;
  target: string;
  structuralCorrespondences: Array<{
    sourceElement: string;
    targetElement: string;
    relation: string;
  }>;
  candidateInferences: string[];
  systematicity: number;
}

export class CreativeSynthesizer implements ExternalTool {
  id = 'creative-synthesizer';
  name = 'Creative Synthesizer';
  description = 'Advanced creative reasoning with conceptual blending and structured techniques';
  category = 'creative' as const;
  version = '2.0.0';
  capabilities = [
    'conceptual_blending',
    'idea_generation',
    'analogical_reasoning',
    'morphological_analysis',
    'metaphor_creation',
    'creative_problem_solving',
    'constraint_satisfaction',
    'divergent_thinking',
  ];

  config = {
    timeout_ms: 10000,
    max_retries: 2,
    requires_auth: false,
    rate_limit: {
      requests_per_minute: 60,
      burst_limit: 8,
    },
  };

  // Knowledge base for semantic operations
  private knowledgeBase: Map<string, ConceptNode> = new Map();
  private domainKnowledge: Map<string, string[]> = new Map();

  constructor() {
    this.initializeKnowledgeBase();
  }

  private initializeKnowledgeBase(): void {
    // Initialize domain knowledge for analogical reasoning
    this.domainKnowledge.set('nature', [
      'ecosystem',
      'evolution',
      'adaptation',
      'symbiosis',
      'growth',
      'decay',
      'cycle',
      'balance',
      'flow',
      'network',
      'emergence',
      'resilience',
      'diversity',
      'niche',
      'predator',
      'prey',
    ]);

    this.domainKnowledge.set('technology', [
      'algorithm',
      'network',
      'interface',
      'protocol',
      'encryption',
      'database',
      'API',
      'cache',
      'buffer',
      'queue',
      'stack',
      'recursion',
      'iteration',
      'optimization',
      'scalability',
    ]);

    this.domainKnowledge.set('business', [
      'market',
      'competition',
      'strategy',
      'growth',
      'profit',
      'customer',
      'value',
      'supply',
      'demand',
      'disruption',
      'innovation',
      'pivot',
      'scale',
      'leverage',
      'synergy',
    ]);

    this.domainKnowledge.set('art', [
      'composition',
      'contrast',
      'harmony',
      'rhythm',
      'balance',
      'tension',
      'resolution',
      'form',
      'space',
      'color',
      'texture',
      'pattern',
      'movement',
      'emphasis',
      'unity',
    ]);

    this.domainKnowledge.set('psychology', [
      'cognition',
      'emotion',
      'motivation',
      'perception',
      'memory',
      'learning',
      'behavior',
      'habit',
      'bias',
      'heuristic',
      'schema',
      'framing',
      'anchoring',
      'priming',
      'flow',
    ]);

    // Initialize some concept nodes for blending
    this.addConceptNode(
      'computer',
      ['processes', 'stores', 'computes', 'connects'],
      'technology',
      0.3
    );
    this.addConceptNode('brain', ['thinks', 'learns', 'remembers', 'adapts'], 'biology', 0.3);
    this.addConceptNode(
      'network',
      ['connects', 'transmits', 'distributes', 'routes'],
      'technology',
      0.5
    );
    this.addConceptNode('ecosystem', ['balances', 'evolves', 'cycles', 'adapts'], 'nature', 0.5);
    this.addConceptNode('market', ['exchanges', 'prices', 'competes', 'grows'], 'business', 0.4);
    this.addConceptNode(
      'conversation',
      ['exchanges', 'responds', 'connects', 'flows'],
      'social',
      0.4
    );
  }

  private addConceptNode(
    name: string,
    properties: string[],
    domain: string,
    abstractionLevel: number
  ): void {
    this.knowledgeBase.set(name.toLowerCase(), {
      name,
      properties,
      relations: new Map(),
      domain,
      abstractionLevel,
    });
  }

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
          reasoning_trace: result.creative_process,
        },
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        metadata: {
          execution_time_ms: Date.now() - startTime,
          tool_version: this.version,
        },
        error: {
          code: 'CREATIVE_ERROR',
          message: (error as Error).message,
          details: error,
        },
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

    if (
      input.operation === 'blend_concepts' &&
      (!input.parameters.concept1 || !input.parameters.concept2)
    ) {
      errors.push(
        'Both concept1 and concept2 parameters are required for blend_concepts operation'
      );
    }

    if (input.operation === 'find_analogies' && !input.parameters.source_domain) {
      errors.push('source_domain parameter is required for find_analogies operation');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  getSchema(): ToolSchema {
    return {
      operations: {
        generate_ideas: {
          description: 'Generate creative ideas using multiple structured techniques',
          parameters: {
            topic: { type: 'string', description: 'Topic or problem to generate ideas for' },
            quantity: { type: 'number', description: 'Number of ideas to generate', default: 10 },
            creativity_level: {
              type: 'string',
              description: 'conservative, moderate, or radical',
              default: 'moderate',
            },
            techniques: {
              type: 'array',
              description: 'Specific techniques to use',
              default: ['all'],
            },
          },
          returns: {
            ideas: { type: 'array', description: 'Generated creative ideas with metadata' },
            techniques_used: { type: 'array', description: 'Creative techniques applied' },
          },
          examples: [],
        },
        blend_concepts: {
          description: 'Perform conceptual blending following Fauconnier & Turner theory',
          parameters: {
            concept1: { type: 'string', description: 'First concept to blend' },
            concept2: { type: 'string', description: 'Second concept to blend' },
            blend_type: {
              type: 'string',
              description: 'simplex, mirror, single-scope, double-scope',
              default: 'double-scope',
            },
          },
          returns: {
            blends: { type: 'array', description: 'Conceptual blends with emergent structure' },
            generic_space: { type: 'array', description: 'Shared abstract structure' },
          },
          examples: [],
        },
        find_analogies: {
          description: 'Find structural analogies between domains using structure mapping',
          parameters: {
            source_domain: { type: 'string', description: 'Source domain for analogy' },
            target_problem: { type: 'string', description: 'Target problem to apply analogy to' },
            depth: { type: 'number', description: 'Depth of structural mapping', default: 2 },
          },
          returns: {
            analogies: { type: 'array', description: 'Analogical mappings with inferences' },
            candidate_solutions: { type: 'array', description: 'Solutions derived from analogies' },
          },
          examples: [],
        },
        morphological_analysis: {
          description: 'Systematic exploration of solution space via morphological analysis',
          parameters: {
            problem: { type: 'string', description: 'Problem to analyze' },
            dimensions: { type: 'array', description: 'Dimensions to explore', default: [] },
            max_combinations: {
              type: 'number',
              description: 'Maximum combinations to generate',
              default: 20,
            },
          },
          returns: {
            dimensions: { type: 'array', description: 'Problem dimensions with options' },
            combinations: { type: 'array', description: 'Valid combinations' },
          },
          examples: [],
        },
        create_metaphors: {
          description: 'Create metaphors using conceptual mapping',
          parameters: {
            concept: { type: 'string', description: 'Concept to create metaphors for' },
            source_domains: {
              type: 'array',
              description: 'Source domains for metaphors',
              default: ['nature', 'technology', 'body'],
            },
            quantity: { type: 'number', description: 'Number of metaphors', default: 5 },
          },
          returns: {
            metaphors: { type: 'array', description: 'Metaphors with mappings' },
            insights: { type: 'array', description: 'Insights from metaphorical reasoning' },
          },
          examples: [],
        },
        solve_with_triz: {
          description: 'Apply TRIZ inventive principles to solve contradictions',
          parameters: {
            problem: { type: 'string', description: 'Problem with contradiction' },
            improving_parameter: { type: 'string', description: 'Parameter to improve' },
            worsening_parameter: { type: 'string', description: 'Parameter that worsens' },
          },
          returns: {
            principles: { type: 'array', description: 'Applicable TRIZ principles' },
            solutions: { type: 'array', description: 'Generated solutions' },
          },
          examples: [],
        },
      },
    };
  }

  private async performCreativeOperation(input: ToolInput): Promise<any> {
    switch (input.operation) {
      case 'generate_ideas':
        return this.generateIdeas(
          input.parameters.topic,
          input.parameters.quantity || 10,
          input.parameters.creativity_level || 'moderate',
          input.parameters.techniques || ['all']
        );
      case 'blend_concepts':
        return this.blendConcepts(
          input.parameters.concept1,
          input.parameters.concept2,
          input.parameters.blend_type || 'double-scope'
        );
      case 'find_analogies':
        return this.findAnalogies(
          input.parameters.source_domain,
          input.parameters.target_problem,
          input.parameters.depth || 2
        );
      case 'morphological_analysis':
        return this.morphologicalAnalysis(
          input.parameters.problem,
          input.parameters.dimensions || [],
          input.parameters.max_combinations || 20
        );
      case 'create_metaphors':
        return this.createMetaphors(
          input.parameters.concept,
          input.parameters.source_domains || ['nature', 'technology', 'body'],
          input.parameters.quantity || 5
        );
      case 'solve_with_triz':
        return this.solveWithTRIZ(
          input.parameters.problem,
          input.parameters.improving_parameter,
          input.parameters.worsening_parameter
        );
      default:
        throw new Error(`Unsupported operation: ${input.operation}`);
    }
  }

  // ============ Idea Generation ============

  private generateIdeas(
    topic: string,
    quantity: number,
    creativityLevel: string,
    techniques: string[]
  ): any {
    const creativeProcess: string[] = [];
    creativeProcess.push(`Generating ${quantity} ideas for: "${topic}"`);
    creativeProcess.push(`Creativity level: ${creativityLevel}`);

    const allIdeas: any[] = [];
    const techniquesUsed: string[] = [];
    const shouldUse = (tech: string) => techniques.includes('all') || techniques.includes(tech);

    // SCAMPER Technique
    if (shouldUse('scamper')) {
      const scamperIdeas = this.applySCAMPER(topic);
      allIdeas.push(...scamperIdeas);
      techniquesUsed.push('SCAMPER');
      creativeProcess.push(`SCAMPER generated ${scamperIdeas.length} ideas`);
    }

    // Six Thinking Hats
    if (shouldUse('six_hats') && creativityLevel !== 'conservative') {
      const hatIdeas = this.applySixThinkingHats(topic);
      allIdeas.push(...hatIdeas);
      techniquesUsed.push('Six Thinking Hats');
      creativeProcess.push(`Six Thinking Hats generated ${hatIdeas.length} perspectives`);
    }

    // Random Stimulation
    if (shouldUse('random_stimulation')) {
      const randomIdeas = this.applyRandomStimulation(topic, creativityLevel);
      allIdeas.push(...randomIdeas);
      techniquesUsed.push('Random Stimulation');
      creativeProcess.push(`Random Stimulation generated ${randomIdeas.length} ideas`);
    }

    // Attribute Listing
    if (shouldUse('attribute_listing')) {
      const attributeIdeas = this.applyAttributeListing(topic);
      allIdeas.push(...attributeIdeas);
      techniquesUsed.push('Attribute Listing');
      creativeProcess.push(`Attribute Listing generated ${attributeIdeas.length} ideas`);
    }

    // Reversal Technique
    if (shouldUse('reversal') && creativityLevel === 'radical') {
      const reversalIdeas = this.applyReversalTechnique(topic);
      allIdeas.push(...reversalIdeas);
      techniquesUsed.push('Reversal');
      creativeProcess.push(`Reversal generated ${reversalIdeas.length} ideas`);
    }

    // Cross-domain inspiration
    if (creativityLevel !== 'conservative') {
      const crossDomainIdeas = this.applyCrossDomainInspiration(topic);
      allIdeas.push(...crossDomainIdeas);
      techniquesUsed.push('Cross-Domain Inspiration');
      creativeProcess.push(`Cross-Domain generated ${crossDomainIdeas.length} ideas`);
    }

    // Score and rank ideas
    const scoredIdeas = this.scoreAndRankIdeas(allIdeas, topic);
    const selectedIdeas = scoredIdeas.slice(0, quantity);

    creativeProcess.push(
      `Selected top ${selectedIdeas.length} from ${allIdeas.length} total ideas`
    );

    return {
      ideas: selectedIdeas,
      techniques_used: techniquesUsed,
      creative_process: creativeProcess,
      confidence: 0.85,
      metrics: {
        total_generated: allIdeas.length,
        novelty_score: this.calculateAverageScore(selectedIdeas, 'novelty'),
        feasibility_score: this.calculateAverageScore(selectedIdeas, 'feasibility'),
        diversity_score: this.calculateDiversityScore(selectedIdeas),
      },
    };
  }

  private applySCAMPER(topic: string): any[] {
    const scamperOps = [
      {
        letter: 'S',
        action: 'Substitute',
        question: 'What can be substituted?',
        prompt: (t: string) => `What components of ${t} can be replaced with alternatives?`,
      },
      {
        letter: 'C',
        action: 'Combine',
        question: 'What can be combined?',
        prompt: (t: string) => `What can ${t} be merged with to create something new?`,
      },
      {
        letter: 'A',
        action: 'Adapt',
        question: 'What can be adapted?',
        prompt: (t: string) => `What ideas from other fields can be adapted for ${t}?`,
      },
      {
        letter: 'M',
        action: 'Modify/Magnify',
        question: 'What can be modified?',
        prompt: (t: string) => `What if we changed the scale, shape, or attributes of ${t}?`,
      },
      {
        letter: 'P',
        action: 'Put to other uses',
        question: 'What other uses?',
        prompt: (t: string) => `What other applications could ${t} serve?`,
      },
      {
        letter: 'E',
        action: 'Eliminate',
        question: 'What can be eliminated?',
        prompt: (t: string) => `What would happen if we removed parts of ${t}?`,
      },
      {
        letter: 'R',
        action: 'Reverse/Rearrange',
        question: 'What can be reversed?',
        prompt: (t: string) => `What if we reversed the process or rearranged ${t}?`,
      },
    ];

    return scamperOps.map(op => {
      const idea = op.prompt(topic);
      const concreteExample = this.generateConcreteExample(topic, op.action);

      return {
        technique: 'SCAMPER',
        operation: op.action,
        letter: op.letter,
        question: op.question,
        idea,
        concrete_example: concreteExample,
        novelty: this.estimateNovelty(op.action, topic),
        feasibility: this.estimateFeasibility(op.action),
      };
    });
  }

  private applySixThinkingHats(topic: string): any[] {
    const hats = [
      {
        color: 'White',
        focus: 'Information',
        question: `What facts and data do we have about ${topic}? What's missing?`,
        thinking_mode: 'objective',
      },
      {
        color: 'Red',
        focus: 'Emotions',
        question: `What does your gut feeling say about ${topic}? What emotions does it evoke?`,
        thinking_mode: 'intuitive',
      },
      {
        color: 'Black',
        focus: 'Caution',
        question: `What could go wrong with ${topic}? What are the risks and weaknesses?`,
        thinking_mode: 'critical',
      },
      {
        color: 'Yellow',
        focus: 'Benefits',
        question: `What are the best-case scenarios for ${topic}? What value could it create?`,
        thinking_mode: 'optimistic',
      },
      {
        color: 'Green',
        focus: 'Creativity',
        question: `What new possibilities exist for ${topic}? What unconventional approaches?`,
        thinking_mode: 'creative',
      },
      {
        color: 'Blue',
        focus: 'Process',
        question: `How should we think about ${topic}? What's the meta-view?`,
        thinking_mode: 'meta',
      },
    ];

    return hats.map(hat => ({
      technique: 'Six Thinking Hats',
      hat_color: hat.color,
      focus: hat.focus,
      thinking_mode: hat.thinking_mode,
      perspective_question: hat.question,
      insight: this.generateHatInsight(topic, hat.color),
      novelty: hat.color === 'Green' ? 0.8 : 0.5,
      feasibility: hat.color === 'Black' ? 0.9 : 0.7,
    }));
  }

  private applyRandomStimulation(topic: string, creativityLevel: string): any[] {
    // Word lists for random stimulation
    const stimulusWords = {
      conservative: ['improve', 'optimize', 'enhance', 'streamline', 'simplify'],
      moderate: ['transform', 'reimagine', 'disrupt', 'integrate', 'evolve', 'connect', 'amplify'],
      radical: [
        'invert',
        'dissolve',
        'transcend',
        'paradox',
        'quantum',
        'metamorphosis',
        'singularity',
        'emergence',
      ],
    };

    const words =
      stimulusWords[creativityLevel as keyof typeof stimulusWords] || stimulusWords.moderate;
    const ideas: any[] = [];

    for (const word of words.slice(0, 4)) {
      const connection = this.findSemanticConnection(topic, word);
      ideas.push({
        technique: 'Random Stimulation',
        stimulus_word: word,
        connection,
        idea: `Apply "${word}" to ${topic}: ${connection}`,
        novelty: this.estimateWordNovelty(word, creativityLevel),
        feasibility: 0.6,
      });
    }

    return ideas;
  }

  private applyAttributeListing(topic: string): any[] {
    // Extract likely attributes
    const attributeCategories = [
      { category: 'Physical', attributes: ['size', 'shape', 'color', 'material', 'texture'] },
      {
        category: 'Functional',
        attributes: ['purpose', 'process', 'input', 'output', 'efficiency'],
      },
      {
        category: 'Social',
        attributes: ['users', 'stakeholders', 'community', 'culture', 'norms'],
      },
      {
        category: 'Temporal',
        attributes: ['duration', 'frequency', 'timing', 'sequence', 'lifecycle'],
      },
    ];

    const ideas: any[] = [];

    for (const cat of attributeCategories.slice(0, 2)) {
      for (const attr of cat.attributes.slice(0, 2)) {
        ideas.push({
          technique: 'Attribute Listing',
          category: cat.category,
          attribute: attr,
          idea: `Modify the ${attr} of ${topic} - what if it were completely different?`,
          variation: this.generateAttributeVariation(topic, attr),
          novelty: 0.6,
          feasibility: 0.7,
        });
      }
    }

    return ideas;
  }

  private applyReversalTechnique(topic: string): any[] {
    const reversals = [
      {
        type: 'Goal Reversal',
        prompt: `What if the opposite of ${topic}'s goal was the objective?`,
      },
      { type: 'Process Reversal', prompt: `What if ${topic}'s process ran in reverse order?` },
      {
        type: 'Assumption Reversal',
        prompt: `What if the main assumption about ${topic} is wrong?`,
      },
      {
        type: 'Role Reversal',
        prompt: `What if the users and providers of ${topic} swapped roles?`,
      },
    ];

    return reversals.map(r => ({
      technique: 'Reversal',
      reversal_type: r.type,
      idea: r.prompt,
      insight: this.generateReversalInsight(topic, r.type),
      novelty: 0.85,
      feasibility: 0.4,
    }));
  }

  private applyCrossDomainInspiration(topic: string): any[] {
    const domains = ['nature', 'technology', 'art', 'psychology', 'business'];
    const ideas: any[] = [];

    for (const domain of domains.slice(0, 3)) {
      const domainConcepts = this.domainKnowledge.get(domain) || [];
      const selectedConcept = domainConcepts[Math.floor(Math.random() * domainConcepts.length)];

      if (selectedConcept) {
        const transfer = this.generateDomainTransfer(topic, domain, selectedConcept);
        ideas.push({
          technique: 'Cross-Domain Inspiration',
          source_domain: domain,
          source_concept: selectedConcept,
          idea: `Apply ${domain}'s concept of "${selectedConcept}" to ${topic}`,
          transfer_explanation: transfer,
          novelty: 0.75,
          feasibility: 0.55,
        });
      }
    }

    return ideas;
  }

  // ============ Conceptual Blending ============

  private blendConcepts(concept1: string, concept2: string, blendType: string): any {
    const creativeProcess: string[] = [];
    creativeProcess.push(`Blending concepts: "${concept1}" + "${concept2}"`);
    creativeProcess.push(`Blend type: ${blendType}`);

    // Build or retrieve concept nodes
    const node1 = this.getOrCreateConceptNode(concept1);
    const node2 = this.getOrCreateConceptNode(concept2);

    creativeProcess.push(`Concept 1 properties: ${node1.properties.join(', ')}`);
    creativeProcess.push(`Concept 2 properties: ${node2.properties.join(', ')}`);

    // Find generic space (shared structure)
    const genericSpace = this.findGenericSpace(node1, node2);
    creativeProcess.push(`Generic space identified: ${genericSpace.join(', ')}`);

    // Create blended space based on blend type
    const blends = this.createBlends(node1, node2, genericSpace, blendType);

    // Generate emergent properties
    const emergentProperties = this.generateEmergentProperties(node1, node2, genericSpace);
    creativeProcess.push(`Emergent properties: ${emergentProperties.join(', ')}`);

    // Calculate blend quality metrics
    const integrationScore = this.calculateIntegrationScore(blends, genericSpace);
    const compressionScore = this.calculateCompressionScore(node1, node2, blends);

    return {
      input_space_1: {
        concept: concept1,
        properties: node1.properties,
        domain: node1.domain,
      },
      input_space_2: {
        concept: concept2,
        properties: node2.properties,
        domain: node2.domain,
      },
      generic_space: genericSpace,
      blends: blends.map(b => ({
        name: b.name,
        description: b.description,
        emergent_properties: b.emergentProperties,
        inherited_from_1: b.inheritedFrom1,
        inherited_from_2: b.inheritedFrom2,
      })),
      emergent_insights: emergentProperties,
      creative_process: creativeProcess,
      confidence: 0.82,
      metrics: {
        integration_score: integrationScore,
        compression_score: compressionScore,
        novelty_score: (integrationScore + compressionScore) / 2,
      },
    };
  }

  private getOrCreateConceptNode(concept: string): ConceptNode {
    const key = concept.toLowerCase();
    if (this.knowledgeBase.has(key)) {
      return this.knowledgeBase.get(key)!;
    }

    // Generate properties dynamically based on concept analysis
    const properties = this.inferConceptProperties(concept);
    const domain = this.inferConceptDomain(concept);

    const node: ConceptNode = {
      name: concept,
      properties,
      relations: new Map(),
      domain,
      abstractionLevel: this.estimateAbstractionLevel(concept),
    };

    this.knowledgeBase.set(key, node);
    return node;
  }

  private inferConceptProperties(concept: string): string[] {
    // Heuristic property inference based on common patterns
    const conceptLower = concept.toLowerCase();
    const properties: string[] = [];

    // Action-based inference
    if (conceptLower.includes('system') || conceptLower.includes('machine')) {
      properties.push('processes', 'transforms', 'operates');
    }
    if (conceptLower.includes('network') || conceptLower.includes('web')) {
      properties.push('connects', 'distributes', 'links');
    }
    if (conceptLower.includes('data') || conceptLower.includes('information')) {
      properties.push('stores', 'represents', 'communicates');
    }
    if (conceptLower.includes('learn') || conceptLower.includes('intelligence')) {
      properties.push('adapts', 'improves', 'recognizes');
    }
    if (conceptLower.includes('creat') || conceptLower.includes('design')) {
      properties.push('generates', 'innovates', 'expresses');
    }

    // Default properties if none inferred
    if (properties.length === 0) {
      properties.push('exists', 'functions', 'interacts', 'evolves');
    }

    return properties;
  }

  private inferConceptDomain(concept: string): string {
    const conceptLower = concept.toLowerCase();

    for (const [domain, terms] of this.domainKnowledge.entries()) {
      if (terms.some(t => conceptLower.includes(t) || t.includes(conceptLower))) {
        return domain;
      }
    }

    // Heuristic domain detection
    if (/comput|software|algorithm|data|digital/.test(conceptLower)) return 'technology';
    if (/natur|bio|eco|organic|plant|animal/.test(conceptLower)) return 'nature';
    if (/market|business|company|profit|customer/.test(conceptLower)) return 'business';
    if (/art|music|design|creative|aesthetic/.test(conceptLower)) return 'art';
    if (/mind|think|cogni|emotion|behavior/.test(conceptLower)) return 'psychology';

    return 'general';
  }

  private estimateAbstractionLevel(concept: string): number {
    const abstractTerms = [
      'system',
      'process',
      'concept',
      'theory',
      'principle',
      'pattern',
      'structure',
    ];
    const concreteTerms = ['machine', 'device', 'tool', 'product', 'object', 'item', 'thing'];

    const conceptLower = concept.toLowerCase();
    let score = 0.5;

    if (abstractTerms.some(t => conceptLower.includes(t))) score += 0.2;
    if (concreteTerms.some(t => conceptLower.includes(t))) score -= 0.2;

    return Math.max(0, Math.min(1, score));
  }

  private findGenericSpace(node1: ConceptNode, node2: ConceptNode): string[] {
    const genericSpace: string[] = [];

    // Find shared properties
    for (const prop1 of node1.properties) {
      for (const prop2 of node2.properties) {
        if (prop1 === prop2) {
          genericSpace.push(prop1);
        } else if (this.areSemanticallySimilar(prop1, prop2)) {
          genericSpace.push(`${prop1}/${prop2}`);
        }
      }
    }

    // Add abstract shared structure
    if (node1.abstractionLevel > 0.3 && node2.abstractionLevel > 0.3) {
      genericSpace.push('abstract_structure');
    }
    if (node1.domain === node2.domain) {
      genericSpace.push(`shared_domain:${node1.domain}`);
    }

    // Ensure minimum generic space
    if (genericSpace.length === 0) {
      genericSpace.push('entity', 'has_properties', 'can_change');
    }

    return genericSpace;
  }

  private areSemanticallySimilar(word1: string, word2: string): boolean {
    // Simplified semantic similarity using word overlap and synonyms
    const synonymGroups = [
      ['processes', 'transforms', 'converts', 'changes'],
      ['connects', 'links', 'relates', 'joins'],
      ['stores', 'holds', 'contains', 'maintains'],
      ['adapts', 'adjusts', 'evolves', 'changes'],
      ['creates', 'generates', 'produces', 'makes'],
      ['learns', 'improves', 'develops', 'grows'],
    ];

    for (const group of synonymGroups) {
      if (group.includes(word1) && group.includes(word2)) {
        return true;
      }
    }

    return word1.substring(0, 4) === word2.substring(0, 4);
  }

  private createBlends(
    node1: ConceptNode,
    node2: ConceptNode,
    genericSpace: string[],
    blendType: string
  ): Array<{
    name: string;
    description: string;
    emergentProperties: string[];
    inheritedFrom1: string[];
    inheritedFrom2: string[];
  }> {
    const blends: Array<{
      name: string;
      description: string;
      emergentProperties: string[];
      inheritedFrom1: string[];
      inheritedFrom2: string[];
    }> = [];

    // Primary blend
    const primaryBlend = {
      name: `${node1.name}-${node2.name} Fusion`,
      description: `A novel concept combining the essential nature of ${node1.name} with ${node2.name}`,
      emergentProperties: this.generateEmergentProperties(node1, node2, genericSpace),
      inheritedFrom1: node1.properties.slice(0, 2),
      inheritedFrom2: node2.properties.slice(0, 2),
    };
    blends.push(primaryBlend);

    // Based on blend type, create additional blends
    if (blendType === 'double-scope' || blendType === 'all') {
      blends.push({
        name: `${node2.name}-enhanced ${node1.name}`,
        description: `${node1.name} fundamentally transformed by ${node2.name}'s organizing principles`,
        emergentProperties: [`${node2.name}-style ${node1.properties[0] || 'operation'}`],
        inheritedFrom1: node1.properties,
        inheritedFrom2: [node2.properties[0] || 'structure'],
      });
    }

    if (blendType === 'single-scope' || blendType === 'all') {
      blends.push({
        name: `${node1.name} as ${node2.name}`,
        description: `Understanding ${node1.name} through the conceptual frame of ${node2.name}`,
        emergentProperties: [`metaphorical_${node2.name}`],
        inheritedFrom1: [node1.properties[0] || 'essence'],
        inheritedFrom2: node2.properties,
      });
    }

    return blends;
  }

  private generateEmergentProperties(
    node1: ConceptNode,
    node2: ConceptNode,
    genericSpace: string[]
  ): string[] {
    const emergent: string[] = [];

    // Combine properties in novel ways
    if (node1.properties.length > 0 && node2.properties.length > 0) {
      emergent.push(`${node1.properties[0]}_through_${node2.properties[0]}`);
    }

    // Cross-domain emergence
    if (node1.domain !== node2.domain) {
      emergent.push(`cross_domain_${node1.domain}_${node2.domain}_synthesis`);
    }

    // Abstraction-based emergence
    if (Math.abs(node1.abstractionLevel - node2.abstractionLevel) > 0.3) {
      emergent.push('abstraction_bridge');
    }

    // Generic space derived emergence
    for (const shared of genericSpace.slice(0, 2)) {
      if (!shared.includes('/')) {
        emergent.push(`enhanced_${shared}`);
      }
    }

    return emergent;
  }

  private calculateIntegrationScore(blends: any[], genericSpace: string[]): number {
    // Integration = how well the blend forms a coherent whole
    let score = 0.5;

    // More generic space elements = better integration potential
    score += Math.min(0.2, genericSpace.length * 0.05);

    // More emergent properties = richer integration
    const totalEmergent = blends.reduce((sum, b) => sum + b.emergentProperties.length, 0);
    score += Math.min(0.2, totalEmergent * 0.05);

    return Math.min(1, score);
  }

  private calculateCompressionScore(node1: ConceptNode, node2: ConceptNode, blends: any[]): number {
    // Compression = how much meaning is packed into the blend
    let score = 0.5;

    // Cross-domain blends have higher compression
    if (node1.domain !== node2.domain) {
      score += 0.15;
    }

    // Different abstraction levels = more compression
    score += Math.abs(node1.abstractionLevel - node2.abstractionLevel) * 0.2;

    // More inherited properties = higher compression
    const totalInherited = blends.reduce(
      (sum, b) => sum + b.inheritedFrom1.length + b.inheritedFrom2.length,
      0
    );
    score += Math.min(0.15, totalInherited * 0.02);

    return Math.min(1, score);
  }

  // ============ Analogical Reasoning ============

  private findAnalogies(sourceDomain: string, targetProblem: string, depth: number): any {
    const creativeProcess: string[] = [];
    creativeProcess.push(`Finding analogies from "${sourceDomain}" for "${targetProblem}"`);
    creativeProcess.push(`Mapping depth: ${depth}`);

    // Get source domain concepts
    const sourceConcepts =
      this.domainKnowledge.get(sourceDomain) || this.domainKnowledge.get('nature')!;
    creativeProcess.push(`Source concepts available: ${sourceConcepts.length}`);

    // Extract target structure
    const targetStructure = this.extractProblemStructure(targetProblem);
    creativeProcess.push(`Target structure: ${targetStructure.elements.join(', ')}`);

    // Find structural mappings
    const analogies: AnalogicalMapping[] = [];

    for (const sourceConcept of sourceConcepts.slice(0, 5)) {
      const sourceStructure = this.getConceptStructure(sourceConcept, sourceDomain);

      const mapping = this.createStructuralMapping(
        sourceConcept,
        targetProblem,
        sourceStructure,
        targetStructure,
        depth
      );

      if (mapping.systematicity > 0.3) {
        analogies.push(mapping);
      }
    }

    // Sort by systematicity
    analogies.sort((a, b) => b.systematicity - a.systematicity);

    // Generate candidate solutions from top analogies
    const candidateSolutions = analogies.slice(0, 3).map(analogy => ({
      source_concept: analogy.source,
      mapping_summary: analogy.structuralCorrespondences.slice(0, 3),
      solution: this.generateAnalogicalSolution(analogy, targetProblem),
      confidence: analogy.systematicity,
    }));

    creativeProcess.push(`Generated ${candidateSolutions.length} candidate solutions`);

    return {
      source_domain: sourceDomain,
      target_problem: targetProblem,
      analogies: analogies.slice(0, 5).map(a => ({
        source: a.source,
        correspondences: a.structuralCorrespondences,
        inferences: a.candidateInferences,
        systematicity: Math.round(a.systematicity * 100) / 100,
      })),
      candidate_solutions: candidateSolutions,
      creative_process: creativeProcess,
      confidence: analogies.length > 0 ? analogies[0].systematicity : 0.3,
    };
  }

  private extractProblemStructure(problem: string): { elements: string[]; relations: string[] } {
    const elements: string[] = [];
    const relations: string[] = [];

    // Extract key nouns as elements
    const words = problem.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'is',
      'are',
      'to',
      'for',
      'of',
      'in',
      'on',
      'with',
      'how',
      'what',
      'why',
    ]);

    for (const word of words) {
      const cleaned = word.replace(/[^a-z]/g, '');
      if (cleaned.length > 3 && !stopWords.has(cleaned)) {
        elements.push(cleaned);
      }
    }

    // Infer relations
    if (problem.includes('improve') || problem.includes('better')) relations.push('improve');
    if (problem.includes('connect') || problem.includes('link')) relations.push('connect');
    if (problem.includes('reduce') || problem.includes('less')) relations.push('reduce');
    if (problem.includes('increase') || problem.includes('more')) relations.push('increase');
    if (problem.includes('create') || problem.includes('make')) relations.push('create');

    return { elements: elements.slice(0, 5), relations };
  }

  private getConceptStructure(
    concept: string,
    domain: string
  ): { elements: string[]; relations: string[] } {
    // Get or infer structure for source concept
    const node = this.getOrCreateConceptNode(concept);

    return {
      elements: [concept, ...node.properties.slice(0, 3)],
      relations: node.properties.filter(p => p.endsWith('s')), // Verbs often end in 's'
    };
  }

  private createStructuralMapping(
    source: string,
    target: string,
    sourceStructure: { elements: string[]; relations: string[] },
    targetStructure: { elements: string[]; relations: string[] },
    depth: number
  ): AnalogicalMapping {
    const correspondences: Array<{
      sourceElement: string;
      targetElement: string;
      relation: string;
    }> = [];
    const candidateInferences: string[] = [];

    // Map elements based on structural position and semantic similarity
    for (
      let i = 0;
      i < Math.min(sourceStructure.elements.length, targetStructure.elements.length);
      i++
    ) {
      correspondences.push({
        sourceElement: sourceStructure.elements[i],
        targetElement: targetStructure.elements[i] || 'unknown',
        relation: 'corresponds_to',
      });
    }

    // Map relations
    for (const sourceRel of sourceStructure.relations) {
      for (const targetRel of targetStructure.relations) {
        if (this.areSemanticallySimilar(sourceRel, targetRel)) {
          correspondences.push({
            sourceElement: sourceRel,
            targetElement: targetRel,
            relation: 'analogous_relation',
          });
        }
      }
    }

    // Generate candidate inferences
    for (const sourceEl of sourceStructure.elements.slice(1)) {
      candidateInferences.push(
        `The role of "${sourceEl}" in ${source} may suggest a similar mechanism for ${target}`
      );
    }

    // Calculate systematicity (preference for connected, higher-order relations)
    const systematicity = Math.min(1, 0.3 + correspondences.length * 0.1 + depth * 0.1);

    return {
      source,
      target,
      structuralCorrespondences: correspondences,
      candidateInferences: candidateInferences.slice(0, depth),
      systematicity,
    };
  }

  private generateAnalogicalSolution(analogy: AnalogicalMapping, targetProblem: string): string {
    if (analogy.structuralCorrespondences.length > 0) {
      const mainCorr = analogy.structuralCorrespondences[0];
      return `Apply the principle of "${mainCorr.sourceElement}" from ${analogy.source} to address ${targetProblem}`;
    }
    return `Use ${analogy.source} as a mental model for approaching ${targetProblem}`;
  }

  // ============ Morphological Analysis ============

  private morphologicalAnalysis(
    problem: string,
    userDimensions: string[],
    maxCombinations: number
  ): any {
    const creativeProcess: string[] = [];
    creativeProcess.push(`Morphological analysis for: "${problem}"`);

    // Generate or use provided dimensions
    const dimensions =
      userDimensions.length > 0
        ? this.expandDimensions(userDimensions)
        : this.generateDimensions(problem);

    creativeProcess.push(`Dimensions identified: ${dimensions.map(d => d.name).join(', ')}`);

    // Generate combinations
    const combinations = this.generateMorphologicalCombinations(dimensions, maxCombinations);
    creativeProcess.push(`Generated ${combinations.length} valid combinations`);

    // Score combinations
    const scoredCombinations = combinations.map(combo => ({
      ...combo,
      feasibility: this.scoreCombinationFeasibility(combo),
      novelty: this.scoreCombinationNovelty(combo),
    }));

    // Sort by combined score
    scoredCombinations.sort((a, b) => b.feasibility + b.novelty - (a.feasibility + a.novelty));

    return {
      problem,
      dimensions: dimensions.map(d => ({
        name: d.name,
        options: d.options,
        option_count: d.options.length,
      })),
      total_solution_space: dimensions.reduce((acc, d) => acc * d.options.length, 1),
      combinations: scoredCombinations.slice(0, maxCombinations),
      creative_process: creativeProcess,
      confidence: 0.8,
    };
  }

  private generateDimensions(problem: string): Array<{ name: string; options: string[] }> {
    // Default dimensions for general problems
    return [
      { name: 'Approach', options: ['direct', 'indirect', 'hybrid', 'iterative'] },
      { name: 'Scale', options: ['individual', 'team', 'organizational', 'ecosystem'] },
      { name: 'Timeframe', options: ['immediate', 'short-term', 'long-term', 'ongoing'] },
      { name: 'Resources', options: ['minimal', 'moderate', 'extensive', 'adaptive'] },
      { name: 'Technology', options: ['low-tech', 'digital', 'AI-assisted', 'automated'] },
    ];
  }

  private expandDimensions(userDimensions: string[]): Array<{ name: string; options: string[] }> {
    return userDimensions.map(dim => ({
      name: dim,
      options: this.generateOptionsForDimension(dim),
    }));
  }

  private generateOptionsForDimension(dimension: string): string[] {
    const dimensionLower = dimension.toLowerCase();

    if (dimensionLower.includes('size') || dimensionLower.includes('scale')) {
      return ['tiny', 'small', 'medium', 'large', 'massive'];
    }
    if (dimensionLower.includes('speed') || dimensionLower.includes('time')) {
      return ['instant', 'fast', 'moderate', 'slow', 'gradual'];
    }
    if (dimensionLower.includes('cost') || dimensionLower.includes('price')) {
      return ['free', 'low-cost', 'moderate', 'premium', 'luxury'];
    }
    if (dimensionLower.includes('complex')) {
      return ['simple', 'basic', 'moderate', 'complex', 'sophisticated'];
    }

    return ['option_A', 'option_B', 'option_C', 'option_D'];
  }

  private generateMorphologicalCombinations(
    dimensions: Array<{ name: string; options: string[] }>,
    maxCombinations: number
  ): Array<{ combination: Record<string, string>; description: string }> {
    const combinations: Array<{ combination: Record<string, string>; description: string }> = [];

    // Generate combinations using constrained random sampling
    const totalPossible = dimensions.reduce((acc, d) => acc * d.options.length, 1);
    const sampleSize = Math.min(maxCombinations * 2, totalPossible);

    const seen = new Set<string>();

    for (let i = 0; i < sampleSize && combinations.length < maxCombinations; i++) {
      const combo: Record<string, string> = {};

      for (const dim of dimensions) {
        const randomIndex = Math.floor(Math.random() * dim.options.length);
        combo[dim.name] = dim.options[randomIndex];
      }

      const key = JSON.stringify(combo);
      if (!seen.has(key)) {
        seen.add(key);

        // Check if combination is valid (not self-contradictory)
        if (this.isValidCombination(combo)) {
          combinations.push({
            combination: combo,
            description: this.describeCombination(combo),
          });
        }
      }
    }

    return combinations;
  }

  private isValidCombination(combo: Record<string, string>): boolean {
    // Check for contradictory combinations
    const values = Object.values(combo);

    // Example: "instant" + "gradual" would be contradictory
    if (values.includes('instant') && values.includes('gradual')) return false;
    if (values.includes('minimal') && values.includes('extensive')) return false;
    if (values.includes('simple') && values.includes('sophisticated')) return false;

    return true;
  }

  private describeCombination(combo: Record<string, string>): string {
    const parts = Object.entries(combo).map(([dim, opt]) => `${opt} ${dim.toLowerCase()}`);
    return `Solution with ${parts.join(', ')}`;
  }

  private scoreCombinationFeasibility(combo: { combination: Record<string, string> }): number {
    let score = 0.5;
    const values = Object.values(combo.combination);

    // Conservative options increase feasibility
    if (values.some(v => ['moderate', 'medium', 'basic'].includes(v))) score += 0.1;
    if (values.some(v => ['simple', 'low-cost', 'minimal'].includes(v))) score += 0.1;

    // Extreme options decrease feasibility
    if (values.some(v => ['massive', 'luxury', 'instant'].includes(v))) score -= 0.1;

    return Math.max(0.2, Math.min(0.95, score));
  }

  private scoreCombinationNovelty(combo: { combination: Record<string, string> }): number {
    let score = 0.5;
    const values = Object.values(combo.combination);

    // Unusual combinations increase novelty
    if (values.includes('AI-assisted') || values.includes('automated')) score += 0.15;
    if (values.includes('ecosystem')) score += 0.1;
    if (values.some(v => ['sophisticated', 'complex'].includes(v))) score += 0.1;

    return Math.max(0.2, Math.min(0.95, score));
  }

  // ============ Metaphor Creation ============

  private createMetaphors(concept: string, sourceDomains: string[], quantity: number): any {
    const creativeProcess: string[] = [];
    creativeProcess.push(`Creating metaphors for "${concept}"`);
    creativeProcess.push(`Source domains: ${sourceDomains.join(', ')}`);

    const metaphors: any[] = [];
    const insights: string[] = [];

    for (const domain of sourceDomains) {
      const domainConcepts = this.domainKnowledge.get(domain) || [];

      for (const sourceConcept of domainConcepts.slice(
        0,
        Math.ceil(quantity / sourceDomains.length)
      )) {
        const mapping = this.createMetaphoricalMapping(concept, sourceConcept, domain);
        metaphors.push(mapping);

        if (mapping.insight) {
          insights.push(mapping.insight);
        }
      }
    }

    creativeProcess.push(`Generated ${metaphors.length} metaphors`);

    // Score and rank metaphors
    const scoredMetaphors = metaphors.map(m => ({
      ...m,
      overall_score: (m.aptness + m.comprehensibility + m.novelty) / 3,
    }));

    scoredMetaphors.sort((a, b) => b.overall_score - a.overall_score);

    return {
      target_concept: concept,
      metaphors: scoredMetaphors.slice(0, quantity),
      insights: insights.slice(0, 5),
      creative_process: creativeProcess,
      confidence: 0.78,
      metrics: {
        average_aptness: this.calculateAverageScore(scoredMetaphors.slice(0, quantity), 'aptness'),
        domain_diversity: sourceDomains.length,
      },
    };
  }

  private createMetaphoricalMapping(target: string, source: string, domain: string): any {
    // Create conceptual mapping
    const mappings = this.generateConceptualMappings(target, source);

    // Generate the metaphor statement
    const metaphorStatement = `${target} is a ${source}`;

    // Generate explanation
    const explanation = this.generateMetaphorExplanation(target, source, mappings);

    // Generate insight
    const insight = this.generateMetaphorInsight(target, source, mappings);

    // Score the metaphor
    const aptness = this.scoreMetaphorAptness(target, source, mappings);
    const comprehensibility = this.scoreMetaphorComprehensibility(source);
    const novelty = this.scoreMetaphorNovelty(target, source, domain);

    return {
      metaphor: metaphorStatement,
      source_domain: domain,
      source_concept: source,
      mappings,
      explanation,
      insight,
      aptness,
      comprehensibility,
      novelty,
    };
  }

  private generateConceptualMappings(
    target: string,
    source: string
  ): Array<{ from: string; to: string }> {
    const targetNode = this.getOrCreateConceptNode(target);
    const sourceNode = this.getOrCreateConceptNode(source);

    const mappings: Array<{ from: string; to: string }> = [];

    // Map properties
    for (let i = 0; i < Math.min(targetNode.properties.length, sourceNode.properties.length); i++) {
      mappings.push({
        from: `${source}'s ${sourceNode.properties[i]}`,
        to: `${target}'s ${targetNode.properties[i]}`,
      });
    }

    return mappings;
  }

  private generateMetaphorExplanation(
    target: string,
    source: string,
    mappings: Array<{ from: string; to: string }>
  ): string {
    if (mappings.length > 0) {
      return `Just as ${mappings[0].from}, so too ${mappings[0].to}`;
    }
    return `${target} shares fundamental characteristics with ${source}`;
  }

  private generateMetaphorInsight(
    target: string,
    source: string,
    mappings: Array<{ from: string; to: string }>
  ): string {
    return `Viewing ${target} as ${source} highlights aspects of ${target} that might otherwise be overlooked`;
  }

  private scoreMetaphorAptness(
    target: string,
    source: string,
    mappings: Array<{ from: string; to: string }>
  ): number {
    let score = 0.5;
    score += Math.min(0.3, mappings.length * 0.1);

    // Cross-domain metaphors are often more apt
    const targetNode = this.getOrCreateConceptNode(target);
    const sourceNode = this.getOrCreateConceptNode(source);

    if (targetNode.domain !== sourceNode.domain) {
      score += 0.1;
    }

    return Math.min(0.95, score);
  }

  private scoreMetaphorComprehensibility(source: string): number {
    // Familiar concepts are more comprehensible
    const familiarConcepts = ['river', 'tree', 'journey', 'battle', 'game', 'machine', 'network'];
    return familiarConcepts.includes(source.toLowerCase()) ? 0.85 : 0.65;
  }

  private scoreMetaphorNovelty(target: string, source: string, domain: string): number {
    // Cross-domain metaphors are more novel
    const targetNode = this.getOrCreateConceptNode(target);
    let score = 0.5;

    if (targetNode.domain !== domain) {
      score += 0.25;
    }

    // Less common source concepts are more novel
    const commonSources = ['journey', 'battle', 'game', 'machine'];
    if (!commonSources.includes(source.toLowerCase())) {
      score += 0.15;
    }

    return Math.min(0.95, score);
  }

  // ============ TRIZ Problem Solving ============

  private solveWithTRIZ(problem: string, improvingParam: string, worseningParam: string): any {
    const creativeProcess: string[] = [];
    creativeProcess.push(`TRIZ analysis for: "${problem}"`);
    creativeProcess.push(`Improving: ${improvingParam}, Worsening: ${worseningParam}`);

    // TRIZ contradiction matrix (simplified subset)
    const trizPrinciples = this.getTRIZPrinciples(improvingParam, worseningParam);
    creativeProcess.push(`Applicable principles: ${trizPrinciples.map(p => p.name).join(', ')}`);

    // Generate solutions based on principles
    const solutions = trizPrinciples.map(principle => ({
      principle: principle.name,
      principle_number: principle.number,
      description: principle.description,
      application: this.applyTRIZPrinciple(problem, principle),
      confidence: principle.relevance,
    }));

    return {
      problem,
      contradiction: {
        improving: improvingParam,
        worsening: worseningParam,
      },
      principles: trizPrinciples,
      solutions,
      creative_process: creativeProcess,
      confidence: 0.75,
    };
  }

  private getTRIZPrinciples(
    improving: string,
    worsening: string
  ): Array<{ number: number; name: string; description: string; relevance: number }> {
    // Simplified TRIZ principles (full matrix has 40 principles)
    const principles = [
      {
        number: 1,
        name: 'Segmentation',
        description: 'Divide an object into independent parts',
        relevance: 0.7,
      },
      {
        number: 2,
        name: 'Taking out',
        description: 'Extract the disturbing part or property',
        relevance: 0.65,
      },
      {
        number: 3,
        name: 'Local quality',
        description: 'Change uniform structure to non-uniform',
        relevance: 0.6,
      },
      {
        number: 5,
        name: 'Merging',
        description: 'Combine identical or similar objects',
        relevance: 0.7,
      },
      {
        number: 10,
        name: 'Preliminary action',
        description: 'Perform required changes in advance',
        relevance: 0.65,
      },
      {
        number: 13,
        name: 'The other way round',
        description: 'Invert the action',
        relevance: 0.75,
      },
      {
        number: 15,
        name: 'Dynamics',
        description: 'Make characteristics changeable',
        relevance: 0.7,
      },
      {
        number: 17,
        name: 'Another dimension',
        description: 'Move to multi-dimensional space',
        relevance: 0.6,
      },
      { number: 25, name: 'Self-service', description: 'Object serves itself', relevance: 0.65 },
      {
        number: 35,
        name: 'Parameter changes',
        description: 'Change physical state or properties',
        relevance: 0.7,
      },
    ];

    // Adjust relevance based on parameters
    const improvingLower = improving.toLowerCase();
    const worseningLower = worsening.toLowerCase();

    return principles
      .map(p => {
        let relevance = p.relevance;

        // Boost relevance for certain combinations
        if (improvingLower.includes('speed') && p.name === 'Preliminary action') relevance += 0.1;
        if (improvingLower.includes('cost') && p.name === 'Taking out') relevance += 0.1;
        if (worseningLower.includes('complex') && p.name === 'Segmentation') relevance += 0.1;
        if (improvingLower.includes('flexib') && p.name === 'Dynamics') relevance += 0.15;

        return { ...p, relevance: Math.min(0.95, relevance) };
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }

  private applyTRIZPrinciple(
    problem: string,
    principle: { number: number; name: string; description: string }
  ): string {
    const applications: Record<string, (p: string) => string> = {
      Segmentation: p =>
        `Break ${p} into smaller, independent modules that can be optimized separately`,
      'Taking out': p => `Remove the problematic element from ${p} and handle it separately`,
      'Local quality': p =>
        `Apply non-uniform optimization to ${p} - different approaches for different parts`,
      Merging: p => `Combine multiple instances or stages of ${p} to achieve synergy`,
      'Preliminary action': p => `Prepare or pre-process elements before the main ${p} operation`,
      'The other way round': p => `Reverse the approach: instead of X doing Y, have Y do X in ${p}`,
      Dynamics: p => `Make ${p} adaptive and responsive to changing conditions`,
      'Another dimension': p => `Add a new dimension or layer to ${p} to resolve the contradiction`,
      'Self-service': p => `Design ${p} to maintain, repair, or optimize itself`,
      'Parameter changes': p => `Change the physical or operational parameters of ${p}`,
    };

    const fn = applications[principle.name];
    return fn ? fn(problem) : `Apply ${principle.name}: ${principle.description} to ${problem}`;
  }

  // ============ Helper Methods ============

  private generateConcreteExample(topic: string, action: string): string {
    const examples: Record<string, (t: string) => string> = {
      Substitute: t => `Replace traditional components of ${t} with AI-driven alternatives`,
      Combine: t => `Merge ${t} with gamification elements for engagement`,
      Adapt: t => `Adapt successful strategies from nature for ${t}`,
      'Modify/Magnify': t => `Scale ${t} to handle 10x the current capacity`,
      'Put to other uses': t => `Repurpose ${t} technology for healthcare applications`,
      Eliminate: t => `Remove the intermediary step in ${t} process`,
      'Reverse/Rearrange': t => `Start ${t} from the end goal and work backwards`,
    };

    const fn = examples[action];
    return fn ? fn(topic) : `Apply ${action} thinking to transform ${topic}`;
  }

  private generateHatInsight(topic: string, hatColor: string): string {
    const insights: Record<string, (t: string) => string> = {
      White: t => `Key data needed: market size, user demographics, and success metrics for ${t}`,
      Red: t => `Initial gut reaction: ${t} feels promising but needs validation`,
      Black: t => `Primary risks: implementation complexity and adoption barriers for ${t}`,
      Yellow: t => `Best case: ${t} could become the industry standard within 3 years`,
      Green: t => `Creative angle: What if ${t} worked in reverse? Or was invisible?`,
      Blue: t => `Process recommendation: Start with small pilots before scaling ${t}`,
    };

    const fn = insights[hatColor];
    return fn ? fn(topic) : `Consider ${topic} from the ${hatColor} hat perspective`;
  }

  private findSemanticConnection(topic: string, word: string): string {
    const connections: Record<string, (t: string) => string> = {
      improve: t => `Enhance ${t} through continuous iteration`,
      optimize: t => `Find the optimal configuration for ${t}`,
      transform: t => `Fundamentally reimagine what ${t} could become`,
      reimagine: t => `Start from scratch with ${t} - what would you build today?`,
      disrupt: t => `Challenge the core assumptions underlying ${t}`,
      integrate: t => `Connect ${t} with complementary systems`,
      evolve: t => `Allow ${t} to adapt and grow organically`,
      invert: t => `What if the opposite of ${t} was true?`,
      transcend: t => `Move beyond the current limitations of ${t}`,
      emergence: t => `What new properties emerge when ${t} scales?`,
    };

    const fn = connections[word];
    return fn ? fn(topic) : `Connect "${word}" to ${topic} in an unexpected way`;
  }

  private generateAttributeVariation(topic: string, attribute: string): string {
    return `What if ${topic}'s ${attribute} was completely different? Consider extremes.`;
  }

  private generateReversalInsight(topic: string, reversalType: string): string {
    return `${reversalType} for ${topic} might reveal hidden assumptions and opportunities`;
  }

  private generateDomainTransfer(topic: string, domain: string, concept: string): string {
    return `${domain}'s "${concept}" suggests: approach ${topic} with similar principles of ${concept}`;
  }

  private scoreAndRankIdeas(ideas: any[], topic: string): any[] {
    return ideas
      .map(idea => ({
        ...idea,
        combined_score: (idea.novelty || 0.5) * 0.4 + (idea.feasibility || 0.5) * 0.6,
      }))
      .sort((a, b) => b.combined_score - a.combined_score);
  }

  private calculateAverageScore(items: any[], scoreKey: string): number {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + (item[scoreKey] || 0.5), 0);
    return Math.round((sum / items.length) * 100) / 100;
  }

  private calculateDiversityScore(ideas: any[]): number {
    const techniques = new Set(ideas.map(i => i.technique));
    return Math.min(1, techniques.size / 5);
  }

  private estimateNovelty(action: string, topic: string): number {
    const highNoveltyActions = ['Reverse/Rearrange', 'Eliminate', 'Combine'];
    return highNoveltyActions.includes(action) ? 0.75 : 0.55;
  }

  private estimateFeasibility(action: string): number {
    const highFeasibilityActions = ['Substitute', 'Modify/Magnify', 'Adapt'];
    return highFeasibilityActions.includes(action) ? 0.75 : 0.55;
  }

  private estimateWordNovelty(word: string, creativityLevel: string): number {
    if (creativityLevel === 'radical') return 0.8;
    if (creativityLevel === 'moderate') return 0.6;
    return 0.4;
  }

  private getSupportedOperations(): string[] {
    return [
      'generate_ideas',
      'blend_concepts',
      'find_analogies',
      'morphological_analysis',
      'create_metaphors',
      'solve_with_triz',
    ];
  }
}
