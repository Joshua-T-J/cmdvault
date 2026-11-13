import { HttpContextToken } from '@angular/common/http';

export const GITHUB_API_BASE = 'https://api.github.com';
export const GITHUB_API_VERSION = '2026-03-10';
export const GIST_RAW_HOST = 'gist.githubusercontent.com';

/** Set on requests that must not receive GitHub API headers or the token (e.g. raw gist files). */
export const SKIP_API_HEADERS = new HttpContextToken<boolean>(() => false);

/** True only for requests to the configured GitHub API origin, so the token never leaks elsewhere. */
export function isGitHubApi(url: string, apiBase: string = GITHUB_API_BASE): boolean {
  if (apiBase.startsWith('/')) return url.startsWith(`${apiBase}/`) || url === apiBase;
  try {
    return new URL(url).origin === new URL(apiBase).origin;
  } catch {
    return false;
  }
}
