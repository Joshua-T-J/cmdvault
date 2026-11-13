export type GitHubErrorKind =
  | 'token-invalid'
  | 'rate-limited'
  | 'secondary-rate-limited'
  | 'missing-permission'
  | 'not-found'
  | 'conflict'
  | 'transient';

/** Typed error produced by `errorInterceptor` for every failed GitHub request. */
export class GitHubError extends Error {
  constructor(
    readonly kind: GitHubErrorKind,
    readonly status: number,
    message: string,
    readonly resetAt?: Date,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

export function isGitHubError(err: unknown, kind?: GitHubErrorKind): err is GitHubError {
  return err instanceof GitHubError && (!kind || err.kind === kind);
}

/** Short, user-facing explanation for an error of unknown shape. */
export function describeError(err: unknown): string {
  if (err instanceof GitHubError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}
