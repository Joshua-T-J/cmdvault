/**
 * Input validation and sanitising for user-supplied and untrusted text (the editor, JSON imports,
 * and the gist itself, which anyone holding a token could edit).
 *
 * Angular already escapes every `{{ }}` interpolation and property binding, and GistVault never
 * renders user text as HTML. These checks are defence in depth:
 * - markup and script URLs are rejected in plain-text fields (title, notes, tags),
 * - invisible and bidirectional control characters are rejected or stripped, because they can
 *   make a copied command do something other than what it shows ("Trojan Source"),
 * - tags are limited to a safe character set,
 * - placeholder values can't smuggle extra lines or control characters into a copied command.
 */

export const LIMITS = {
  title: 120,
  command: 4000,
  notes: 1000,
  tag: 32,
  tags: 20,
  placeholderValue: 500,
} as const;

/** C0/C1 control characters except tab and line feed. */
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;
/** Bidirectional overrides/isolates, zero-width characters, BOM and Unicode line separators. */
const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2028\u2029\u2060-\u2064\u2066-\u2069\uFEFF]/g;
/**
 * Real HTML, as opposed to doc-style placeholders like `<branch>`: script-capable elements,
 * any tag with attributes, closing tags, comments, doctypes and processing instructions.
 */
const DANGEROUS_ELEMENTS =
  'script|style|iframe|frame|frameset|object|embed|applet|svg|math|img|image|video|audio|source|' +
  'track|link|meta|base|form|input|button|textarea|select|option|a|area|map|template|slot|' +
  'html|head|body|marquee|details|dialog|portal';
const MARKUP_SOURCE =
  `<(?:${DANGEROUS_ELEMENTS})\\b[^>]*>` +
  '|<[a-z][\\w:-]*\\s+[^>]*=[^>]*>' +
  '|<\\/\\s*[a-z][\\w:-]*\\s*>' +
  '|<!--|<!\\[cdata\\[|<![a-z]|<\\?[a-z]';
const MARKUP = new RegExp(MARKUP_SOURCE, 'i');
const MARKUP_GLOBAL = new RegExp(MARKUP_SOURCE, 'gi');
/** Script-capable URL schemes. */
const SCRIPT_URL = /\b(?:javascript|vbscript)\s*:|\bdata\s*:\s*text\/html/i;
/** Inline event handler attributes such as onerror= or onclick= */
const EVENT_HANDLER = /\bon[a-z]{3,}\s*=\s*["'`]/i;
const TAG_ALLOWED = /^[a-z0-9][a-z0-9._+#-]*$/;

export type UnsafeCharKind = 'control' | 'invisible';

export interface UnsafeChar {
  kind: UnsafeCharKind;
  index: number;
  /** e.g. "U+202E" */
  codePoint: string;
}

function codePoint(ch: string): string {
  return `U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`;
}

/** Lists hidden characters that could disguise what text really says. */
export function findUnsafeChars(text: string): UnsafeChar[] {
  const found: UnsafeChar[] = [];
  for (const m of text.matchAll(CONTROL_CHARS)) {
    found.push({ kind: 'control', index: m.index ?? 0, codePoint: codePoint(m[0]) });
  }
  for (const m of text.matchAll(INVISIBLE_CHARS)) {
    found.push({ kind: 'invisible', index: m.index ?? 0, codePoint: codePoint(m[0]) });
  }
  return found.sort((a, b) => a.index - b.index);
}

/** Removes control and invisible characters. Keeps tabs and line feeds; normalises CRLF. */
export function stripUnsafeChars(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '').replace(INVISIBLE_CHARS, '');
}

/** Like `stripUnsafeChars`, but also collapses line breaks and tabs into single spaces. */
export function toSingleLine(text: string): string {
  return stripUnsafeChars(text).replace(/[\t\n]+/g, ' ');
}

/** True when plain text contains HTML markup, script URLs or inline event handlers. */
export function containsMarkup(text: string): boolean {
  return MARKUP.test(text) || SCRIPT_URL.test(text) || EVENT_HANDLER.test(text);
}

/** Removes tag-like sequences and neutralises script URLs, for untrusted imports. */
export function stripMarkup(text: string): string {
  return text
    .replace(MARKUP_GLOBAL, '')
    .replace(/\b(javascript|vbscript)\s*:/gi, '$1 ')
    .replace(/\bdata\s*:\s*text\/html/gi, 'data text/html');
}

/** Lower-cases a tag and keeps only safe characters. Returns '' when nothing usable is left. */
export function sanitizeTag(tag: string): string {
  return toSingleLine(tag)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._+#-]/g, '')
    .replace(/^[^a-z0-9]+/, '')
    .slice(0, LIMITS.tag);
}

export function isValidTag(tag: string): boolean {
  return tag.length <= LIMITS.tag && TAG_ALLOWED.test(tag);
}

/** Cleans a plain-text field from an untrusted source (import or gist). */
export function sanitizePlainText(text: string, max: number, singleLine: boolean): string {
  const cleaned = singleLine ? toSingleLine(text) : stripUnsafeChars(text);
  return stripMarkup(cleaned).trim().slice(0, max);
}

/** Cleans a command from an untrusted source. Shell syntax such as `<` and `>` is kept. */
export function sanitizeCommand(text: string): string {
  return stripUnsafeChars(text).trim().slice(0, LIMITS.command);
}

/** Why a placeholder value can't be used, or null when it's fine. */
export function placeholderValueProblem(value: string): string | null {
  if (/[\r\n]/.test(value)) return 'Values can’t contain line breaks.';
  if (findUnsafeChars(value).length) return 'Remove hidden or control characters from this value.';
  if (value.length > LIMITS.placeholderValue) {
    return `Keep values under ${LIMITS.placeholderValue} characters.`;
  }
  return null;
}

/** Validation message for a plain-text field (title, notes), or null when it's fine. */
export function plainTextProblem(text: string): string | null {
  if (containsMarkup(text)) return 'HTML tags and script links aren’t allowed here.';
  if (findUnsafeChars(text).length) return 'Remove hidden or control characters.';
  return null;
}

/** Validation message for the comma-separated tags field, or null when it's fine. */
export function tagsProblem(raw: string): string | null {
  const tokens = raw.split(/[,\s]+/).filter(Boolean);
  if (tokens.length > LIMITS.tags) return `Use at most ${LIMITS.tags} tags.`;
  const bad = tokens.filter((t) => !isValidTag(t.toLowerCase()));
  if (bad.length) {
    return `Tags can only use letters, numbers and . _ + # - (check: ${bad.slice(0, 3).join(', ')}).`;
  }
  return null;
}
