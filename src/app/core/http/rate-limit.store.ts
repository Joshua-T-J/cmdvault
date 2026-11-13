import { HttpHeaders } from '@angular/common/http';
import { Service, computed, signal } from '@angular/core';

/** Tracks GitHub's primary rate-limit headers so the UI can warn before hitting the wall. */
@Service()
export class RateLimitStore {
  readonly #remaining = signal<number | null>(null);
  readonly #resetAt = signal<Date | null>(null);

  readonly remaining = this.#remaining.asReadonly();
  readonly resetAt = this.#resetAt.asReadonly();
  readonly isLow = computed(() => {
    const remaining = this.#remaining();
    return remaining !== null && remaining < 50;
  });

  update(headers: HttpHeaders): void {
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    if (remaining !== null) this.#remaining.set(Number(remaining));
    if (reset !== null) this.#resetAt.set(new Date(Number(reset) * 1000));
  }
}
