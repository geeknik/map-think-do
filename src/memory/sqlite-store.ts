/**
 * @fileoverview SQLite-based Persistent Memory Store
 *
 * Real persistent storage with:
 * - SQLite database for structured queries
 * - Outcome tracking and confidence calibration
 * - Cross-session learning
 * - Pattern recognition from historical data
 * - Performance analytics
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  MemoryStore,
  StoredThought,
  ReasoningSession,
  MemoryQuery,
  MemoryStats,
  MemoryConfig,
} from './memory-store.js';

export interface OutcomeRecord {
  id: string;
  thought_id: string;
  session_id: string;
  prediction: string;
  predicted_confidence: number;
  actual_outcome: 'success' | 'failure' | 'partial' | 'unknown';
  outcome_score: number; // 0-1
  feedback?: string;
  recorded_at: Date;
  domain?: string;
  context_hash?: string;
}

export interface ConfidenceCalibration {
  domain: string;
  predicted_bucket: string; // e.g., "0.7-0.8"
  actual_success_rate: number;
  sample_size: number;
  calibration_error: number; // difference between predicted and actual
  last_updated: Date;
}

export interface LearningPattern {
  id: string;
  pattern_type: string;
  pattern_signature: string;
  success_count: number;
  failure_count: number;
  success_rate: number;
  avg_confidence: number;
  domains: string[];
  first_seen: Date;
  last_seen: Date;
  insights: string[];
}

export class SQLiteStore extends MemoryStore {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string, _config: MemoryConfig = {}) {
    super();
    this.dbPath = dbPath;

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Thoughts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS thoughts (
        id TEXT PRIMARY KEY,
        thought TEXT NOT NULL,
        thought_number INTEGER NOT NULL,
        total_thoughts INTEGER NOT NULL,
        next_thought_needed INTEGER DEFAULT 1,
        is_revision INTEGER DEFAULT 0,
        revises_thought INTEGER,
        branch_from_thought INTEGER,
        branch_id TEXT,
        needs_more_thoughts INTEGER DEFAULT 0,
        timestamp TEXT NOT NULL,
        session_id TEXT NOT NULL,
        confidence REAL,
        domain TEXT,
        objective TEXT,
        complexity INTEGER,
        success INTEGER,
        effectiveness_score REAL,
        user_feedback TEXT,
        context TEXT,
        tags TEXT,
        patterns_detected TEXT,
        similar_thoughts TEXT,
        outcome_quality TEXT,
        output TEXT,
        context_trace TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        start_time TEXT NOT NULL,
        end_time TEXT,
        objective TEXT NOT NULL,
        domain TEXT,
        initial_complexity INTEGER,
        final_complexity INTEGER,
        goal_achieved INTEGER DEFAULT 0,
        confidence_level REAL DEFAULT 0.5,
        total_thoughts INTEGER DEFAULT 0,
        revision_count INTEGER DEFAULT 0,
        branch_count INTEGER DEFAULT 0,
        cognitive_roles_used TEXT,
        metacognitive_interventions INTEGER DEFAULT 0,
        effectiveness_score REAL,
        lessons_learned TEXT,
        successful_strategies TEXT,
        failed_approaches TEXT,
        tags TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Outcomes table for tracking predictions vs reality
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS outcomes (
        id TEXT PRIMARY KEY,
        thought_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        prediction TEXT,
        predicted_confidence REAL NOT NULL,
        actual_outcome TEXT NOT NULL,
        outcome_score REAL NOT NULL,
        feedback TEXT,
        recorded_at TEXT NOT NULL,
        domain TEXT,
        context_hash TEXT,
        FOREIGN KEY (thought_id) REFERENCES thoughts(id),
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    // Confidence calibration table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS confidence_calibration (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        predicted_bucket TEXT NOT NULL,
        actual_success_rate REAL NOT NULL,
        sample_size INTEGER NOT NULL,
        calibration_error REAL NOT NULL,
        last_updated TEXT NOT NULL,
        UNIQUE(domain, predicted_bucket)
      )
    `);

    // Learning patterns table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS learning_patterns (
        id TEXT PRIMARY KEY,
        pattern_type TEXT NOT NULL,
        pattern_signature TEXT NOT NULL,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0,
        avg_confidence REAL DEFAULT 0,
        domains TEXT,
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        insights TEXT,
        UNIQUE(pattern_type, pattern_signature)
      )
    `);

    // Create indexes for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_thoughts_session ON thoughts(session_id);
      CREATE INDEX IF NOT EXISTS idx_thoughts_domain ON thoughts(domain);
      CREATE INDEX IF NOT EXISTS idx_thoughts_timestamp ON thoughts(timestamp);
      CREATE INDEX IF NOT EXISTS idx_outcomes_thought ON outcomes(thought_id);
      CREATE INDEX IF NOT EXISTS idx_outcomes_domain ON outcomes(domain);
      CREATE INDEX IF NOT EXISTS idx_patterns_type ON learning_patterns(pattern_type);
    `);
  }

  // ============================================================================
  // Core MemoryStore Implementation
  // ============================================================================

  async storeThought(thought: StoredThought): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO thoughts (
        id, thought, thought_number, total_thoughts, next_thought_needed,
        is_revision, revises_thought, branch_from_thought, branch_id, needs_more_thoughts,
        timestamp, session_id, confidence, domain, objective, complexity,
        success, effectiveness_score, user_feedback, context, tags,
        patterns_detected, similar_thoughts, outcome_quality, output, context_trace
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      thought.id,
      thought.thought,
      thought.thought_number,
      thought.total_thoughts,
      thought.next_thought_needed ? 1 : 0,
      thought.is_revision ? 1 : 0,
      thought.revises_thought ?? null,
      thought.branch_from_thought ?? null,
      thought.branch_id ?? null,
      thought.needs_more_thoughts ? 1 : 0,
      thought.timestamp.toISOString(),
      thought.session_id,
      thought.confidence ?? null,
      thought.domain ?? null,
      thought.objective ?? null,
      thought.complexity ?? null,
      thought.success ? 1 : 0,
      thought.effectiveness_score ?? null,
      thought.user_feedback ?? null,
      JSON.stringify(thought.context || {}),
      JSON.stringify(thought.tags ?? []),
      JSON.stringify(thought.patterns_detected ?? []),
      JSON.stringify(thought.similar_thoughts ?? []),
      thought.outcome_quality ?? null,
      thought.output ?? null,
      JSON.stringify(thought.context_trace ?? [])
    );

    // Update session thought count
    this.db
      .prepare(
        `
      UPDATE sessions SET total_thoughts = total_thoughts + 1
      WHERE id = ?
    `
      )
      .run(thought.session_id);
  }

  async storeSession(session: ReasoningSession): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (
        id, start_time, end_time, objective, domain,
        initial_complexity, final_complexity, goal_achieved, confidence_level,
        total_thoughts, revision_count, branch_count, cognitive_roles_used,
        metacognitive_interventions, effectiveness_score, lessons_learned,
        successful_strategies, failed_approaches, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      session.id,
      session.start_time.toISOString(),
      session.end_time?.toISOString() ?? null,
      session.objective,
      session.domain ?? null,
      session.initial_complexity ?? null,
      session.final_complexity ?? null,
      session.goal_achieved ? 1 : 0,
      session.confidence_level,
      session.total_thoughts,
      session.revision_count,
      session.branch_count,
      JSON.stringify(session.cognitive_roles_used ?? []),
      session.metacognitive_interventions ?? 0,
      session.effectiveness_score ?? null,
      JSON.stringify(session.lessons_learned ?? []),
      JSON.stringify(session.successful_strategies ?? []),
      JSON.stringify(session.failed_approaches ?? []),
      JSON.stringify(session.tags ?? [])
    );
  }

  async queryThoughts(query: MemoryQuery): Promise<StoredThought[]> {
    let sql = 'SELECT * FROM thoughts WHERE 1=1';
    const params: unknown[] = [];

    if (query.domain) {
      sql += ' AND domain = ?';
      params.push(query.domain);
    }

    if (query.confidence_range) {
      sql += ' AND confidence >= ? AND confidence <= ?';
      params.push(query.confidence_range[0], query.confidence_range[1]);
    }

    if (query.success_only) {
      sql += ' AND success = 1';
    }

    if (query.session_ids && query.session_ids.length > 0) {
      sql += ` AND session_id IN (${query.session_ids.map(() => '?').join(',')})`;
      params.push(...query.session_ids);
    }

    if (query.time_range) {
      sql += ' AND timestamp >= ? AND timestamp <= ?';
      params.push(query.time_range[0].toISOString(), query.time_range[1].toISOString());
    }

    if (query.tags && query.tags.length > 0) {
      for (const tag of query.tags) {
        sql += ' AND tags LIKE ?';
        params.push(`%${tag}%`);
      }
    }

    sql += ' ORDER BY timestamp DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(this.rowToThought);
  }

  async getThought(id: string): Promise<StoredThought | null> {
    const row = this.db.prepare('SELECT * FROM thoughts WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.rowToThought(row) : null;
  }

  async getSession(id: string): Promise<ReasoningSession | null> {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.rowToSession(row) : null;
  }

  async getSessions(limit?: number, offset?: number): Promise<ReasoningSession[]> {
    let sql = 'SELECT * FROM sessions ORDER BY start_time DESC';
    const params: number[] = [];

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    if (offset) {
      sql += ' OFFSET ?';
      params.push(offset);
    }

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(this.rowToSession);
  }

  async findSimilarThoughts(thought: string, limit: number = 10): Promise<StoredThought[]> {
    // Use keyword-based similarity
    const keywords = this.extractKeywords(thought);
    if (keywords.length === 0) return [];

    const placeholders = keywords.map(() => 'thought LIKE ?').join(' OR ');
    const params = keywords.map(k => `%${k}%`);

    const sql = `
      SELECT *, (
        ${keywords.map(() => '(CASE WHEN thought LIKE ? THEN 1 ELSE 0 END)').join(' + ')}
      ) as match_score
      FROM thoughts
      WHERE ${placeholders}
      ORDER BY match_score DESC, timestamp DESC
      LIMIT ?
    `;

    const rows = this.db.prepare(sql).all(...params, ...params, limit) as Record<string, unknown>[];
    return rows.map(this.rowToThought);
  }

  async updateThought(id: string, updates: Partial<StoredThought>): Promise<void> {
    const existing = await this.getThought(id);
    if (!existing) return;

    const merged = { ...existing, ...updates };
    await this.storeThought(merged);
  }

  async updateSession(id: string, updates: Partial<ReasoningSession>): Promise<void> {
    const existing = await this.getSession(id);
    if (!existing) return;

    const merged = { ...existing, ...updates };
    await this.storeSession(merged);
  }

  async cleanupOldThoughts(olderThan: Date): Promise<number> {
    const result = this.db
      .prepare(
        `
      DELETE FROM thoughts WHERE timestamp < ?
    `
      )
      .run(olderThan.toISOString());

    return result.changes;
  }

  async getStats(): Promise<MemoryStats> {
    const thoughtCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM thoughts').get() as { count: number }
    ).count;
    const sessionCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number }
    ).count;
    const successCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM thoughts WHERE success = 1').get() as {
        count: number;
      }
    ).count;

    const domainStats = this.db
      .prepare(
        `
      SELECT domain, COUNT(*) as total, SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes
      FROM thoughts
      WHERE domain IS NOT NULL
      GROUP BY domain
    `
      )
      .all() as Array<{ domain: string; total: number; successes: number }>;

    const successRateByDomain: Record<string, number> = {};
    for (const stat of domainStats) {
      successRateByDomain[stat.domain] = stat.total > 0 ? stat.successes / stat.total : 0;
    }

    const oldest = this.db.prepare('SELECT MIN(timestamp) as ts FROM thoughts').get() as
      | { ts: string }
      | undefined;
    const newest = this.db.prepare('SELECT MAX(timestamp) as ts FROM thoughts').get() as
      | { ts: string }
      | undefined;

    return {
      total_thoughts: thoughtCount,
      total_sessions: sessionCount,
      average_session_length: sessionCount > 0 ? thoughtCount / sessionCount : 0,
      overall_success_rate: thoughtCount > 0 ? successCount / thoughtCount : 0,
      success_rate_by_domain: successRateByDomain,
      success_rate_by_complexity: {},
      most_effective_roles: [],
      most_effective_patterns: this.getMostEffectivePatterns(),
      common_failure_modes: this.getCommonFailureModes(),
      performance_over_time: [],
      learning_trajectory: this.getLearningTrajectory(),
      storage_size: this.getStorageSize(),
      oldest_thought: oldest?.ts ? new Date(oldest.ts) : new Date(),
      newest_thought: newest?.ts ? new Date(newest.ts) : new Date(),
      duplicate_rate: 0,
    };
  }

  async exportData(format: 'json' | 'csv' | 'jsonl'): Promise<string> {
    const thoughts = this.db.prepare('SELECT * FROM thoughts').all();
    const sessions = this.db.prepare('SELECT * FROM sessions').all();
    const outcomes = this.db.prepare('SELECT * FROM outcomes').all();
    const patterns = this.db.prepare('SELECT * FROM learning_patterns').all();

    if (format === 'json') {
      return JSON.stringify({ thoughts, sessions, outcomes, patterns }, null, 2);
    } else if (format === 'jsonl') {
      return [
        ...thoughts.map(t => JSON.stringify({ type: 'thought', data: t })),
        ...sessions.map(s => JSON.stringify({ type: 'session', data: s })),
        ...outcomes.map(o => JSON.stringify({ type: 'outcome', data: o })),
        ...patterns.map(p => JSON.stringify({ type: 'pattern', data: p })),
      ].join('\n');
    }
    return '';
  }

  async importData(data: string, format: 'json' | 'csv' | 'jsonl'): Promise<void> {
    if (format === 'json') {
      const parsed = JSON.parse(data);
      if (parsed.thoughts) {
        for (const t of parsed.thoughts) {
          await this.storeThought(this.rowToThought(t));
        }
      }
      if (parsed.sessions) {
        for (const s of parsed.sessions) {
          await this.storeSession(this.rowToSession(s));
        }
      }
    }
  }

  async optimize(): Promise<void> {
    this.db.exec('VACUUM');
    this.db.exec('ANALYZE');
  }

  async close(): Promise<void> {
    this.db.close();
  }

  // ============================================================================
  // Outcome Tracking - REAL Implementation
  // ============================================================================

  /**
   * Record an outcome for a thought/prediction
   */
  recordOutcome(outcome: OutcomeRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO outcomes (
        id, thought_id, session_id, prediction, predicted_confidence,
        actual_outcome, outcome_score, feedback, recorded_at, domain, context_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      outcome.id || crypto.randomUUID(),
      outcome.thought_id,
      outcome.session_id,
      outcome.prediction ?? null,
      outcome.predicted_confidence,
      outcome.actual_outcome,
      outcome.outcome_score,
      outcome.feedback ?? null,
      outcome.recorded_at.toISOString(),
      outcome.domain ?? null,
      outcome.context_hash ?? null
    );

    // Update thought success status
    this.db
      .prepare(
        `
      UPDATE thoughts SET success = ?, outcome_quality = ?
      WHERE id = ?
    `
      )
      .run(outcome.outcome_score >= 0.5 ? 1 : 0, outcome.actual_outcome, outcome.thought_id);

    // Update confidence calibration
    this.updateCalibration(outcome);

    // Update learning patterns
    this.updateLearningPatterns(outcome);
  }

  /**
   * Update confidence calibration based on outcome
   */
  private updateCalibration(outcome: OutcomeRecord): void {
    const domain = outcome.domain || 'general';
    const bucket = this.getConfidenceBucket(outcome.predicted_confidence);

    // Get existing calibration
    const existing = this.db
      .prepare(
        `
      SELECT * FROM confidence_calibration
      WHERE domain = ? AND predicted_bucket = ?
    `
      )
      .get(domain, bucket) as Record<string, unknown> | undefined;

    if (existing) {
      const newSampleSize = (existing.sample_size as number) + 1;
      const oldSuccessRate = existing.actual_success_rate as number;
      const success = outcome.outcome_score >= 0.5 ? 1 : 0;
      const newSuccessRate =
        (oldSuccessRate * (existing.sample_size as number) + success) / newSampleSize;
      const bucketMidpoint = this.getBucketMidpoint(bucket);
      const calibrationError = Math.abs(bucketMidpoint - newSuccessRate);

      this.db
        .prepare(
          `
        UPDATE confidence_calibration
        SET actual_success_rate = ?, sample_size = ?, calibration_error = ?, last_updated = ?
        WHERE domain = ? AND predicted_bucket = ?
      `
        )
        .run(
          newSuccessRate,
          newSampleSize,
          calibrationError,
          new Date().toISOString(),
          domain,
          bucket
        );
    } else {
      const success = outcome.outcome_score >= 0.5 ? 1 : 0;
      const bucketMidpoint = this.getBucketMidpoint(bucket);

      this.db
        .prepare(
          `
        INSERT INTO confidence_calibration
        (domain, predicted_bucket, actual_success_rate, sample_size, calibration_error, last_updated)
        VALUES (?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          domain,
          bucket,
          success,
          1,
          Math.abs(bucketMidpoint - success),
          new Date().toISOString()
        );
    }
  }

  /**
   * Get calibrated confidence based on historical data
   */
  getCalibratedConfidence(rawConfidence: number, domain: string = 'general'): number {
    const bucket = this.getConfidenceBucket(rawConfidence);

    const calibration = this.db
      .prepare(
        `
      SELECT * FROM confidence_calibration
      WHERE domain = ? AND predicted_bucket = ?
    `
      )
      .get(domain, bucket) as Record<string, unknown> | undefined;

    if (!calibration || (calibration.sample_size as number) < 5) {
      // Not enough data, return raw confidence with slight dampening
      return rawConfidence * 0.9;
    }

    // Blend raw confidence with calibrated rate
    const actualRate = calibration.actual_success_rate as number;
    const sampleSize = calibration.sample_size as number;
    const weight = Math.min(sampleSize / 50, 1); // Full weight at 50+ samples

    return rawConfidence * (1 - weight) + actualRate * weight;
  }

  /**
   * Get confidence adjustment for a domain based on calibration error
   */
  getConfidenceAdjustment(domain: string = 'general'): number {
    const calibrations = this.db
      .prepare(
        `
      SELECT * FROM confidence_calibration
      WHERE domain = ?
    `
      )
      .all(domain) as Record<string, unknown>[];

    if (calibrations.length === 0) return 0;

    // Calculate weighted average calibration error
    const totalSamples = calibrations.reduce((sum, c) => sum + (c.sample_size as number), 0);
    const weightedError = calibrations.reduce((sum, c) => {
      return sum + (c.calibration_error as number) * (c.sample_size as number);
    }, 0);

    return totalSamples > 0 ? weightedError / totalSamples : 0;
  }

  private getConfidenceBucket(confidence: number): string {
    const lower = Math.floor(confidence * 10) / 10;
    const upper = lower + 0.1;
    return `${lower.toFixed(1)}-${upper.toFixed(1)}`;
  }

  private getBucketMidpoint(bucket: string): number {
    const [lower, upper] = bucket.split('-').map(parseFloat);
    return (lower + upper) / 2;
  }

  // ============================================================================
  // Learning Patterns - REAL Implementation
  // ============================================================================

  private updateLearningPatterns(outcome: OutcomeRecord): void {
    const thought = this.db
      .prepare('SELECT * FROM thoughts WHERE id = ?')
      .get(outcome.thought_id) as Record<string, unknown> | undefined;
    if (!thought) return;

    const patterns = this.extractPatterns(thought.thought as string);

    for (const pattern of patterns) {
      const existing = this.db
        .prepare(
          `
        SELECT * FROM learning_patterns
        WHERE pattern_type = ? AND pattern_signature = ?
      `
        )
        .get(pattern.type, pattern.signature) as Record<string, unknown> | undefined;

      const success = outcome.outcome_score >= 0.5;
      const domain = outcome.domain || 'general';

      if (existing) {
        const newSuccessCount = (existing.success_count as number) + (success ? 1 : 0);
        const newFailureCount = (existing.failure_count as number) + (success ? 0 : 1);
        const total = newSuccessCount + newFailureCount;
        const newSuccessRate = newSuccessCount / total;

        const domains = JSON.parse((existing.domains as string) || '[]');
        if (!domains.includes(domain)) {
          domains.push(domain);
        }

        this.db
          .prepare(
            `
          UPDATE learning_patterns
          SET success_count = ?, failure_count = ?, success_rate = ?,
              domains = ?, last_seen = ?
          WHERE pattern_type = ? AND pattern_signature = ?
        `
          )
          .run(
            newSuccessCount,
            newFailureCount,
            newSuccessRate,
            JSON.stringify(domains),
            new Date().toISOString(),
            pattern.type,
            pattern.signature
          );
      } else {
        this.db
          .prepare(
            `
          INSERT INTO learning_patterns
          (id, pattern_type, pattern_signature, success_count, failure_count,
           success_rate, avg_confidence, domains, first_seen, last_seen, insights)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .run(
            crypto.randomUUID(),
            pattern.type,
            pattern.signature,
            success ? 1 : 0,
            success ? 0 : 1,
            success ? 1 : 0,
            outcome.predicted_confidence,
            JSON.stringify([domain]),
            new Date().toISOString(),
            new Date().toISOString(),
            '[]'
          );
      }
    }
  }

  private extractPatterns(thought: string): Array<{ type: string; signature: string }> {
    const patterns: Array<{ type: string; signature: string }> = [];

    // Extract reasoning patterns
    const reasoningPatterns = [
      { regex: /if\s+.+\s+then/i, type: 'conditional_reasoning' },
      { regex: /because|therefore|thus|hence/i, type: 'causal_reasoning' },
      { regex: /compare|contrast|versus|vs\./i, type: 'comparative_analysis' },
      { regex: /step\s+\d|first|second|third|finally/i, type: 'sequential_reasoning' },
      { regex: /assume|assumption|given that/i, type: 'assumption_based' },
      { regex: /what if|suppose|imagine/i, type: 'hypothetical_reasoning' },
      { regex: /analyze|examine|investigate/i, type: 'analytical' },
      { regex: /create|design|build|implement/i, type: 'constructive' },
    ];

    for (const { regex, type } of reasoningPatterns) {
      if (regex.test(thought)) {
        const match = thought.match(regex);
        patterns.push({
          type,
          signature: match ? match[0].toLowerCase().slice(0, 20) : type,
        });
      }
    }

    // Extract structural patterns based on length and complexity
    const wordCount = thought.split(/\s+/).length;
    if (wordCount > 100) {
      patterns.push({ type: 'long_form', signature: 'extended_reasoning' });
    }
    if (thought.includes('?')) {
      patterns.push({ type: 'questioning', signature: 'inquiry_based' });
    }

    return patterns;
  }

  /**
   * Get success patterns for a domain
   */
  getSuccessPatterns(domain?: string, minSuccessRate: number = 0.7): LearningPattern[] {
    let sql = `
      SELECT * FROM learning_patterns
      WHERE success_rate >= ? AND (success_count + failure_count) >= 3
    `;
    const params: unknown[] = [minSuccessRate];

    if (domain) {
      sql += ` AND domains LIKE ?`;
      params.push(`%${domain}%`);
    }

    sql += ' ORDER BY success_rate DESC, success_count DESC LIMIT 10';

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(this.rowToPattern);
  }

  /**
   * Get failure patterns to avoid
   */
  getFailurePatterns(domain?: string, maxSuccessRate: number = 0.3): LearningPattern[] {
    let sql = `
      SELECT * FROM learning_patterns
      WHERE success_rate <= ? AND (success_count + failure_count) >= 3
    `;
    const params: unknown[] = [maxSuccessRate];

    if (domain) {
      sql += ` AND domains LIKE ?`;
      params.push(`%${domain}%`);
    }

    sql += ' ORDER BY success_rate ASC, failure_count DESC LIMIT 10';

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    return rows.map(this.rowToPattern);
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  private getMostEffectivePatterns(): Array<{ pattern: string; frequency: number }> {
    const patterns = this.db
      .prepare(
        `
      SELECT pattern_type, pattern_signature, success_rate, success_count
      FROM learning_patterns
      WHERE success_rate >= 0.7 AND (success_count + failure_count) >= 5
      ORDER BY success_rate DESC, success_count DESC
      LIMIT 5
    `
      )
      .all() as Array<{
      pattern_type: string;
      pattern_signature: string;
      success_rate: number;
      success_count: number;
    }>;

    return patterns.map(p => ({
      pattern: `${p.pattern_type}: ${p.pattern_signature}`,
      frequency: p.success_count,
    }));
  }

  private getCommonFailureModes(): Array<{ mode: string; frequency: number }> {
    const patterns = this.db
      .prepare(
        `
      SELECT pattern_type, pattern_signature, success_rate, failure_count
      FROM learning_patterns
      WHERE success_rate <= 0.3 AND failure_count >= 3
      ORDER BY failure_count DESC
      LIMIT 5
    `
      )
      .all() as Array<{
      pattern_type: string;
      pattern_signature: string;
      success_rate: number;
      failure_count: number;
    }>;

    return patterns.map(p => ({
      mode: `${p.pattern_type}: ${p.pattern_signature}`,
      frequency: p.failure_count,
    }));
  }

  private getLearningTrajectory(): Array<{ period: string; avg_effectiveness: number }> {
    // Get success rates over time buckets
    const results = this.db
      .prepare(
        `
      SELECT
        strftime('%Y-%m-%d', timestamp) as date,
        AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate
      FROM thoughts
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `
      )
      .all() as Array<{ date: string; success_rate: number }>;

    return results
      .map(r => ({
        period: r.date,
        avg_effectiveness: r.success_rate,
      }))
      .reverse();
  }

  private getStorageSize(): number {
    try {
      const stats = fs.statSync(this.dbPath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private rowToThought(row: Record<string, unknown>): StoredThought {
    return {
      id: row.id as string,
      thought: row.thought as string,
      thought_number: row.thought_number as number,
      total_thoughts: row.total_thoughts as number,
      next_thought_needed: row.next_thought_needed === 1,
      is_revision: row.is_revision === 1,
      revises_thought: row.revises_thought as number | undefined,
      branch_from_thought: row.branch_from_thought as number | undefined,
      branch_id: row.branch_id as string | undefined,
      needs_more_thoughts: row.needs_more_thoughts === 1,
      timestamp: new Date(row.timestamp as string),
      session_id: row.session_id as string,
      confidence: row.confidence as number | undefined,
      domain: row.domain as string | undefined,
      objective: row.objective as string | undefined,
      complexity: row.complexity as number | undefined,
      success: row.success === 1,
      effectiveness_score: row.effectiveness_score as number | undefined,
      user_feedback: row.user_feedback as string | undefined,
      context: JSON.parse((row.context as string) || '{}'),
      tags: JSON.parse((row.tags as string) || '[]'),
      patterns_detected: JSON.parse((row.patterns_detected as string) || '[]'),
      similar_thoughts: JSON.parse((row.similar_thoughts as string) || '[]'),
      outcome_quality: row.outcome_quality as 'excellent' | 'good' | 'fair' | 'poor' | undefined,
      output: row.output as string | undefined,
      context_trace: JSON.parse((row.context_trace as string) || '[]'),
    };
  }

  private rowToSession(row: Record<string, unknown>): ReasoningSession {
    return {
      id: row.id as string,
      start_time: new Date(row.start_time as string),
      end_time: row.end_time ? new Date(row.end_time as string) : undefined,
      objective: row.objective as string,
      domain: row.domain as string | undefined,
      initial_complexity: row.initial_complexity as number | undefined,
      final_complexity: row.final_complexity as number | undefined,
      goal_achieved: row.goal_achieved === 1,
      confidence_level: row.confidence_level as number,
      total_thoughts: row.total_thoughts as number,
      revision_count: row.revision_count as number,
      branch_count: row.branch_count as number,
      cognitive_roles_used: JSON.parse((row.cognitive_roles_used as string) || '[]'),
      metacognitive_interventions: row.metacognitive_interventions as number | undefined,
      effectiveness_score: row.effectiveness_score as number | undefined,
      lessons_learned: JSON.parse((row.lessons_learned as string) || '[]'),
      successful_strategies: JSON.parse((row.successful_strategies as string) || '[]'),
      failed_approaches: JSON.parse((row.failed_approaches as string) || '[]'),
      tags: JSON.parse((row.tags as string) || '[]'),
    };
  }

  private rowToPattern(row: Record<string, unknown>): LearningPattern {
    return {
      id: row.id as string,
      pattern_type: row.pattern_type as string,
      pattern_signature: row.pattern_signature as string,
      success_count: row.success_count as number,
      failure_count: row.failure_count as number,
      success_rate: row.success_rate as number,
      avg_confidence: row.avg_confidence as number,
      domains: JSON.parse((row.domains as string) || '[]'),
      first_seen: new Date(row.first_seen as string),
      last_seen: new Date(row.last_seen as string),
      insights: JSON.parse((row.insights as string) || '[]'),
    };
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.stopWords.has(word))
      .slice(0, 10);
  }

  // ============================================================================
  // Intelligent Memory Retrieval - NEW
  // ============================================================================

  private readonly stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'that',
    'which',
    'who',
    'whom',
    'this',
    'these',
    'those',
    'it',
    'its',
    'i',
    'me',
    'my',
    'we',
    'you',
    'your',
    'they',
    'them',
    'their',
    'what',
    'when',
    'where',
    'how',
    'why',
    'can',
    'just',
    'more',
    'some',
    'any',
    'each',
    'every',
    'both',
    'few',
    'most',
    'other',
    'into',
    'over',
    'such',
    'than',
    'then',
    'only',
    'also',
    'back',
    'after',
    'use',
    'way',
    'even',
    'new',
    'want',
    'because',
    'good',
    'give',
  ]);

  // TF-IDF document frequency cache
  private documentFrequency = new Map<string, number>();
  private totalDocuments = 0;
  private idfCacheValid = false;

  /**
   * Build TF-IDF index for intelligent search
   */
  private buildTFIDFIndex(): void {
    if (this.idfCacheValid) return;

    const allThoughts = this.db.prepare('SELECT thought FROM thoughts').all() as Array<{
      thought: string;
    }>;
    this.totalDocuments = allThoughts.length;
    this.documentFrequency.clear();

    for (const { thought } of allThoughts) {
      const terms = new Set(this.tokenize(thought));
      for (const term of terms) {
        this.documentFrequency.set(term, (this.documentFrequency.get(term) || 0) + 1);
      }
    }

    this.idfCacheValid = true;
  }

  /**
   * Tokenize text for TF-IDF
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.has(word));
  }

  /**
   * Calculate TF-IDF score for a term in a document
   */
  private calculateTFIDF(term: string, document: string): number {
    const tokens = this.tokenize(document);
    const termCount = tokens.filter(t => t === term).length;
    const tf = termCount / Math.max(1, tokens.length);

    const df = this.documentFrequency.get(term) || 1;
    const idf = Math.log((this.totalDocuments + 1) / (df + 1)) + 1;

    return tf * idf;
  }

  /**
   * Calculate document similarity using TF-IDF cosine similarity
   */
  private calculateTFIDFSimilarity(query: string, document: string): number {
    const queryTerms = this.tokenize(query);
    const docTerms = this.tokenize(document);

    if (queryTerms.length === 0 || docTerms.length === 0) return 0;

    // Build term vectors
    const allTerms = new Set([...queryTerms, ...docTerms]);
    let dotProduct = 0;
    let queryMagnitude = 0;
    let docMagnitude = 0;

    for (const term of allTerms) {
      const queryTF = queryTerms.filter(t => t === term).length / queryTerms.length;
      const docTFIDF = this.calculateTFIDF(term, document);

      dotProduct += queryTF * docTFIDF;
      queryMagnitude += queryTF * queryTF;
      docMagnitude += docTFIDF * docTFIDF;
    }

    const magnitude = Math.sqrt(queryMagnitude) * Math.sqrt(docMagnitude);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Intelligent semantic search using TF-IDF
   */
  async intelligentSearch(
    query: string,
    options: {
      limit?: number;
      domain?: string;
      minSimilarity?: number;
      recencyWeight?: number;
      successWeight?: number;
    } = {}
  ): Promise<
    Array<StoredThought & { relevance_score: number; relevance_breakdown: Record<string, number> }>
  > {
    const {
      limit = 10,
      domain,
      minSimilarity = 0.1,
      recencyWeight = 0.2,
      successWeight = 0.3,
    } = options;

    // Ensure TF-IDF index is built
    this.buildTFIDFIndex();

    // Get candidate thoughts
    let sql = 'SELECT * FROM thoughts WHERE 1=1';
    const params: unknown[] = [];

    if (domain) {
      sql += ' AND domain = ?';
      params.push(domain);
    }

    sql += ' ORDER BY timestamp DESC LIMIT 1000'; // Limit search space

    const candidates = this.db.prepare(sql).all(...params) as Record<string, unknown>[];

    // Score each candidate
    const scored: Array<{
      thought: StoredThought;
      similarity: number;
      recency: number;
      success: number;
      combined: number;
    }> = [];

    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const row of candidates) {
      const thought = this.rowToThought(row);
      const similarity = this.calculateTFIDFSimilarity(query, thought.thought);

      if (similarity < minSimilarity) continue;

      // Recency score (exponential decay)
      const age = now - new Date(thought.timestamp).getTime();
      const recency = Math.exp(-age / maxAge);

      // Success score
      const success = thought.success ? 1 : 0;

      // Combined score with weights
      const contentWeight = 1 - recencyWeight - successWeight;
      const combined =
        similarity * contentWeight + recency * recencyWeight + success * successWeight;

      scored.push({ thought, similarity, recency, success, combined });
    }

    // Sort by combined score and take top results
    scored.sort((a, b) => b.combined - a.combined);

    return scored.slice(0, limit).map(s => ({
      ...s.thought,
      relevance_score: s.combined,
      relevance_breakdown: {
        content_similarity: s.similarity,
        recency_score: s.recency,
        success_factor: s.success,
      },
    }));
  }

  /**
   * Context-aware retrieval - finds thoughts relevant to current reasoning context
   */
  async contextAwareRetrieval(
    context: {
      current_thought?: string;
      domain?: string;
      complexity?: number;
      objective?: string;
      recent_thoughts?: string[];
    },
    limit: number = 5
  ): Promise<StoredThought[]> {
    this.buildTFIDFIndex();

    // Build composite query from context
    const queryParts: string[] = [];

    if (context.current_thought) {
      queryParts.push(context.current_thought);
    }
    if (context.objective) {
      queryParts.push(context.objective);
    }
    if (context.recent_thoughts) {
      queryParts.push(...context.recent_thoughts.slice(-3));
    }

    const query = queryParts.join(' ');
    if (!query) return [];

    // Get similar thoughts with domain and complexity boost
    let sql = 'SELECT * FROM thoughts WHERE 1=1';
    const params: unknown[] = [];

    if (context.domain) {
      sql += ' AND (domain = ? OR domain IS NULL)';
      params.push(context.domain);
    }

    sql += ' ORDER BY timestamp DESC LIMIT 500';

    const candidates = this.db.prepare(sql).all(...params) as Record<string, unknown>[];

    const scored: Array<{ thought: StoredThought; score: number }> = [];

    for (const row of candidates) {
      const thought = this.rowToThought(row);
      let score = this.calculateTFIDFSimilarity(query, thought.thought);

      // Boost for same domain
      if (context.domain && thought.domain === context.domain) {
        score *= 1.3;
      }

      // Boost for similar complexity
      if (context.complexity !== undefined && thought.complexity !== undefined) {
        const complexityDiff = Math.abs(context.complexity - thought.complexity);
        score *= Math.max(0.5, 1 - complexityDiff / 10);
      }

      // Boost for successful thoughts
      if (thought.success) {
        score *= 1.2;
      }

      scored.push({ thought, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.thought);
  }

  /**
   * Find analogous problems - searches for structurally similar reasoning
   */
  async findAnalogousProblems(
    problem: {
      description: string;
      domain?: string;
      type?: 'analysis' | 'synthesis' | 'evaluation' | 'debugging' | 'design';
    },
    limit: number = 5
  ): Promise<
    Array<{
      session: ReasoningSession;
      similarity: number;
      transferable_insights: string[];
    }>
  > {
    this.buildTFIDFIndex();

    // Get successful sessions with high effectiveness
    const sessions = this.db
      .prepare(
        `
      SELECT * FROM sessions 
      WHERE goal_achieved = 1 AND effectiveness_score > 0.6
      ORDER BY effectiveness_score DESC
      LIMIT 100
    `
      )
      .all() as Record<string, unknown>[];

    const results: Array<{
      session: ReasoningSession;
      similarity: number;
      transferable_insights: string[];
    }> = [];

    for (const sessionRow of sessions) {
      const session = this.rowToSession(sessionRow);

      // Get thoughts from this session
      const thoughts = this.db
        .prepare(
          `
        SELECT thought FROM thoughts 
        WHERE session_id = ?
        ORDER BY thought_number
      `
        )
        .all(session.id) as Array<{ thought: string }>;

      const sessionText = thoughts.map(t => t.thought).join(' ');
      let similarity = this.calculateTFIDFSimilarity(problem.description, sessionText);

      // Boost for same domain
      if (problem.domain && session.domain === problem.domain) {
        similarity *= 1.4;
      }

      if (similarity < 0.1) continue;

      // Extract transferable insights
      const insights: string[] = [];
      if (session.lessons_learned && session.lessons_learned.length > 0) {
        insights.push(...session.lessons_learned.slice(0, 3));
      }
      if (session.successful_strategies && session.successful_strategies.length > 0) {
        insights.push(...session.successful_strategies.slice(0, 2));
      }

      results.push({ session, similarity, transferable_insights: insights });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  /**
   * Retrieve thoughts by reasoning pattern
   */
  async findByPattern(
    pattern: string,
    options: {
      domain?: string;
      minSuccessRate?: number;
      limit?: number;
    } = {}
  ): Promise<StoredThought[]> {
    const { domain, minSuccessRate = 0.5, limit = 20 } = options;

    // Get thoughts with the specified pattern
    let sql = `
      SELECT t.* FROM thoughts t
      WHERE t.patterns_detected LIKE ?
    `;
    const params: unknown[] = [`%${pattern}%`];

    if (domain) {
      sql += ' AND t.domain = ?';
      params.push(domain);
    }

    sql += ' ORDER BY t.timestamp DESC LIMIT ?';
    params.push(limit * 2); // Get more to filter by success

    const rows = this.db.prepare(sql).all(...params) as Record<string, unknown>[];
    const thoughts = rows.map(this.rowToThought);

    // Filter by success rate if we have enough data
    if (thoughts.length > 5) {
      const successRate = thoughts.filter(t => t.success).length / thoughts.length;
      if (successRate >= minSuccessRate) {
        return thoughts.filter(t => t.success).slice(0, limit);
      }
    }

    return thoughts.slice(0, limit);
  }

  /**
   * Get thoughts that led to breakthroughs
   */
  async getBreakthroughThoughts(
    domain?: string,
    limit: number = 10
  ): Promise<Array<StoredThought & { session_effectiveness: number }>> {
    let sql = `
      SELECT t.*, s.effectiveness_score as session_effectiveness
      FROM thoughts t
      JOIN sessions s ON t.session_id = s.id
      WHERE s.goal_achieved = 1 
        AND s.effectiveness_score >= 0.8
        AND t.success = 1
    `;
    const params: unknown[] = [];

    if (domain) {
      sql += ' AND t.domain = ?';
      params.push(domain);
    }

    sql += ' ORDER BY s.effectiveness_score DESC, t.confidence DESC LIMIT ?';
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as Array<Record<string, unknown>>;

    return rows.map(row => ({
      ...this.rowToThought(row),
      session_effectiveness: row.session_effectiveness as number,
    }));
  }

  /**
   * Invalidate TF-IDF cache when new data is added
   */
  private invalidateTFIDFCache(): void {
    this.idfCacheValid = false;
  }

  // Override storeThought to invalidate cache
  async storeThoughtWithCacheInvalidation(thought: StoredThought): Promise<void> {
    await this.storeThought(thought);
    this.invalidateTFIDFCache();
  }

  /**
   * Get retrieval quality metrics
   */
  getRetrievalMetrics(): {
    indexed_documents: number;
    vocabulary_size: number;
    avg_document_length: number;
    cache_valid: boolean;
  } {
    const docCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM thoughts').get() as { count: number }
    ).count;

    let avgLength = 0;
    if (docCount > 0) {
      const result = this.db.prepare('SELECT AVG(LENGTH(thought)) as avg FROM thoughts').get() as {
        avg: number;
      };
      avgLength = result.avg || 0;
    }

    return {
      indexed_documents: this.totalDocuments,
      vocabulary_size: this.documentFrequency.size,
      avg_document_length: avgLength,
      cache_valid: this.idfCacheValid,
    };
  }
}
