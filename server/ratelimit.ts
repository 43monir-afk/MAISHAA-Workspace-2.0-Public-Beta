/** In-memory sliding-window limiter. Good enough for one instance. */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  /** Returns true if the action is allowed (and records it). */
  allow(key: string, max: number, windowMs: number, now = Date.now()): boolean {
    const arr = (this.hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(now);
    this.hits.set(key, arr);
    if (this.hits.size > 5000) this.sweep(now, windowMs);
    return true;
  }

  private sweep(now: number, windowMs: number) {
    for (const [k, v] of this.hits) {
      if (!v.some((t) => now - t < windowMs)) this.hits.delete(k);
    }
  }
}
