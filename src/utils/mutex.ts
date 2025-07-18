/**
 * Simple mutex implementation for preventing race conditions
 */
export class Mutex {
  private queue: Array<() => void> = [];
  private locked = false;

  async lock(): Promise<() => void> {
    return new Promise(resolve => {
      const tryLock = () => {
        if (!this.locked) {
          this.locked = true;
          resolve(() => this.unlock());
        }
      };

      this.queue.push(tryLock);
      if (this.queue.length === 1) {
        tryLock();
      }
    });
  }

  private unlock(): void {
    this.locked = false;
    this.queue.shift();

    if (this.queue.length > 0) {
      const next = this.queue[0];
      next();
    }
  }

  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const unlock = await this.lock();
    try {
      return await fn();
    } finally {
      unlock();
    }
  }
}

/**
 * Mutex registry for different resources
 */
export class MutexRegistry {
  private mutexes = new Map<string, Mutex>();

  getMutex(key: string): Mutex {
    if (!this.mutexes.has(key)) {
      this.mutexes.set(key, new Mutex());
    }
    return this.mutexes.get(key)!;
  }

  clear(): void {
    this.mutexes.clear();
  }
}
