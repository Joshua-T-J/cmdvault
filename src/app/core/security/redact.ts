import { replaceSecrets, scanForSecrets } from './secret-scanner';

const SENSITIVE_KEYS =
  /^(authorization|code|state|code_verifier|refresh_token|access_token|token)$/i;

/** Strips tokens and secret-looking values before anything is logged. */
export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return replaceSecrets(value, scanForSecrets(value), 'REDACTED');
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SENSITIVE_KEYS.test(k) ? '[REDACTED]' : redact(v)]),
    );
  }
  return value;
}
