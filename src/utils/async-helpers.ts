/**
 * Async helpers for non-blocking operations
 */

/**
 * Yield control back to event loop
 * Prevents blocking for CPU-intensive operations
 */
export function yieldToEventLoop(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Process array items in chunks to avoid blocking
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R | Promise<R>,
  chunkSize: number = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);

    // Yield to event loop between chunks
    if (i + chunkSize < items.length) {
      await yieldToEventLoop();
    }
  }

  return results;
}

/**
 * Non-blocking sort that yields periodically
 */
export async function asyncSort<T>(items: T[], compareFn: (a: T, b: T) => number): Promise<T[]> {
  // For small arrays, just sort directly
  if (items.length < 100) {
    return items.sort(compareFn);
  }

  // For larger arrays, use merge sort with yielding
  return mergeSortAsync(items, compareFn);
}

async function mergeSortAsync<T>(items: T[], compareFn: (a: T, b: T) => number): Promise<T[]> {
  if (items.length <= 1) return items;

  const mid = Math.floor(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);

  // Yield before recursive calls for large arrays
  if (items.length > 50) {
    await yieldToEventLoop();
  }

  const [sortedLeft, sortedRight] = await Promise.all([
    mergeSortAsync(left, compareFn),
    mergeSortAsync(right, compareFn),
  ]);

  return merge(sortedLeft, sortedRight, compareFn);
}

function merge<T>(left: T[], right: T[], compareFn: (a: T, b: T) => number): T[] {
  const result: T[] = [];
  let i = 0,
    j = 0;

  while (i < left.length && j < right.length) {
    if (compareFn(left[i], right[j]) <= 0) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }

  return result.concat(left.slice(i)).concat(right.slice(j));
}

/**
 * Debounce async function calls
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<any> | null = null;

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (!pendingPromise) {
      pendingPromise = new Promise((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          try {
            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            pendingPromise = null;
            timeoutId = null;
          }
        }, delay);
      });
    }

    return pendingPromise;
  }) as T;
}

/**
 * Create a worker pool for CPU-intensive tasks
 */
export class TaskQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private concurrency: number;

  constructor(concurrency: number = 4) {
    this.concurrency = concurrency;
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.process();
      }
    });
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency);
      await Promise.all(batch.map(task => task()));

      // Yield between batches
      if (this.queue.length > 0) {
        await yieldToEventLoop();
      }
    }

    this.processing = false;
  }
}
