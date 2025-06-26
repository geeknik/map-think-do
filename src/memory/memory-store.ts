/**
 * @fileoverview Memory store interface and types for persistent thought storage
 * 
 * This provides the foundation for AGI-like memory capabilities, enabling the
 * system to persist, query, and learn from its reasoning history. Essential
 * for building cognitive experience and pattern recognition over time.
 */

/**
 * Extended thought record with additional metadata for memory storage
 */
export interface StoredThought {
  // Core thought data
  id: string;
  thought: string;
  thought_number: number;
  total_thoughts: number;
  next_thought_needed: boolean;
  
  // Branching and revision metadata
  is_revision?: boolean;
  revises_thought?: number;
  branch_from_thought?: number;
  branch_id?: string;
  needs_more_thoughts?: boolean;
  
  // Memory-specific metadata
  timestamp: Date;
  session_id: string;
  confidence?: number;
  domain?: string;
  objective?: string;
  complexity?: number;
  
  // Outcome tracking
  success?: boolean;
  effectiveness_score?: number;
  user_feedback?: string;
  
  // Context information
  context: {
    available_tools?: string[];
    time_constraints?: {
      urgency: 'low' | 'medium' | 'high';
      deadline?: Date;
    };
    problem_type?: string;
    cognitive_load?: number;
  };
  
  // Learning metadata
  tags?: string[];
  patterns_detected?: string[];
  similar_thoughts?: string[]; // IDs of similar thoughts
  outcome_quality?: 'excellent' | 'good' | 'fair' | 'poor';

  // Output for reflection
  output?: string;
  context_trace?: string[];
}

/**
 * Reasoning session containing multiple related thoughts
 */
export interface ReasoningSession {
  id: string;
  start_time: Date;
  end_time?: Date;
  objective: string;
  domain?: string;
  initial_complexity?: number;
  final_complexity?: number;
  
  // Session outcomes
  goal_achieved: boolean;
  confidence_level: number;
  total_thoughts: number;
  revision_count: number;
  branch_count: number;
  
  // Session patterns
  cognitive_roles_used?: string[];
  metacognitive_interventions?: number;
  effectiveness_score?: number;
  
  // Learning insights
  lessons_learned?: string[];
  successful_strategies?: string[];
  failed_approaches?: string[];
  
  tags?: string[];
}

/**
 * Memory query parameters for retrieving relevant thoughts
 */
export interface MemoryQuery {
  // Content-based queries
  text_similarity?: string;
  domain?: string;
  objective_similarity?: string;
  
  // Metadata filters
  confidence_range?: [number, number];
  complexity_range?: [number, number];
  time_range?: [Date, Date];
  session_ids?: string[];
  
  // Outcome filters
  success_only?: boolean;
  effectiveness_threshold?: number;
  
  // Pattern matching
  tags?: string[];
  patterns?: string[];
  cognitive_roles?: string[];
  
  // Similarity search
  similar_to_thought?: string; // Thought ID for similarity search
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Sorting
  sort_by?: 'timestamp' | 'confidence' | 'effectiveness' | 'similarity';
  sort_order?: 'asc' | 'desc';
}

/**
 * Memory statistics for analysis and optimization
 */
export interface MemoryStats {
  total_thoughts: number;
  total_sessions: number;
  average_session_length: number;
  
  // Success metrics
  overall_success_rate: number;
  success_rate_by_domain: Record<string, number>;
  success_rate_by_complexity: Record<string, number>;
  
  // Cognitive patterns
  most_effective_roles: Array<{ role: string; success_rate: number }>;
  most_effective_patterns: Array<{ pattern: string; frequency: number }>;
  common_failure_modes: Array<{ mode: string; frequency: number }>;
  
  // Temporal patterns
  performance_over_time: Array<{ period: string; success_rate: number }>;
  learning_trajectory: Array<{ period: string; avg_effectiveness: number }>;
  
  // Memory health
  storage_size: number;
  oldest_thought: Date;
  newest_thought: Date;
  duplicate_rate: number;
}

/**
 * Abstract interface for memory storage implementations
 */
export abstract class MemoryStore {
  /**
   * Store a thought in memory
   */
  abstract storeThought(thought: StoredThought): Promise<void>;
  
  /**
   * Store a complete reasoning session
   */
  abstract storeSession(session: ReasoningSession): Promise<void>;
  
  /**
   * Query thoughts based on criteria
   */
  abstract queryThoughts(query: MemoryQuery): Promise<StoredThought[]>;
  
  /**
   * Get a specific thought by ID
   */
  abstract getThought(id: string): Promise<StoredThought | null>;
  
  /**
   * Get a specific session by ID
   */
  abstract getSession(id: string): Promise<ReasoningSession | null>;
  
  /**
   * Get all sessions
   */
  abstract getSessions(limit?: number, offset?: number): Promise<ReasoningSession[]>;
  
  /**
   * Find similar thoughts using content similarity
   */
  abstract findSimilarThoughts(thought: string, limit?: number): Promise<StoredThought[]>;
  
  /**
   * Update thought metadata (e.g., after receiving feedback)
   */
  abstract updateThought(id: string, updates: Partial<StoredThought>): Promise<void>;
  
  /**
   * Update session metadata
   */
  abstract updateSession(id: string, updates: Partial<ReasoningSession>): Promise<void>;
  
  /**
   * Delete old thoughts based on retention policy
   */
  abstract cleanupOldThoughts(olderThan: Date): Promise<number>;
  
  /**
   * Get memory statistics
   */
  abstract getStats(): Promise<MemoryStats>;
  
  /**
   * Export memory data for backup or analysis
   */
  abstract exportData(format: 'json' | 'csv' | 'jsonl'): Promise<string>;
  
  /**
   * Import memory data from backup
   */
  abstract importData(data: string, format: 'json' | 'csv' | 'jsonl'): Promise<void>;
  
  /**
   * Optimize storage (e.g., rebuild indexes, compress data)
   */
  abstract optimize(): Promise<void>;
  
  /**
   * Close the memory store and cleanup resources
   */
  abstract close(): Promise<void>;
}

/**
 * Memory configuration options
 */
export interface MemoryConfig {
  // Storage settings
  maxThoughts?: number;
  maxSessions?: number;
  retentionDays?: number;
  
  // Performance settings
  similarityThreshold?: number;
  indexingEnabled?: boolean;
  compressionEnabled?: boolean;
  
  // Learning settings
  adaptiveLearning?: boolean;
  patternDetectionEnabled?: boolean;
  automaticTagging?: boolean;
  
  // Privacy settings
  anonymizeData?: boolean;
  encryptSensitiveData?: boolean;
  
  // Backup settings
  autoBackup?: boolean;
  backupInterval?: number; // hours
  backupLocation?: string;
}

/**
 * Memory event for observing memory operations
 */
export interface MemoryEvent {
  type: 'thought_stored' | 'session_stored' | 'query_executed' | 'cleanup_performed';
  timestamp: Date;
  data: any;
  performance?: {
    duration_ms: number;
    memory_used: number;
  };
}

/**
 * Memory observer interface for monitoring memory operations
 */
export interface MemoryObserver {
  onMemoryEvent(event: MemoryEvent): void;
}

/**
 * Utility functions for memory operations
 */
export class MemoryUtils {
  /**
   * Generate a unique thought ID
   */
  static generateThoughtId(): string {
    return `thought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate a unique session ID
   */
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Calculate text similarity (simplified implementation)
   */
  static calculateSimilarity(text1: string, text2: string): number {
    // Simplified Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Extract keywords from text for tagging
   */
  static extractKeywords(text: string): string[] {
    // Simple keyword extraction - in practice would use more sophisticated NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    // Return most frequent words
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
  
  /**
   * Check if word is a stop word
   */
  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these',
      'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
      'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his',
      'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
      'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
      'who', 'whom', 'whose', 'this', 'that', 'these', 'those', 'am', 'is',
      'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'shall'
    ]);
    
    return stopWords.has(word);
  }
  
  /**
   * Validate memory configuration
   */
  static validateConfig(config: MemoryConfig): string[] {
    const errors: string[] = [];
    
    if (config.maxThoughts !== undefined && config.maxThoughts <= 0) {
      errors.push('maxThoughts must be positive');
    }
    
    if (config.maxSessions !== undefined && config.maxSessions <= 0) {
      errors.push('maxSessions must be positive');
    }
    
    if (config.retentionDays !== undefined && config.retentionDays <= 0) {
      errors.push('retentionDays must be positive');
    }
    
    if (config.similarityThreshold !== undefined && 
        (config.similarityThreshold < 0 || config.similarityThreshold > 1)) {
      errors.push('similarityThreshold must be between 0 and 1');
    }
    
    return errors;
  }
} 