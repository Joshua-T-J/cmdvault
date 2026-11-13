import { HttpResponse } from '@angular/common/http';
import { GitHubUserDto } from '../github/gist.models';
import { AuthUser } from './auth.store';

export interface TokenCapabilities {
  user: AuthUser;
  /** Classic tokens only: scopes granted beyond `gist`. */
  extraScopes: string[];
  tokenKind: 'fine-grained' | 'classic' | 'unknown';
  expiresAt: Date | null;
}

const BROAD_SCOPES_OK = new Set(['gist', '']);

/** Reads what a token can do from the `GET /user` response headers. */
export function readCapabilities(res: HttpResponse<GitHubUserDto>): TokenCapabilities {
  const body = res.body;
  if (!body) throw new Error('GitHub returned an empty profile.');

  const scopesHeader = res.headers.get('x-oauth-scopes');
  const extraScopes =
    scopesHeader === null
      ? []
      : scopesHeader
          .split(',')
          .map((s) => s.trim())
          .filter((s) => !BROAD_SCOPES_OK.has(s));

  const expiry = res.headers.get('github-authentication-token-expiration');
  const expiresAt = expiry ? new Date(expiry.replace(' UTC', 'Z').replace(' ', 'T')) : null;

  return {
    user: { login: body.login, avatarUrl: body.avatar_url, name: body.name },
    extraScopes,
    tokenKind: scopesHeader === null ? 'fine-grained' : 'classic',
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
  };
}

export function daysUntil(date: Date, now: number): number {
  return Math.max(0, Math.ceil((date.getTime() - now) / 86_400_000));
}
