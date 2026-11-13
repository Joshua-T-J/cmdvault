import { InjectionToken } from '@angular/core';

export type RememberMode = 'memory' | 'session';

export interface LoginInput {
  token?: string;
  remember?: RememberMode;
}

/**
 * The migration seam between Option A (personal access token) and Option B (BFF cookie).
 * Nothing outside `core/auth` should depend on which strategy is active.
 */
export interface AuthStrategy {
  readonly kind: 'pat' | 'bff';
  readonly apiBase: string;
  readonly withCredentials: boolean;
  authHeaders(): Record<string, string>;
  login(input?: LoginInput): Promise<void>;
  restore(): Promise<boolean>;
  tryRefresh(): Promise<boolean>;
  logout(opts?: { revoke?: boolean }): Promise<void>;
}

export const AUTH_STRATEGY = new InjectionToken<AuthStrategy>('AUTH_STRATEGY');

export class InvalidTokenFormatError extends Error {
  constructor() {
    super('That doesn’t look like a GitHub token. It should start with github_pat_ or ghp_.');
    this.name = 'InvalidTokenFormatError';
  }
}
