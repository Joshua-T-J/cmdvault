import { Injectable, signal } from '@angular/core';
import { AuthStrategy, InvalidTokenFormatError, LoginInput } from './auth-strategy';
import { GITHUB_API_BASE } from '../http/github-api';

const STORAGE_KEY = 'cmdvault.pat';
const TOKEN_FORMAT = /^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/;

/**
 * Option A: the user pastes a personal access token.
 * Kept in memory by default; opt-in `sessionStorage` per tab; never `localStorage`.
 */
@Injectable()
export class PatAuthStrategy implements AuthStrategy {
  readonly kind = 'pat' as const;
  readonly apiBase = GITHUB_API_BASE;
  readonly withCredentials = false;

  readonly #token = signal<string | null>(null);

  authHeaders(): Record<string, string> {
    const token = this.#token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async login({ token, remember = 'memory' }: LoginInput = {}): Promise<void> {
    const trimmed = token?.trim();
    if (!trimmed || !TOKEN_FORMAT.test(trimmed)) throw new InvalidTokenFormatError();
    this.#token.set(trimmed);
    if (remember === 'session') {
      sessionStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  async restore(): Promise<boolean> {
    if (this.#token()) return true;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) this.#token.set(stored);
    return !!stored;
  }

  async tryRefresh(): Promise<boolean> {
    return false;
  }

  async logout(): Promise<void> {
    this.#token.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
