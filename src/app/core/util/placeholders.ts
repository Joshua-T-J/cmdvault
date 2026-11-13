import { Placeholder } from '../storage/vault.models';

const PLACEHOLDER_RE = /\{\{\s*([A-Za-z_][\w-]*)(?:\s*:\s*([^}]*?))?\s*\}\}/g;

/** Parses `{{name}}` or `{{name:default}}` tokens, de-duplicated in order of appearance. */
export function parsePlaceholders(command: string): Placeholder[] {
  const seen = new Map<string, Placeholder>();
  for (const match of command.matchAll(PLACEHOLDER_RE)) {
    const name = match[1];
    if (!name || seen.has(name)) continue;
    const def = match[2]?.trim();
    seen.set(name, def ? { name, default: def } : { name });
  }
  return [...seen.values()];
}

/** Replaces each placeholder with its value; unknown names keep their default or stay as-is. */
export function fillPlaceholders(
  command: string,
  values: Readonly<Record<string, string>>,
): string {
  return command.replace(PLACEHOLDER_RE, (whole, name: string, def?: string) => {
    const value = values[name];
    if (value !== undefined && value !== '') return value;
    return def?.trim() || whole;
  });
}
