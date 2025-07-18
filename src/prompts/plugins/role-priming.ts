/**
 * @fileoverview Role-priming plugin for different cognitive personas
 *
 * This plugin enables AGI-like cognitive flexibility by providing different
 * thinking styles and personas that can be applied contextually. Each role
 * brings distinct cognitive strengths and perspectives.
 */

import {
  BasePromptPlugin,
  PromptContext,
  PluginMetadata,
  ActivationConditions,
} from './base-plugin.js';
import { Prompt, PromptResult } from '../types.js';

/**
 * Cognitive roles/personas with their characteristics
 */
interface CognitiveRole {
  name: string;
  description: string;
  strengths: string[];
  domains: string[];
  thinkingStyle: string;
  activationTriggers: string[];
  complexityRange: [number, number];
}

/**
 * Role-priming plugin that provides different cognitive personas
 */
export class RolePrimingPlugin extends BasePromptPlugin {
  private availableRoles: Map<string, CognitiveRole> = new Map();
  private roleHistory: Array<{ role: string; timestamp: Date; success: boolean }> = [];

  constructor() {
    const metadata: PluginMetadata = {
      name: 'role-priming',
      description:
        'Provides different cognitive personas and thinking styles for contextual reasoning',
      version: '1.0.0',
      author: 'map-think-do',
      capabilities: [
        'perspective-switching',
        'cognitive-flexibility',
        'role-based-reasoning',
        'multi-persona-analysis',
        'contextual-adaptation',
        'expertise-simulation',
      ],
      domains: ['all'], // Role priming applies to all domains
      complexityRange: [1, 10], // Useful across all complexity levels
      priority: 6, // Medium-high priority for cognitive flexibility
    };

    const activationConditions: ActivationConditions = {
      customCondition: (context: PromptContext) => {
        // Activate when we need fresh perspective
        const thoughtCount = context.thoughtHistory.length;

        // Activate early for role selection
        if (thoughtCount <= 2) return true;

        // Activate when we seem stuck (repeated similar thoughts)
        if (thoughtCount >= 3) {
          const recentThoughts = context.thoughtHistory.slice(-3);
          const similarityThreshold = 0.7; // Simplified similarity check
          // In real implementation, would use more sophisticated similarity
          return this.detectSimilarThoughts(recentThoughts);
        }

        // Activate for high complexity problems that benefit from multiple perspectives
        if (context.complexity && context.complexity >= 7) return true;

        return false;
      },
    };

    super(metadata, activationConditions);

    this.initializeRoles();
  }

  /**
   * Initialize available cognitive roles
   */
  private initializeRoles(): void {
    const roles: CognitiveRole[] = [
      {
        name: 'strategist',
        description:
          'High-level strategic thinker focused on long-term planning and systems thinking',
        strengths: [
          'systems-thinking',
          'long-term-planning',
          'pattern-recognition',
          'risk-assessment',
        ],
        domains: ['business', 'architecture', 'planning', 'design'],
        thinkingStyle: 'top-down, holistic, future-oriented',
        activationTriggers: ['strategy', 'planning', 'architecture', 'long-term', 'system'],
        complexityRange: [6, 10],
      },
      {
        name: 'engineer',
        description:
          'Detail-oriented problem solver focused on implementation and technical feasibility',
        strengths: [
          'technical-analysis',
          'implementation-focus',
          'constraint-awareness',
          'optimization',
        ],
        domains: ['programming', 'engineering', 'technical', 'implementation'],
        thinkingStyle: 'bottom-up, analytical, constraint-focused',
        activationTriggers: ['code', 'technical', 'implementation', 'build', 'optimize'],
        complexityRange: [3, 8],
      },
      {
        name: 'skeptic',
        description:
          'Critical thinker focused on finding flaws, risks, and alternative explanations',
        strengths: [
          'critical-analysis',
          'risk-identification',
          'assumption-challenging',
          "devil's-advocate",
        ],
        domains: ['all'],
        thinkingStyle: 'critical, questioning, risk-aware',
        activationTriggers: ['risk', 'problem', 'critique', 'challenge', 'assume'],
        complexityRange: [2, 10],
      },
      {
        name: 'creative',
        description: 'Innovative thinker focused on novel solutions and out-of-the-box approaches',
        strengths: ['innovation', 'lateral-thinking', 'analogical-reasoning', 'ideation'],
        domains: ['design', 'creative', 'innovation', 'art'],
        thinkingStyle: 'divergent, analogical, boundary-pushing',
        activationTriggers: ['creative', 'innovative', 'novel', 'alternative', 'brainstorm'],
        complexityRange: [4, 9],
      },
      {
        name: 'analyst',
        description: 'Data-driven thinker focused on evidence, metrics, and systematic analysis',
        strengths: [
          'data-analysis',
          'evidence-evaluation',
          'systematic-thinking',
          'quantification',
        ],
        domains: ['research', 'analysis', 'science', 'data'],
        thinkingStyle: 'evidence-based, systematic, quantitative',
        activationTriggers: ['data', 'analysis', 'research', 'evidence', 'measure'],
        complexityRange: [3, 9],
      },
      {
        name: 'philosopher',
        description:
          'Deep thinker focused on fundamental questions, ethics, and conceptual clarity',
        strengths: [
          'conceptual-clarity',
          'ethical-reasoning',
          'fundamental-questions',
          'logical-rigor',
        ],
        domains: ['ethics', 'philosophy', 'conceptual', 'theoretical'],
        thinkingStyle: 'deep, conceptual, principle-based',
        activationTriggers: ['why', 'ethics', 'principle', 'meaning', 'fundamental'],
        complexityRange: [5, 10],
      },
      {
        name: 'pragmatist',
        description:
          'Practical thinker focused on what works, resource constraints, and actionable solutions',
        strengths: ['practical-solutions', 'resource-awareness', 'actionability', 'efficiency'],
        domains: ['business', 'operations', 'practical'],
        thinkingStyle: 'practical, action-oriented, resource-conscious',
        activationTriggers: ['practical', 'action', 'resource', 'efficient', 'realistic'],
        complexityRange: [1, 7],
      },
      {
        name: 'synthesizer',
        description:
          'Integrative thinker focused on combining diverse perspectives and finding common ground',
        strengths: ['integration', 'pattern-synthesis', 'perspective-merging', 'holistic-view'],
        domains: ['all'],
        thinkingStyle: 'integrative, holistic, bridge-building',
        activationTriggers: ['combine', 'integrate', 'synthesize', 'merge', 'holistic'],
        complexityRange: [4, 10],
      },
    ];

    roles.forEach(role => this.availableRoles.set(role.name, role));
  }

  /**
   * Detect if recent thoughts are too similar (simplified implementation)
   */
  private detectSimilarThoughts(thoughts: Array<{ thought: string }>): boolean {
    if (thoughts.length < 2) return false;

    // Simplified similarity detection - in practice would use more sophisticated NLP
    const keyWords = thoughts.map(t =>
      t.thought
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 4)
    );

    // Check for high overlap in key words
    for (let i = 0; i < keyWords.length - 1; i++) {
      const overlap = keyWords[i].filter(word => keyWords[i + 1].includes(word));
      if (overlap.length > keyWords[i].length * 0.6) {
        return true; // High similarity detected
      }
    }

    return false;
  }

  /**
   * Recommend best role for the current context
   */
  private recommendRole(context: PromptContext): CognitiveRole | null {
    const scores = new Map<string, number>();

    for (const [roleName, role] of this.availableRoles) {
      let score = 0;

      // Domain match
      if (context.domain && role.domains.includes(context.domain)) {
        score += 3;
      } else if (role.domains.includes('all')) {
        score += 1;
      }

      // Complexity match
      if (context.complexity !== undefined) {
        const [minComp, maxComp] = role.complexityRange;
        if (context.complexity >= minComp && context.complexity <= maxComp) {
          score += 2;
        }
      }

      // Trigger word match
      if (context.objective) {
        const objectiveLower = context.objective.toLowerCase();
        const triggerMatches = role.activationTriggers.filter(trigger =>
          objectiveLower.includes(trigger)
        ).length;
        score += triggerMatches;
      }

      // Historical success
      const roleSuccesses = this.roleHistory.filter(h => h.role === roleName && h.success).length;
      const roleAttempts = this.roleHistory.filter(h => h.role === roleName).length;
      if (roleAttempts > 0) {
        score += (roleSuccesses / roleAttempts) * 2;
      }

      scores.set(roleName, score);
    }

    // Find highest scoring role
    let bestRole: string | null = null;
    let bestScore = 0;

    for (const [roleName, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestRole = roleName;
      }
    }

    return bestRole ? this.availableRoles.get(bestRole) || null : null;
  }

  /**
   * Generate role-based prompts
   */
  generatePrompts(context: PromptContext): Prompt[] {
    const prompts: Prompt[] = [];
    const recommendedRole = this.recommendRole(context);

    // Role selection prompt
    prompts.push({
      name: 'select-role',
      description: 'Choose a cognitive role/persona for approaching this problem',
      arguments: [
        {
          name: 'problem_context',
          description: 'Brief description of the problem context',
          required: true,
        },
        {
          name: 'preferred_role',
          description: 'Preferred cognitive role (optional)',
          required: false,
        },
      ],
    });

    // Role-specific prompts
    if (recommendedRole) {
      prompts.push({
        name: `adopt-${recommendedRole.name}`,
        description: `Adopt the ${recommendedRole.name} persona: ${recommendedRole.description}`,
        arguments: [
          {
            name: 'problem_statement',
            description: "The problem to approach from this role's perspective",
            required: true,
          },
          {
            name: 'context_details',
            description: 'Additional context relevant to this role',
            required: false,
          },
        ],
      });
    }

    // Multi-perspective prompt
    if (context.thoughtHistory.length >= 3) {
      prompts.push({
        name: 'multi-perspective',
        description: 'Examine the problem from multiple cognitive perspectives',
        arguments: [
          {
            name: 'current_analysis',
            description: 'Current analysis or approach',
            required: true,
          },
          {
            name: 'perspectives_needed',
            description: 'Specific perspectives to consider (comma-separated)',
            required: false,
          },
        ],
      });
    }

    return prompts;
  }

  /**
   * Generate role-based prompt templates
   */
  generateTemplates(
    context: PromptContext
  ): Record<string, (args: Record<string, string>) => PromptResult> {
    const templates: Record<string, (args: Record<string, string>) => PromptResult> = {};

    // Role selection template
    templates['select-role'] = args => {
      const recommendedRole = this.recommendRole(context);
      const roleOptions = Array.from(this.availableRoles.values())
        .map(
          role => `**${role.name}**: ${role.description} (Strengths: ${role.strengths.join(', ')})`
        )
        .join('\n');

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `🎭 **COGNITIVE ROLE SELECTION**

Problem Context: ${args.problem_context}
${args.preferred_role ? `Preferred Role: ${args.preferred_role}` : ''}
${recommendedRole ? `Recommended Role: **${recommendedRole.name}** - ${recommendedRole.description}` : ''}

**Available Cognitive Roles:**
${roleOptions}

**Selection Criteria:**
1. Which role's strengths best match this problem?
2. Which thinking style would be most effective?
3. What perspective might reveal new insights?
4. Which role handles this complexity level well?

Choose a role and explain why it's appropriate for this context. Then use the code-reasoning tool to approach the problem from that role's perspective.`,
            },
          },
        ],
      };
    };

    // Multi-perspective template
    templates['multi-perspective'] = args => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `🔄 **MULTI-PERSPECTIVE ANALYSIS**

Current Analysis: ${args.current_analysis}
${args.perspectives_needed ? `Requested Perspectives: ${args.perspectives_needed}` : ''}

**Perspective Framework:**
1. **Strategist**: How does this fit into the bigger picture? What are the long-term implications?
2. **Engineer**: What are the technical constraints and implementation challenges?
3. **Skeptic**: What could go wrong? What assumptions need questioning?
4. **Creative**: What novel approaches haven't been considered?
5. **Analyst**: What data or evidence supports different approaches?
6. **Philosopher**: What are the fundamental principles and ethical considerations?
7. **Pragmatist**: What's the most practical, resource-efficient approach?
8. **Synthesizer**: How can different perspectives be integrated?

**Analysis Process:**
- Apply each relevant perspective to the problem
- Note where perspectives agree or conflict
- Identify insights unique to each perspective
- Synthesize a more complete understanding

Use the code-reasoning tool to systematically work through these perspectives.`,
          },
        },
      ],
    });

    // Generate templates for each role
    for (const [roleName, role] of this.availableRoles) {
      templates[`adopt-${roleName}`] = args => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `🎭 **ADOPTING ${role.name.toUpperCase()} PERSONA**

**Role Description:** ${role.description}
**Key Strengths:** ${role.strengths.join(', ')}
**Thinking Style:** ${role.thinkingStyle}

**Problem Statement:** ${args.problem_statement}
${args.context_details ? `**Additional Context:** ${args.context_details}` : ''}

**${role.name.charAt(0).toUpperCase() + role.name.slice(1)} Mindset:**
${this.getRoleMindset(role)}

**Approach Guidelines:**
${this.getRoleGuidelines(role)}

Now, fully embody this ${role.name} persona and use the code-reasoning tool to approach the problem from this perspective. Think, speak, and reason as a ${role.name} would.`,
            },
          },
        ],
      });
    }

    return templates;
  }

  /**
   * Get role-specific mindset description
   */
  private getRoleMindset(role: CognitiveRole): string {
    const mindsets: Record<string, string> = {
      strategist:
        "Think big picture. Consider long-term consequences. Look for patterns and systems. Ask 'What's the ultimate goal?' and 'How does this connect to everything else?'",
      engineer:
        "Focus on implementation details. Consider constraints and trade-offs. Ask 'How would this actually work?' and 'What could break?'",
      skeptic:
        "Question everything. Look for flaws and risks. Ask 'What's wrong with this?' and 'What are we missing?'",
      creative:
        "Think outside the box. Make unexpected connections. Ask 'What if we tried something completely different?' and 'How can we break the rules?'",
      analyst:
        "Demand evidence. Look for data and patterns. Ask 'What does the data say?' and 'How can we measure this?'",
      philosopher:
        "Dig deep into fundamentals. Consider ethics and meaning. Ask 'Why does this matter?' and 'What are the underlying principles?'",
      pragmatist:
        "Focus on what works. Consider resources and constraints. Ask 'What's the simplest solution?' and 'What can we actually do?'",
      synthesizer:
        "Look for connections and integration. Bridge different perspectives. Ask 'How do these ideas fit together?' and 'What's the unified view?'",
    };

    return mindsets[role.name] || "Approach the problem from this role's unique perspective.";
  }

  /**
   * Get role-specific approach guidelines
   */
  private getRoleGuidelines(role: CognitiveRole): string {
    const guidelines: Record<string, string[]> = {
      strategist: [
        'Start with the end goal and work backwards',
        'Consider multiple scenarios and contingencies',
        'Think in terms of systems and relationships',
        'Focus on sustainable, long-term solutions',
      ],
      engineer: [
        'Break down into implementable components',
        'Identify technical constraints and requirements',
        'Consider scalability and maintainability',
        'Focus on concrete, actionable steps',
      ],
      skeptic: [
        'Challenge every assumption',
        'Look for potential failure modes',
        'Consider alternative explanations',
        'Ask tough questions others might avoid',
      ],
      creative: [
        'Generate multiple novel alternatives',
        'Use analogies and metaphors',
        'Combine unrelated concepts',
        'Suspend judgment during ideation',
      ],
      analyst: [
        'Gather and evaluate evidence',
        'Look for patterns in data',
        'Quantify where possible',
        'Base conclusions on solid evidence',
      ],
      philosopher: [
        'Examine underlying assumptions',
        'Consider ethical implications',
        'Seek conceptual clarity',
        'Think about fundamental principles',
      ],
      pragmatist: [
        'Focus on actionable solutions',
        'Consider resource constraints',
        'Prioritize based on impact and feasibility',
        'Think about real-world implementation',
      ],
      synthesizer: [
        'Look for common themes',
        'Bridge different perspectives',
        'Create integrated solutions',
        'Find the meta-pattern',
      ],
    };

    const roleGuidelines = guidelines[role.name] || [
      "Apply this role's perspective to the problem",
    ];
    return roleGuidelines.map((g, i) => `${i + 1}. ${g}`).join('\n');
  }

  /**
   * Provide feedback on role effectiveness
   */
  provideFeedback(
    promptName: string,
    success: boolean,
    confidence: number,
    context: PromptContext
  ): void {
    super.provideFeedback(promptName, success, confidence, context);

    // Track role performance
    if (promptName.startsWith('adopt-')) {
      const roleName = promptName.replace('adopt-', '');
      this.roleHistory.push({
        role: roleName,
        timestamp: new Date(),
        success: success && confidence > 0.7,
      });

      // Keep history manageable
      if (this.roleHistory.length > 100) {
        this.roleHistory = this.roleHistory.slice(-50);
      }
    }
  }
}
