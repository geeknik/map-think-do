/**
 * @fileoverview Metacognitive prompt plugin for self-reflection and meta-reasoning
 * 
 * This plugin enables AGI-like self-awareness by providing prompts that encourage
 * the system to reflect on its own thinking process, question assumptions,
 * and evaluate the quality of its reasoning.
 */

import { BasePromptPlugin, PromptContext, PluginMetadata, ActivationConditions } from './base-plugin.js';
import { Prompt, PromptResult } from '../types.js';

/**
 * Metacognitive prompt plugin that provides self-reflection capabilities
 */
export class MetaPromptsPlugin extends BasePromptPlugin {
  private reflectionTriggers: Set<string> = new Set();
  private assumptionPatterns: RegExp[] = [];
  
  constructor() {
    const metadata: PluginMetadata = {
      name: 'meta-prompts',
      description: 'Provides metacognitive prompts for self-reflection and meta-reasoning',
      version: '1.0.0',
      author: 'map-think-do',
      capabilities: [
        'self-reflection',
        'assumption-questioning', 
        'reasoning-evaluation',
        'cognitive-monitoring',
        'bias-detection',
        'confidence-calibration'
      ],
      domains: ['all'], // Metacognition applies to all domains
      complexityRange: [3, 10], // More useful for complex problems
      priority: 8 // High priority for metacognitive oversight
    };
    
    const activationConditions: ActivationConditions = {
      // Activate when confidence is uncertain or when we've been thinking for a while
      customCondition: (context: PromptContext) => {
        const thoughtCount = context.thoughtHistory.length;
        const latestThought = context.thoughtHistory[thoughtCount - 1];
        
        // Activate every 3-5 thoughts for reflection
        if (thoughtCount > 0 && thoughtCount % 4 === 0) return true;
        
        // Activate when confidence is low or missing
        if (latestThought && (latestThought.confidence || 0) < 0.7) return true;
        
        // Activate when we detect assumption-heavy language
        if (latestThought && this.containsAssumptions(latestThought.thought)) return true;
        
        // Activate for high complexity problems
        if (context.complexity && context.complexity >= 7) return true;
        
        return false;
      }
    };
    
    super(metadata, activationConditions);
    
    // Initialize assumption detection patterns
    this.assumptionPatterns = [
      /\b(assume|assuming|presumably|likely|probably|should|must|obviously|clearly)\b/gi,
      /\b(I think|I believe|it seems|appears to|tends to)\b/gi,
      /\b(usually|typically|generally|normally|always|never)\b/gi
    ];
  }
  
  /**
   * Check if text contains assumption-heavy language
   */
  private containsAssumptions(text: string): boolean {
    return this.assumptionPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Generate metacognitive prompts based on context
   */
  generatePrompts(context: PromptContext): Prompt[] {
    const prompts: Prompt[] = [];
    const thoughtCount = context.thoughtHistory.length;
    
    // Self-reflection prompt
    prompts.push({
      name: 'self-reflection',
      description: 'Reflect on your current reasoning process and identify potential improvements',
      arguments: [
        {
          name: 'current_approach',
          description: 'Describe your current reasoning approach',
          required: true
        },
        {
          name: 'thought_history',
          description: 'Summary of thoughts so far',
          required: false
        }
      ]
    });
    
    // Assumption questioning prompt
    if (thoughtCount > 0) {
      const latestThought = context.thoughtHistory[thoughtCount - 1];
      if (this.containsAssumptions(latestThought.thought)) {
        prompts.push({
          name: 'question-assumptions',
          description: 'Identify and question the assumptions in your reasoning',
          arguments: [
            {
              name: 'identified_assumptions',
              description: 'List the assumptions you\'ve identified',
              required: true
            },
            {
              name: 'alternative_perspectives',
              description: 'What alternative perspectives might challenge these assumptions?',
              required: false
            }
          ]
        });
      }
    }
    
    // Reasoning evaluation prompt
    if (thoughtCount >= 3) {
      prompts.push({
        name: 'evaluate-reasoning',
        description: 'Evaluate the quality and coherence of your reasoning chain',
        arguments: [
          {
            name: 'reasoning_strengths',
            description: 'What are the strengths of your current reasoning?',
            required: true
          },
          {
            name: 'reasoning_weaknesses',
            description: 'What are potential weaknesses or gaps?',
            required: true
          },
          {
            name: 'improvement_suggestions',
            description: 'How could the reasoning be improved?',
            required: false
          }
        ]
      });
    }
    
    // Confidence calibration prompt
    prompts.push({
      name: 'calibrate-confidence',
      description: 'Assess and calibrate your confidence in current conclusions',
      arguments: [
        {
          name: 'confidence_level',
          description: 'Your current confidence level (0-100%)',
          required: true
        },
        {
          name: 'confidence_factors',
          description: 'What factors support or undermine this confidence?',
          required: true
        }
      ]
    });
    
    // Alternative approach prompt
    if (thoughtCount >= 2) {
      prompts.push({
        name: 'explore-alternatives',
        description: 'Consider alternative approaches to the current problem',
        arguments: [
          {
            name: 'current_path',
            description: 'Summarize your current approach',
            required: true
          },
          {
            name: 'alternative_approaches',
            description: 'What other approaches could you take?',
            required: true
          },
          {
            name: 'approach_comparison',
            description: 'Compare the merits of different approaches',
            required: false
          }
        ]
      });
    }
    
    return prompts;
  }
  
  /**
   * Generate metacognitive prompt templates
   */
  generateTemplates(context: PromptContext): Record<string, (args: Record<string, string>) => PromptResult> {
    return {
      'self-reflection': (args) => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `🧠 **METACOGNITIVE REFLECTION**

Take a step back and reflect on your reasoning process:

**Current Approach:** ${args.current_approach || 'Not specified'}
${args.thought_history ? `**Thought History:** ${args.thought_history}` : ''}

**Reflection Questions:**
1. What assumptions am I making that I haven't questioned?
2. Am I approaching this problem from the best angle?
3. What blind spots might I have?
4. How confident should I be in my current direction?
5. What would I advise someone else doing this same reasoning?

**Meta-Analysis:**
- Are my thoughts building logically on each other?
- Am I being appropriately skeptical vs. confident?
- What evidence would change my current thinking?
- How can I improve my reasoning process?

Please use the code-reasoning tool to work through this reflection systematically.`
          }
        }]
      }),
      
      'question-assumptions': (args) => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `🔍 **ASSUMPTION ANALYSIS**

I've identified potential assumptions in your reasoning. Let's examine them critically:

**Identified Assumptions:** ${args.identified_assumptions}
${args.alternative_perspectives ? `**Alternative Perspectives:** ${args.alternative_perspectives}` : ''}

**Critical Questions:**
1. Which of these assumptions are actually necessary?
2. What evidence supports each assumption?
3. What evidence could contradict each assumption?
4. How would your reasoning change if each assumption were false?
5. Are there cultural, temporal, or contextual biases in these assumptions?

**Assumption Testing:**
- Can you find counterexamples to any assumption?
- What would experts in different fields think about these assumptions?
- How have similar assumptions been challenged historically?

Use the code-reasoning tool to systematically examine each assumption.`
          }
        }]
      }),
      
      'evaluate-reasoning': (args) => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `⚖️ **REASONING QUALITY EVALUATION**

Let's evaluate the quality of your reasoning chain:

**Reasoning Strengths:** ${args.reasoning_strengths}
**Reasoning Weaknesses:** ${args.reasoning_weaknesses}
${args.improvement_suggestions ? `**Improvement Ideas:** ${args.improvement_suggestions}` : ''}

**Quality Dimensions to Assess:**
1. **Logic**: Are the inferences valid? Do conclusions follow from premises?
2. **Evidence**: Is the reasoning supported by adequate evidence?
3. **Completeness**: Have you considered all relevant factors?
4. **Coherence**: Do all parts of your reasoning fit together?
5. **Clarity**: Is your reasoning clear and well-structured?
6. **Robustness**: How well would your reasoning hold up under scrutiny?

**Self-Audit Questions:**
- Where are the weakest links in my reasoning chain?
- What would a skilled critic say about this reasoning?
- How could I make this reasoning more rigorous?
- What additional information would strengthen my position?

Use the code-reasoning tool to conduct this quality evaluation systematically.`
          }
        }]
      }),
      
      'calibrate-confidence': (args) => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `📊 **CONFIDENCE CALIBRATION**

Let's calibrate your confidence in your current reasoning:

**Current Confidence:** ${args.confidence_level}%
**Supporting/Undermining Factors:** ${args.confidence_factors}

**Calibration Framework:**
1. **Base Rate**: How often are similar conclusions correct?
2. **Evidence Quality**: How strong and reliable is your evidence?
3. **Reasoning Quality**: How sound is your logical process?
4. **Expertise**: How much relevant expertise do you have in this domain?
5. **Complexity**: How complex is the problem (more complex = lower confidence)?
6. **Time Pressure**: Are you rushing or being thorough?

**Confidence Anchors:**
- 90%+: Extremely confident, would bet heavily on this
- 70-89%: Quite confident, likely correct but some uncertainty
- 50-69%: Moderately confident, could easily be wrong
- 30-49%: Low confidence, more likely wrong than right
- <30%: Very uncertain, mostly guessing

**Calibration Questions:**
- If I made 10 similar judgments at this confidence level, how many would be correct?
- What specific evidence would move my confidence up or down by 20%?
- Am I being overconfident due to confirmation bias?
- Am I being underconfident due to imposter syndrome?

Use the code-reasoning tool to work through this calibration process.`
          }
        }]
      }),
      
      'explore-alternatives': (args) => ({
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `🌿 **ALTERNATIVE APPROACH EXPLORATION**

Let's explore different ways to approach this problem:

**Current Path:** ${args.current_path}
**Alternative Approaches:** ${args.alternative_approaches}
${args.approach_comparison ? `**Approach Comparison:** ${args.approach_comparison}` : ''}

**Alternative Generation Techniques:**
1. **Inversion**: What if you approached this from the opposite direction?
2. **Analogies**: How do experts in other fields solve similar problems?
3. **Constraints**: What if you removed or changed key constraints?
4. **Scale**: How would the approach change at different scales?
5. **Time**: How would this be approached with more/less time?
6. **Resources**: How would limited/unlimited resources change the approach?

**Evaluation Criteria:**
- **Feasibility**: How practical is each approach?
- **Efficiency**: Which approach is most resource-efficient?
- **Robustness**: Which approach handles uncertainty best?
- **Novelty**: Which approach is most innovative?
- **Risk**: What are the failure modes of each approach?

**Decision Framework:**
- Which approach best fits the current constraints?
- Which approach has the highest expected value?
- Which approach provides the best learning opportunity?
- Which approach is most reversible if it doesn't work?

Use the code-reasoning tool to systematically explore and evaluate these alternatives.`
          }
        }]
      })
    };
  }
  
  /**
   * Provide feedback to improve metacognitive prompting
   */
  provideFeedback(promptName: string, success: boolean, confidence: number, context: PromptContext): void {
    super.provideFeedback(promptName, success, confidence, context);
    
    // Track which types of reflection are most effective
    if (success && confidence > 0.8) {
      this.reflectionTriggers.add(promptName);
    }
    
    // Learn from unsuccessful metacognitive interventions
    if (!success && promptName.includes('assumption')) {
      // Maybe we need to be more gentle with assumption questioning
      console.error(`Assumption questioning may have been too aggressive for context: ${context.domain}`);
    }
  }
  
  /**
   * Update plugin state based on reasoning patterns
   */
  updateState(context: PromptContext): void {
    // Track patterns in thought evolution to improve trigger conditions
    if (context.thoughtHistory.length >= 2) {
      const recent = context.thoughtHistory.slice(-2);
      const [prev, curr] = recent;
      
      // If confidence improved after metacognitive intervention, note it
      if (prev.confidence && curr.confidence && curr.confidence > prev.confidence) {
        console.error(`Metacognitive intervention appears to have helped improve confidence`);
      }
    }
  }
} 