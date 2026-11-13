import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, retry, switchMap, tap, throwError, timer } from 'rxjs';
import { AUTH_STRATEGY } from '../auth/auth-strategy';
import { AuthStore } from '../auth/auth.store';
import { GitHubError } from '../github/github-errors';
import { GITHUB_API_VERSION, SKIP_API_HEADERS, isGitHubApi } from './github-api';
import { RateLimitStore } from './rate-limit.store';

const MAX_RETRY_WAIT_MS = 120_000;

export const apiVersionInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AUTH_STRATEGY);
  if (!isGitHubApi(req.url, auth.apiBase) || req.context.get(SKIP_API_HEADERS)) return next(req);
  return next(
    req.clone({
      setHeaders: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
    }),
  );
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AUTH_STRATEGY);
  const store = inject(AuthStore);
  if (!isGitHubApi(req.url, auth.apiBase) || req.context.get(SKIP_API_HEADERS)) return next(req);

  const withAuth = () =>
    req.clone({ setHeaders: auth.authHeaders(), withCredentials: auth.withCredentials });

  return next(withAuth()).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) return throwError(() => err);
      return from(auth.tryRefresh()).pipe(
        switchMap((refreshed) => {
          if (refreshed) return next(withAuth());
          store.markExpired();
          return throwError(() => err);
        }),
      );
    }),
  );
};

export const rateLimitInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AUTH_STRATEGY);
  if (!isGitHubApi(req.url, auth.apiBase)) return next(req);
  const limits = inject(RateLimitStore);

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) limits.update(event.headers);
    }),
    retry({
      count: 3,
      delay: (err: unknown, attempt) => {
        if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
        limits.update(err.headers);
        if (err.status !== 403 && err.status !== 429) return throwError(() => err);
        if (err.headers.has('x-accepted-github-permissions') && err.status === 403) {
          return throwError(() => err);
        }
        const retryAfter = Number(err.headers.get('retry-after'));
        const resetMs = Number(err.headers.get('x-ratelimit-reset')) * 1000 - Date.now();
        const wait = retryAfter
          ? retryAfter * 1000
          : err.headers.get('x-ratelimit-remaining') === '0'
            ? Math.max(resetMs, 1000)
            : 60_000 * attempt;
        return wait > MAX_RETRY_WAIT_MS ? throwError(() => err) : timer(wait);
      },
    }),
  );
};

/** Maps raw HTTP failures from GitHub to typed `GitHubError`s with user-facing messages. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AUTH_STRATEGY);
  if (!isGitHubApi(req.url, auth.apiBase)) return next(req);
  return next(req).pipe(catchError((err: unknown) => throwError(() => toGitHubError(err))));
};

export function toGitHubError(err: unknown): unknown {
  if (!(err instanceof HttpErrorResponse)) return err;
  const { status, headers } = err;

  if (status === 304) return err;
  if (status === 401) {
    return new GitHubError('token-invalid', status, 'Your token expired or was revoked.');
  }
  if (status === 403 && headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(headers.get('x-ratelimit-reset'));
    const resetAt = reset ? new Date(reset * 1000) : undefined;
    const time = resetAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return new GitHubError(
      'rate-limited',
      status,
      `GitHub rate limit reached.${time ? ` Try again at ${time}.` : ''}`,
      resetAt,
    );
  }
  if (status === 403 && headers.has('x-accepted-github-permissions')) {
    return new GitHubError('missing-permission', status, 'This token can’t read or write gists.');
  }
  if (status === 403 || status === 429) {
    return new GitHubError('secondary-rate-limited', status, 'Slow down a moment — retrying soon.');
  }
  if (status === 404) return new GitHubError('not-found', status, 'Your vault gist is gone.');
  if (status === 409 || status === 422) {
    return new GitHubError('conflict', status, 'GitHub rejected the change. Reload and try again.');
  }
  return new GitHubError(
    'transient',
    status,
    status === 0 ? 'You appear to be offline.' : 'GitHub is having trouble. Please retry.',
  );
}
