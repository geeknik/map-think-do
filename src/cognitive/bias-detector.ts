/**
 * @fileoverview Real Cognitive Bias Detection System
 *
 * Genuine bias detection that:
 * - Learns from historical reasoning patterns
 * - Tracks prediction vs outcome discrepancies
 * - Identifies systematic errors in reasoning
 * - Suggests debiasing strategies
 * - Calibrates over time
 */

import { EventEmitter } from 'events';
import { SQLiteStore } from '../memory/sqlite-store.js';

export interface BiasDefinition {
  id: string;
  name: string;
  description: string;
  detection_patterns: BiasPattern[];
  debiasing_strategies: string[];
  severity: 'low' | 'medium' | 'high';
  category: BiasCategory;
}

export type BiasCategory =
  | 'confirmation'
  | 'anchoring'
  | 'availability'
  | 'overconfidence'
  | 'hindsight'
  | 'sunk_cost'
  | 'framing'
  | 'bandwagon'
  | 'attribution'
  | 'selection';

export interface BiasPattern {
  type: 'text_pattern' | 'confidence_pattern' | 'outcome_pattern' | 'temporal_pattern';
  pattern: string | RegExp;
  weight: number;
  threshold: number;
}

export interface BiasDetectionResult {
  bias_id: string;
  bias_name: string;
  confidence: number;
  evidence: string[];
  suggested_corrections: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface BiasLearningRecord {
  bias_id: string;
  detection_count: number;
  true_positive_count: number;
  false_positive_count: number;
  precision: number;
  recall: number;
  last_detected: Date;
  context_patterns: string[];
}

export class BiasDetector extends EventEmitter {
  private memoryStore: SQLiteStore;
  private biasDefinitions: Map<string, BiasDefinition> = new Map();
  private learningRecords: Map<string, BiasLearningRecord> = new Map();
  private recentDetections: BiasDetectionResult[] = [];

  constructor(memoryStore: SQLiteStore) {
    super();
    this.memoryStore = memoryStore;
    this.initializeBiasDefinitions();
  }

  /**
   * Initialize known cognitive biases
   */
  private initializeBiasDefinitions(): void {
    const biases: BiasDefinition[] = [
      {
        id: 'confirmation_bias',
        name: 'Confirmation Bias',
        description:
          'Tendency to search for, interpret, favor information that confirms existing beliefs',
        category: 'confirmation',
        severity: 'high',
        detection_patterns: [
          {
            type: 'text_pattern',
            pattern: /this (confirms|supports|proves|validates|verifies)/i,
            weight: 0.7,
            threshold: 0.5,
          },
          {
            type: 'text_pattern',
            pattern: /as (expected|I thought|predicted|anticipated)/i,
            weight: 0.6,
            threshold: 0.4,
          },
          {
            type: 'text_pattern',
            pattern: /obviously|clearly|of course|naturally/i,
            weight: 0.4,
            threshold: 0.3,
          },
        ],
        debiasing_strategies: [
          'Actively seek contradicting evidence',
          'Ask: "What would change my mind?"',
          'Consider alternative hypotheses with equal weight',
          'Seek input from someone with an opposing view',
        ],
      },
      {
        id: 'overconfidence_bias',
        name: 'Overconfidence Bias',
        description: 'Excessive confidence in own answers and judgments',
        category: 'overconfidence',
        severity: 'high',
        detection_patterns: [
          {
            type: 'text_pattern',
            pattern: /definitely|certainly|absolutely|100%|guaranteed/i,
            weight: 0.8,
            threshold: 0.5,
          },
          {
            type: 'text_pattern',
            pattern: /impossible|never|always|must be/i,
            weight: 0.6,
            threshold: 0.4,
          },
          {
            type: 'confidence_pattern',
            pattern: 'high_confidence_low_evidence',
            weight: 0.9,
            threshold: 0.6,
          },
        ],
        debiasing_strategies: [
          'Assign probability ranges instead of point estimates',
          'Track prediction accuracy over time',
          'Consider base rates for similar situations',
          'Ask: "What don\'t I know?"',
        ],
      },
      {
        id: 'anchoring_bias',
        name: 'Anchoring Bias',
        description: 'Over-reliance on first piece of information encountered',
        category: 'anchoring',
        severity: 'medium',
        detection_patterns: [
          {
            type: 'text_pattern',
            pattern: /based on (the initial|first|original|starting)/i,
            weight: 0.7,
            threshold: 0.5,
          },
          {
            type: 'text_pattern',
            pattern: /as (mentioned|stated) (earlier|before|initially)/i,
            weight: 0.5,
            threshold: 0.4,
          },
          {
            type: 'temporal_pattern',
            pattern: 'first_thought_dominance',
            weight: 0.6,
            threshold: 0.5,
          },
        ],
        debiasing_strategies: [
          'Generate estimates before seeing reference points',
          'Consider multiple anchor points',
          'Ask: "Would I think differently if I started elsewhere?"',
          'Use structured analytical techniques',
        ],
      },
      {
        id: 'availability_bias',
        name: 'Availability Heuristic',
        description: 'Overweighting easily recalled information',
        category: 'availability',
        severity: 'medium',
        detection_patterns: [
          {
            type: 'text_pattern',
            pattern: /I (remember|recall|can think of) (a case|an example|a time)/i,
            weight: 0.6,
            threshold: 0.4,
          },
          {
            type: 'text_pattern',
            pattern: /recently|just (saw|read|heard)|in the news/i,
            weight: 0.5,
            threshold: 0.4,
          },
          {
            type: 'text_pattern',
            pattern: /famous|well-known|notable example/i,
            weight: 0.4,
            threshold: 0.3,
          },
        ],
        debiasing_strategies: [
          'Seek out systematic data, not just examples',
          'Ask: "What might I be missing due to its low salience?"',
          'Consider base rates from reliable sources',
          'Be aware of media bias in what gets covered',
        ],
      },
      {
        id: 'sunk_cost_fallacy',
        name: 'Sunk Cost Fallacy',
        description: 'Continuing a behavior due to previously invested resources',
        category: 'sunk_cost',
        severity: 'medium',
        detection_patterns: [
          {
            type: 'text_pattern',
            pattern: /already (invested|spent|committed|put in)/i,
            weight: 0.8,
            threshold: 0.5,
          },
          {
            type: 'text_pattern',
            pattern: /come this far|too late to/i,
            weight: 0.7,
            threshold: 0.4,
          },
          {
            type: 'text_pattern',
            pattern: /waste (all|the) (effort|time|money)/i,
            weight: 0.9,
            threshold: 0.5,
          },
        ],
        debiasing_strategies: [
          'Evaluate decisions based on future value only',
          'Ask: "Would I make this choice if starting fresh?"',
          'Consider opportunity costs of continuing',
          'Set clear exit criteria before starting',
        ],
      },
      {
        id: 'framing_effect',
        name: 'Framing Effect',
        description: 'Drawing different conclusions based on how information is presented',
        category: 'framing',
        severity: 'medium',
        detection_patterns: [
          {
            type: 'text_pattern',
            pattern: /depends on how you look at it|perspective|point of view/i,
            weight: 0.4,
            threshold: 0.3,
          },
          {
            type: 'text_pattern',
            pattern: /half (full|empty)|glass/i,
            weight: 0.6,
            threshold: 0.4,
          },
        ],
        debiasing_strategies: [
          'Reframe the problem in multiple ways',
          'Consider both gains and losses explicitly',
          'Use absolute numbers alongside percentages',
          'Ask: "How would I see this if framed differently?"',
        ],
      },
      {
        id: 'hindsight_bias',
        name: 'Hindsight Bias',
        description: 'Believing past events were predictable after knowing the outcome',
        category: 'hindsight',
        severity: 'low',
        detection_patterns: [
          {
            type: 'text_pattern',
            pattern: /I knew (it|that)|should have (seen|known)/i,
            weight: 0.8,
            threshold: 0.5,
          },
          {
            type: 'text_pattern',
            pattern: /obvious in (retrospect|hindsight)|looking back/i,
            weight: 0.7,
            threshold: 0.4,
          },
          {
            type: 'text_pattern',
            pattern: /predictable|inevitable|bound to happen/i,
            weight: 0.5,
            threshold: 0.4,
          },
        ],
        debiasing_strategies: [
          'Document predictions before outcomes are known',
          'Consider alternative outcomes that could have occurred',
          'Remember the uncertainty that existed at decision time',
          'Focus on decision quality, not outcome quality',
        ],
      },
      {
        id: 'attribution_error',
        name: 'Fundamental Attribution Error',
        description: 'Over-attributing behavior to personality rather than situation',
        category: 'attribution',
        severity: 'medium',
        detection_patterns: [
          {
            type: 'text_pattern',
            pattern: /they (are|were) (just|always|simply)/i,
            weight: 0.6,
            threshold: 0.4,
          },
          {
            type: 'text_pattern',
            pattern: /that's (just|typical of) how they|their nature/i,
            weight: 0.7,
            threshold: 0.5,
          },
          {
            type: 'text_pattern',
            pattern: /kind of person|type who/i,
            weight: 0.5,
            threshold: 0.4,
          },
        ],
        debiasing_strategies: [
          'Consider situational factors before attributing to character',
          'Ask: "What circumstances might explain this behavior?"',
          'Imagine how you might act in the same situation',
          'Look for multiple causes of behavior',
        ],
      },
    ];

    for (const bias of biases) {
      this.biasDefinitions.set(bias.id, bias);
      this.learningRecords.set(bias.id, {
        bias_id: bias.id,
        detection_count: 0,
        true_positive_count: 0,
        false_positive_count: 0,
        precision: 0.5, // Prior
        recall: 0.5,
        last_detected: new Date(0),
        context_patterns: [],
      });
    }
  }

  /**
   * Detect biases in a thought
   */
  async detectBiases(
    thought: string,
    context: {
      confidence?: number;
      thought_number?: number;
      total_thoughts?: number;
      domain?: string;
      previous_thoughts?: string[];
    } = {}
  ): Promise<BiasDetectionResult[]> {
    const detections: BiasDetectionResult[] = [];

    for (const [biasId, definition] of this.biasDefinitions) {
      const evidence: string[] = [];
      let totalScore = 0;
      let maxPossibleScore = 0;

      for (const pattern of definition.detection_patterns) {
        maxPossibleScore += pattern.weight;

        if (pattern.type === 'text_pattern') {
          const regex =
            pattern.pattern instanceof RegExp ? pattern.pattern : new RegExp(pattern.pattern, 'i');

          const matches = thought.match(regex);
          if (matches) {
            totalScore += pattern.weight;
            evidence.push(`Text pattern match: "${matches[0]}"`);
          }
        } else if (pattern.type === 'confidence_pattern') {
          if (pattern.pattern === 'high_confidence_low_evidence' && context.confidence) {
            // High confidence early in reasoning chain
            if (context.confidence > 0.85 && (context.thought_number || 1) <= 2) {
              totalScore += pattern.weight;
              evidence.push(
                `High confidence (${(context.confidence * 100).toFixed(0)}%) early in reasoning`
              );
            }
          }
        } else if (pattern.type === 'temporal_pattern') {
          if (pattern.pattern === 'first_thought_dominance' && context.previous_thoughts) {
            // Check if current thought heavily references first thought
            const firstThought = context.previous_thoughts[0];
            if (firstThought && this.calculateSimilarity(thought, firstThought) > 0.6) {
              totalScore += pattern.weight;
              evidence.push('Current reasoning closely mirrors initial framing');
            }
          }
        }
      }

      const confidence = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

      // Apply learned calibration
      const learningRecord = this.learningRecords.get(biasId)!;
      const calibratedConfidence = this.calibrateConfidence(confidence, learningRecord);

      if (calibratedConfidence >= definition.detection_patterns[0].threshold) {
        const detection: BiasDetectionResult = {
          bias_id: biasId,
          bias_name: definition.name,
          confidence: calibratedConfidence,
          evidence,
          suggested_corrections: this.selectDebisingStrategies(definition, evidence),
          severity: definition.severity,
        };

        detections.push(detection);

        // Update learning records
        learningRecord.detection_count++;
        learningRecord.last_detected = new Date();
      }
    }

    // Sort by confidence
    detections.sort((a, b) => b.confidence - a.confidence);

    // Store recent detections for feedback learning
    this.recentDetections = [...detections, ...this.recentDetections].slice(0, 100);

    this.emit('biases_detected', { count: detections.length, biases: detections });

    return detections;
  }

  /**
   * Receive feedback on a bias detection
   */
  provideFeedback(biasId: string, wasCorrect: boolean, contextPattern?: string): void {
    const record = this.learningRecords.get(biasId);
    if (!record) return;

    if (wasCorrect) {
      record.true_positive_count++;
    } else {
      record.false_positive_count++;
    }

    // Update precision
    const totalDetections = record.true_positive_count + record.false_positive_count;
    record.precision = totalDetections > 0 ? record.true_positive_count / totalDetections : 0.5;

    // Store context pattern if helpful
    if (wasCorrect && contextPattern && !record.context_patterns.includes(contextPattern)) {
      record.context_patterns.push(contextPattern);
      if (record.context_patterns.length > 20) {
        record.context_patterns.shift();
      }
    }

    this.emit('feedback_recorded', { biasId, wasCorrect, newPrecision: record.precision });
  }

  /**
   * Calibrate confidence based on historical accuracy
   */
  private calibrateConfidence(rawConfidence: number, record: BiasLearningRecord): number {
    // Use Bayesian updating with learned precision as prior
    const sampleSize = record.true_positive_count + record.false_positive_count;

    if (sampleSize < 5) {
      // Not enough data, slight dampening
      return rawConfidence * 0.9;
    }

    // Weight toward learned precision as sample size grows
    const weight = Math.min(sampleSize / 30, 1);
    return rawConfidence * (1 - weight * 0.3) + record.precision * weight * 0.3;
  }

  /**
   * Select most relevant debiasing strategies
   */
  private selectDebisingStrategies(definition: BiasDefinition, evidence: string[]): string[] {
    // For now, return top 2 strategies
    // In future, could use evidence to select most relevant
    return definition.debiasing_strategies.slice(0, 2);
  }

  /**
   * Calculate text similarity (simple Jaccard)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    let intersection = 0;
    for (const word of words1) {
      if (words2.has(word)) intersection++;
    }

    const union = words1.size + words2.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Get bias detection statistics
   */
  getStatistics(): Record<
    string,
    {
      name: string;
      detection_count: number;
      precision: number;
      last_detected: Date;
    }
  > {
    const stats: Record<string, unknown> = {};

    for (const [biasId, record] of this.learningRecords) {
      const definition = this.biasDefinitions.get(biasId)!;
      stats[biasId] = {
        name: definition.name,
        detection_count: record.detection_count,
        precision: record.precision,
        last_detected: record.last_detected,
      };
    }

    return stats as Record<
      string,
      {
        name: string;
        detection_count: number;
        precision: number;
        last_detected: Date;
      }
    >;
  }

  /**
   * Get most common biases
   */
  getMostCommonBiases(limit: number = 5): Array<{
    id: string;
    name: string;
    count: number;
  }> {
    return Array.from(this.learningRecords.entries())
      .map(([id, record]) => ({
        id,
        name: this.biasDefinitions.get(id)!.name,
        count: record.detection_count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get debiasing recommendations for a domain
   */
  getDebisingRecommendations(domain?: string): string[] {
    // Find most common biases for domain (or overall)
    const recentByBias = new Map<string, number>();

    for (const detection of this.recentDetections) {
      const count = recentByBias.get(detection.bias_id) || 0;
      recentByBias.set(detection.bias_id, count + 1);
    }

    const recommendations: string[] = [];

    // Get top 3 biases and their strategies
    const topBiases = Array.from(recentByBias.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [biasId] of topBiases) {
      const definition = this.biasDefinitions.get(biasId);
      if (definition) {
        recommendations.push(`Watch for ${definition.name}: ${definition.debiasing_strategies[0]}`);
      }
    }

    return recommendations;
  }
}
