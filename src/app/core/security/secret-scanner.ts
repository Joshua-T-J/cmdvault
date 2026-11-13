export interface SecretMatch {
  kind: string;
  start: number;
  end: number;
  value: string;
}

interface SecretPattern {
  kind: string;
  re: RegExp;
  /** Capture group holding the secret itself (defaults to the whole match). */
  group?: number;
}

const SECRET_PATTERNS: readonly SecretPattern[] = [
  { kind: 'GitHub token', re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g },
  { kind: 'GitHub fine-grained token', re: /\bgithub_pat_[A-Za-z0-9_]{50,}\b/g },
  { kind: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { kind: 'Stripe key', re: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { kind: 'API key', re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { kind: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: 'Private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { kind: 'JWT', re: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g },
  {
    kind: 'Password or secret',
    re: /\b(?:password|passwd|pwd|secret|token)\s*[=:]\s*(?!\{\{)(\S+)/gi,
    group: 1,
  },
  { kind: 'Credentials in URL', re: /:\/\/[^\s/:@]+:([^\s/@{]+)@/g, group: 1 },
];

const ENTROPY_CANDIDATE = /[A-Za-z0-9+/_-]{20,}={0,2}/g;
const ENTROPY_THRESHOLD = 4.0;

export function shannonEntropy(value: string): number {
  if (!value) return 0;
  const counts = new Map<string, number>();
  for (const ch of value) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/** Finds likely secrets in a command. Results are sorted by position and never overlap. */
export function scanForSecrets(text: string): SecretMatch[] {
  const named: SecretMatch[] = [];
  for (const { kind, re, group } of SECRET_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const value = group ? m[group] : m[0];
      if (!value || m.index === undefined) continue;
      const start = m.index + m[0].indexOf(value);
      named.push({ kind, start, end: start + value.length, value });
    }
  }

  // The entropy heuristic only adds matches that no named pattern already covers.
  const overlapsNamed = (start: number, end: number) =>
    named.some((n) => start < n.end && n.start < end);
  const entropy: SecretMatch[] = [];
  for (const m of text.matchAll(ENTROPY_CANDIDATE)) {
    const value = m[0];
    if (m.index === undefined || !/\d/.test(value) || !/[A-Za-z]/.test(value)) continue;
    const end = m.index + value.length;
    if (shannonEntropy(value) > ENTROPY_THRESHOLD && !overlapsNamed(m.index, end)) {
      entropy.push({ kind: 'High-entropy string', start: m.index, end, value });
    }
  }

  const found = [...named, ...entropy].sort((a, b) => a.start - b.start || b.end - a.end);
  const result: SecretMatch[] = [];
  for (const match of found) {
    const last = result.at(-1);
    if (last && match.start < last.end) continue;
    result.push(match);
  }
  return result;
}

/** Replaces every detected secret with a placeholder such as `{{API_KEY}}`. */
export function replaceSecrets(
  text: string,
  matches: readonly SecretMatch[],
  name = 'API_KEY',
): string {
  let out = '';
  let cursor = 0;
  for (const m of matches) {
    out += text.slice(cursor, m.start) + `{{${name}}}`;
    cursor = m.end;
  }
  return out + text.slice(cursor);
}
