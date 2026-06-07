export class ExponentialBackoff {
  private attempt = 0
  private readonly baseMs: number
  private readonly maxMs: number
  private readonly jitterRange: number

  constructor(baseMs = 1000, maxMs = 60000, jitterRange = 0.3) {
    this.baseMs = baseMs
    this.maxMs = maxMs
    this.jitterRange = jitterRange
  }

  nextDelay(): number {
    const exponential = Math.min(this.maxMs, this.baseMs * Math.pow(2, this.attempt))
    const jitter = exponential * this.jitterRange * (Math.random() * 2 - 1)
    const delay = Math.max(0, Math.round(exponential + jitter))
    this.attempt++
    return delay
  }

  reset(): void {
    this.attempt = 0
  }

  getAttempt(): number {
    return this.attempt
  }
}
