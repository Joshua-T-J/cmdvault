import { Service, computed, signal } from '@angular/core';

export interface AuthUser {
  login: string;
  avatarUrl: string;
  name: string | null;
}

/** Signal state for who is signed in. Holds no secrets — the token lives in the strategy. */
@Service()
export class AuthStore {
  readonly #connected = signal(false);
  readonly #user = signal<AuthUser | null>(null);
  readonly #expired = signal(false);
  readonly #tokenExpiresAt = signal<Date | null>(null);

  readonly user = this.#user.asReadonly();
  readonly expired = this.#expired.asReadonly();
  readonly tokenExpiresAt = this.#tokenExpiresAt.asReadonly();
  readonly isAuthenticated = computed(() => this.#connected() && !this.#expired());
  readonly initials = computed(() => {
    const user = this.#user();
    const source = user?.name || user?.login || '';
    const parts = source.split(/[\s_-]+/).filter(Boolean);
    const letters = parts.length > 1 ? `${parts[0]?.[0]}${parts[1]?.[0]}` : source.slice(0, 2);
    return letters.toUpperCase() || '?';
  });

  markConnected(user: AuthUser | null, tokenExpiresAt: Date | null = null): void {
    this.#connected.set(true);
    this.#expired.set(false);
    if (user) this.#user.set(user);
    this.#tokenExpiresAt.set(tokenExpiresAt);
  }

  markExpired(): void {
    this.#expired.set(true);
  }

  clear(): void {
    this.#connected.set(false);
    this.#user.set(null);
    this.#expired.set(false);
    this.#tokenExpiresAt.set(null);
  }
}
