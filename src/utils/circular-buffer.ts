/**
 * Circular Buffer implementation for memory-bounded collections
 *
 * Provides fixed-size collections that automatically evict oldest items
 * when capacity is exceeded, preventing unbounded memory growth.
 */

export interface CircularBufferStats {
  size: number;
  capacity: number;
  overflowCount: number;
  oldestTimestamp?: Date;
  newestTimestamp?: Date;
}

export interface CircularBufferItem<T> {
  data: T;
  timestamp: Date;
  id: string;
}

/**
 * Generic circular buffer with automatic overflow handling
 */
export class CircularBuffer<T> {
  private items: CircularBufferItem<T>[] = [];
  private overflowCount = 0;
  private nextId = 1;

  constructor(private readonly maxSize: number) {
    if (maxSize <= 0) {
      throw new Error('CircularBuffer maxSize must be positive');
    }
  }

  /**
   * Add item to buffer, evicting oldest if at capacity
   */
  push(item: T): string {
    const bufferedItem: CircularBufferItem<T> = {
      data: item,
      timestamp: new Date(),
      id: `item_${this.nextId++}`,
    };

    this.items.push(bufferedItem);

    // Remove oldest items if over capacity
    while (this.items.length > this.maxSize) {
      this.items.shift();
      this.overflowCount++;
    }

    return bufferedItem.id;
  }

  /**
   * Get all items in chronological order (oldest first)
   */
  getAll(): T[] {
    return this.items.map(item => item.data);
  }

  /**
   * Get most recent N items
   */
  getRecent(count: number): T[] {
    const startIndex = Math.max(0, this.items.length - count);
    return this.items.slice(startIndex).map(item => item.data);
  }

  /**
   * Get items within time range
   */
  getItemsSince(since: Date): T[] {
    return this.items.filter(item => item.timestamp >= since).map(item => item.data);
  }

  /**
   * Find items matching predicate
   */
  find(predicate: (item: T) => boolean): T[] {
    return this.items.filter(item => predicate(item.data)).map(item => item.data);
  }

  /**
   * Get item by ID
   */
  getById(id: string): T | undefined {
    const item = this.items.find(item => item.id === id);
    return item?.data;
  }

  /**
   * Check if buffer contains item
   */
  contains(predicate: (item: T) => boolean): boolean {
    return this.items.some(item => predicate(item.data));
  }

  /**
   * Remove all items
   */
  clear(): void {
    this.items = [];
    this.overflowCount = 0;
  }

  /**
   * Get buffer statistics
   */
  getStats(): CircularBufferStats {
    const timestamps = this.items.map(item => item.timestamp);
    return {
      size: this.items.length,
      capacity: this.maxSize,
      overflowCount: this.overflowCount,
      oldestTimestamp:
        timestamps.length > 0
          ? Math.min(...timestamps.map(t => t.getTime()))
            ? new Date(Math.min(...timestamps.map(t => t.getTime())))
            : undefined
          : undefined,
      newestTimestamp:
        timestamps.length > 0
          ? Math.max(...timestamps.map(t => t.getTime()))
            ? new Date(Math.max(...timestamps.map(t => t.getTime())))
            : undefined
          : undefined,
    };
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.items.length;
  }

  /**
   * Get maximum capacity
   */
  get capacity(): number {
    return this.maxSize;
  }

  /**
   * Check if buffer is empty
   */
  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Check if buffer is at capacity
   */
  get isFull(): boolean {
    return this.items.length >= this.maxSize;
  }

  /**
   * Get overflow count (items evicted)
   */
  get totalOverflow(): number {
    return this.overflowCount;
  }

  /**
   * Iterator support for for...of loops
   */
  *[Symbol.iterator](): Iterator<T> {
    for (const item of this.items) {
      yield item.data;
    }
  }

  /**
   * Convert to array (for serialization)
   */
  toArray(): T[] {
    return this.getAll();
  }

  /**
   * Create from array with capacity limit
   */
  static fromArray<T>(items: T[], maxSize: number): CircularBuffer<T> {
    const buffer = new CircularBuffer<T>(maxSize);
    for (const item of items) {
      buffer.push(item);
    }
    return buffer;
  }

  /**
   * Merge multiple buffers into one
   */
  static merge<T>(buffers: CircularBuffer<T>[], maxSize: number): CircularBuffer<T> {
    const merged = new CircularBuffer<T>(maxSize);

    // Add all items from all buffers (they will be automatically sorted by push time)
    for (const buffer of buffers) {
      for (const item of buffer.getAll()) {
        merged.push(item);
      }
    }

    return merged;
  }
}

/**
 * Specialized circular buffer for cognitive operations with performance tracking
 */
export class CognitiveCircularBuffer<T> extends CircularBuffer<T> {
  private accessCount = 0;
  private lastAccessTime = new Date();

  constructor(maxSize: number) {
    super(maxSize);
  }

  override push(item: T): string {
    this.accessCount++;
    this.lastAccessTime = new Date();
    return super.push(item);
  }

  override getAll(): T[] {
    this.accessCount++;
    this.lastAccessTime = new Date();
    return super.getAll();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    accessCount: number;
    lastAccessTime: Date;
    averageItemAge: number;
    memoryEfficiency: number;
  } {
    const now = new Date();
    const stats = this.getStats();
    const averageAge =
      stats.size > 0 && stats.oldestTimestamp && stats.newestTimestamp
        ? (now.getTime() -
            stats.oldestTimestamp.getTime() +
            now.getTime() -
            stats.newestTimestamp.getTime()) /
          2
        : 0;

    return {
      accessCount: this.accessCount,
      lastAccessTime: this.lastAccessTime,
      averageItemAge: averageAge,
      memoryEfficiency: this.size / this.capacity,
    };
  }

  /**
   * Reset performance counters
   */
  resetMetrics(): void {
    this.accessCount = 0;
    this.lastAccessTime = new Date();
  }
}

/**
 * Factory for creating commonly used buffer types
 */
export class BufferFactory {
  /**
   * Create buffer for cognitive interventions
   */
  static createInterventionBuffer(maxSize: number = 1000): CognitiveCircularBuffer<any> {
    return new CognitiveCircularBuffer(maxSize);
  }

  /**
   * Create buffer for insights
   */
  static createInsightBuffer(maxSize: number = 500): CognitiveCircularBuffer<any> {
    return new CognitiveCircularBuffer(maxSize);
  }

  /**
   * Create buffer for thought outputs
   */
  static createThoughtBuffer(maxSize: number = 2000): CognitiveCircularBuffer<string> {
    return new CognitiveCircularBuffer(maxSize);
  }

  /**
   * Create buffer for error tracking
   */
  static createErrorBuffer(maxSize: number = 100): CircularBuffer<any> {
    return new CircularBuffer(maxSize);
  }
}
