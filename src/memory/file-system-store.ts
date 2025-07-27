import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  MemoryStore,
  StoredThought,
  ReasoningSession,
  MemoryQuery,
  MemoryStats,
  MemoryConfig,
} from './memory-store.js';

/**
 * File system based implementation of MemoryStore.
 *
 * Data is persisted as JSON files inside a configurable directory. When
 * `encryptSensitiveData` is enabled, files are transparently encrypted using
 * AES-256-GCM with a key derived from the `MEMORY_STORE_KEY` environment
 * variable. This avoids storing secrets directly in code while still allowing
 * secure at-rest encryption.
 */
export class FileSystemStore extends MemoryStore {
  private basePath: string;
  private thoughtPath: string;
  private sessionPath: string;
  private encrypt: boolean;
  private key: Buffer;

  constructor(basePath: string, config: MemoryConfig = {}) {
    super();
    this.basePath = basePath;
    this.thoughtPath = path.join(basePath, 'thoughts');
    this.sessionPath = path.join(basePath, 'sessions');
    this.encrypt = config.encryptSensitiveData ?? false;
    this.key = this.encrypt
      ? crypto
          .createHash('sha256')
          .update(process.env.MEMORY_STORE_KEY || 'default_key')
          .digest()
      : Buffer.alloc(0);

    // Ensure directories exist
    fs.mkdir(this.thoughtPath, { recursive: true }).catch(() => {});
    fs.mkdir(this.sessionPath, { recursive: true }).catch(() => {});
  }

  // ---------------------------------------------------------------------------
  // Utility helpers
  private encryptText(text: string): string {
    if (!this.encrypt) return text;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
  }

  private decryptText(text: string): string {
    if (!this.encrypt) return text;
    const data = Buffer.from(text, 'base64');
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const enc = data.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }

  private async writeJSON(filePath: string, data: unknown): Promise<void> {
    const raw = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, this.encryptText(raw), 'utf8');
  }

  private async readJSON<T>(filePath: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      return JSON.parse(this.decryptText(raw)) as T;
    } catch {
      return null;
    }
  }

  private thoughtFile(id: string): string {
    return path.join(this.thoughtPath, `${id}.json`);
  }

  private sessionFile(id: string): string {
    return path.join(this.sessionPath, `${id}.json`);
  }

  private async readAllThoughts(): Promise<StoredThought[]> {
    try {
      const files = await fs.readdir(this.thoughtPath);
      const thoughts: StoredThought[] = [];
      for (const file of files) {
        const t = await this.readJSON<StoredThought>(path.join(this.thoughtPath, file));
        if (t) thoughts.push(t);
      }
      return thoughts;
    } catch {
      return [];
    }
  }

  private async readAllSessions(): Promise<ReasoningSession[]> {
    try {
      const files = await fs.readdir(this.sessionPath);
      const sessions: ReasoningSession[] = [];
      for (const file of files) {
        const s = await this.readJSON<ReasoningSession>(path.join(this.sessionPath, file));
        if (s) sessions.push(s);
      }
      return sessions;
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  async storeThought(thought: StoredThought): Promise<void> {
    await this.writeJSON(this.thoughtFile(thought.id), thought);
  }

  async storeSession(session: ReasoningSession): Promise<void> {
    await this.writeJSON(this.sessionFile(session.id), session);
  }

  async queryThoughts(query: MemoryQuery): Promise<StoredThought[]> {
    let results = await this.readAllThoughts();
    if (query.domain) {
      results = results.filter(t => t.domain === query.domain);
    }
    if (query.confidence_range) {
      results = results.filter(
        t =>
          t.confidence !== undefined &&
          t.confidence >= query.confidence_range![0] &&
          t.confidence <= query.confidence_range![1]
      );
    }
    if (query.success_only) {
      results = results.filter(t => t.success === true);
    }
    return results.slice(0, query.limit || 100);
  }

  async getThought(id: string): Promise<StoredThought | null> {
    return this.readJSON<StoredThought>(this.thoughtFile(id));
  }

  async getSession(id: string): Promise<ReasoningSession | null> {
    return this.readJSON<ReasoningSession>(this.sessionFile(id));
  }

  async getSessions(limit?: number, offset?: number): Promise<ReasoningSession[]> {
    const sessions = await this.readAllSessions();
    const start = offset || 0;
    const end = start + (limit || sessions.length);
    return sessions.slice(start, end);
  }

  async findSimilarThoughts(thought: string, limit?: number): Promise<StoredThought[]> {
    const thoughts = await this.readAllThoughts();
    const results = thoughts
      .filter(t => t.thought.toLowerCase().includes(thought.toLowerCase()))
      .slice(0, limit || 10);
    return results;
  }

  async updateThought(id: string, updates: Partial<StoredThought>): Promise<void> {
    const existing = await this.getThought(id);
    if (existing) {
      await this.writeJSON(this.thoughtFile(id), { ...existing, ...updates });
    }
  }

  async updateSession(id: string, updates: Partial<ReasoningSession>): Promise<void> {
    const existing = await this.getSession(id);
    if (existing) {
      await this.writeJSON(this.sessionFile(id), { ...existing, ...updates });
    }
  }

  async cleanupOldThoughts(olderThan: Date): Promise<number> {
    const files = await fs.readdir(this.thoughtPath);
    let removed = 0;
    for (const file of files) {
      const full = path.join(this.thoughtPath, file);
      const stat = await fs.stat(full);
      if (stat.mtime < olderThan) {
        await fs.unlink(full);
        removed++;
      }
    }
    return removed;
  }

  async getStats(): Promise<MemoryStats> {
    const thoughts = await this.readAllThoughts();
    const sessions = await this.readAllSessions();
    return {
      total_thoughts: thoughts.length,
      total_sessions: sessions.length,
      average_session_length: sessions.length ? thoughts.length / sessions.length : 0,
      overall_success_rate:
        thoughts.length > 0 ? thoughts.filter(t => t.success).length / thoughts.length : 0,
      success_rate_by_domain: {},
      success_rate_by_complexity: {},
      most_effective_roles: [],
      most_effective_patterns: [],
      common_failure_modes: [],
      performance_over_time: [],
      learning_trajectory: [],
      storage_size: 0,
      oldest_thought: thoughts.reduce((d, t) => (t.timestamp < d ? t.timestamp : d), new Date()),
      newest_thought: thoughts.reduce((d, t) => (t.timestamp > d ? t.timestamp : d), new Date(0)),
      duplicate_rate: 0,
    };
  }

  async exportData(format: 'json' | 'csv' | 'jsonl'): Promise<string> {
    if (format === 'json') {
      const thoughts = await this.readAllThoughts();
      const sessions = await this.readAllSessions();
      return JSON.stringify({ thoughts, sessions }, null, 2);
    }
    return '';
  }

  async importData(data: string, format: 'json' | 'csv' | 'jsonl'): Promise<void> {
    if (format === 'json') {
      const parsed = JSON.parse(data) as {
        thoughts: StoredThought[];
        sessions: ReasoningSession[];
      };
      for (const t of parsed.thoughts) await this.storeThought(t);
      for (const s of parsed.sessions) await this.storeSession(s);
    }
  }

  async optimize(): Promise<void> {
    // No-op for simple file-based store
  }

  async close(): Promise<void> {
    // No resources to release
  }
}
