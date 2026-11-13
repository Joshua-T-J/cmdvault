import { LIMITS, sanitizeCommand, sanitizePlainText, sanitizeTag } from '../security/input-safety';
import { parsePlaceholders } from '../util/placeholders';
import {
  CURRENT_SCHEMA,
  Command,
  SHELLS,
  Shell,
  TOMBSTONE_TTL_MS,
  Tombstone,
  VAULT_SIZE_BLOCK,
  VAULT_SIZE_WARN,
  VaultDoc,
} from './vault.models';

export class VaultFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultFormatError';
  }
}

/** Thrown when the gist was written by a newer CmdVault; the vault opens read-only. */
export class VaultTooNewError extends Error {
  constructor(readonly schema: number) {
    super('This vault was saved by a newer version of CmdVault. Please refresh to update.');
    this.name = 'VaultTooNewError';
  }
}

export function emptyVault(deviceId: string, now: string): VaultDoc {
  return { schema: CURRENT_SCHEMA, updatedAt: now, deviceId, commands: [], tombstones: [] };
}

export function serializeVault(doc: VaultDoc): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export function vaultSize(json: string): number {
  return new TextEncoder().encode(json).length;
}

export type VaultSizeLevel = 'ok' | 'warn' | 'block';

export function vaultSizeLevel(bytes: number): VaultSizeLevel {
  if (bytes > VAULT_SIZE_BLOCK) return 'block';
  if (bytes > VAULT_SIZE_WARN) return 'warn';
  return 'ok';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Validates one command from untrusted JSON (the gist or an import file): strips hidden
 * characters and markup, limits lengths, and keeps only safe tags.
 */
export function normalizeCommand(raw: unknown, now: string, newId: () => string): Command | null {
  if (!isRecord(raw)) return null;
  const command = sanitizeCommand(asString(raw['command']));
  const title =
    sanitizePlainText(asString(raw['title']), LIMITS.title, true) ||
    sanitizePlainText(command, 60, true);
  if (!command) return null;

  const tags = Array.isArray(raw['tags'])
    ? [...new Set(raw['tags'].filter((t): t is string => typeof t === 'string').map(sanitizeTag))]
        .filter(Boolean)
        .slice(0, LIMITS.tags)
    : [];
  const shell = SHELLS.includes(raw['shell'] as Shell) ? (raw['shell'] as Shell) : undefined;
  const description =
    sanitizePlainText(asString(raw['description']), LIMITS.notes, false) || undefined;
  const placeholders = parsePlaceholders(command);

  return {
    id: asString(raw['id']) || newId(),
    title,
    command,
    ...(description ? { description } : {}),
    ...(shell ? { shell } : {}),
    tags,
    ...(placeholders.length ? { placeholders } : {}),
    favorite: raw['favorite'] === true,
    usageCount: Math.max(0, Math.floor(Number(raw['usageCount']) || 0)),
    createdAt: asString(raw['createdAt'], now),
    updatedAt: asString(raw['updatedAt'], now),
    rev: Math.max(1, Math.floor(Number(raw['rev']) || 1)),
  };
}

/** Parses and migrates the gist file. Throws `VaultTooNewError` for unknown future schemas. */
export function parseVault(json: string, now: string, newId: () => string): VaultDoc {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new VaultFormatError('The vault file is not valid JSON.');
  }
  if (!isRecord(raw)) throw new VaultFormatError('The vault file has an unexpected shape.');

  const schema = Number(raw['schema']);
  if (schema > CURRENT_SCHEMA) throw new VaultTooNewError(schema);
  const migrated = migrate(raw, schema);

  const commands = (Array.isArray(migrated['commands']) ? migrated['commands'] : [])
    .map((c) => normalizeCommand(c, now, newId))
    .filter((c): c is Command => c !== null);

  const tombstones = (Array.isArray(migrated['tombstones']) ? migrated['tombstones'] : [])
    .filter(isRecord)
    .map((t) => ({ id: asString(t['id']), deletedAt: asString(t['deletedAt']) }))
    .filter((t) => t.id && t.deletedAt);

  return {
    schema: CURRENT_SCHEMA,
    updatedAt: asString(migrated['updatedAt'], now),
    deviceId: asString(migrated['deviceId']),
    commands,
    tombstones,
    ...(isRecord(migrated['encryption'])
      ? { encryption: migrated['encryption'] as unknown as VaultDoc['encryption'] }
      : {}),
    ...(typeof migrated['ciphertext'] === 'string' ? { ciphertext: migrated['ciphertext'] } : {}),
  };
}

/** Pure, step-by-step schema migrations. Schema 1 is the first, so this is the identity today. */
function migrate(raw: Record<string, unknown>, from: number): Record<string, unknown> {
  let doc = raw;
  let version = Number.isFinite(from) && from > 0 ? from : 1;
  while (version < CURRENT_SCHEMA) {
    // Add `if (version === 1) doc = migrate1to2(doc);` here when schema 2 ships.
    version++;
  }
  doc = { ...doc, schema: CURRENT_SCHEMA };
  return doc;
}

export interface MergeInput {
  base: readonly Command[] | null;
  local: readonly Command[];
  remote: readonly Command[];
  localTombstones: readonly Tombstone[];
  remoteTombstones: readonly Tombstone[];
  now: number;
  newId: () => string;
}

export interface MergeResult {
  commands: Command[];
  tombstones: Tombstone[];
  conflicts: number;
}

function sameContent(a: Command, b: Command): boolean {
  return (
    a.title === b.title &&
    a.command === b.command &&
    a.description === b.description &&
    a.shell === b.shell &&
    a.favorite === b.favorite &&
    a.usageCount === b.usageCount &&
    a.tags.join('\u0000') === b.tags.join('\u0000')
  );
}

function changedSince(current: Command, base: Command | undefined): boolean {
  return !base || current.rev !== base.rev || !sameContent(current, base);
}

/**
 * Three-way merge per command id. Edits on one side win; edits on both sides keep the newer one
 * and save the other as a "conflicted copy" so nothing is silently lost.
 */
export function mergeVaults(input: MergeInput): MergeResult {
  const { base, local, remote, now, newId } = input;
  const baseMap = new Map((base ?? []).map((c) => [c.id, c]));
  const localMap = new Map(local.map((c) => [c.id, c]));
  const remoteMap = new Map(remote.map((c) => [c.id, c]));

  const tombstoneMap = new Map<string, Tombstone>();
  for (const t of [...input.remoteTombstones, ...input.localTombstones]) {
    if (now - Date.parse(t.deletedAt) > TOMBSTONE_TTL_MS) continue;
    const existing = tombstoneMap.get(t.id);
    if (!existing || existing.deletedAt < t.deletedAt) tombstoneMap.set(t.id, t);
  }

  const ids = [...new Set([...localMap.keys(), ...remoteMap.keys()])];
  const commands: Command[] = [];
  let conflicts = 0;

  for (const id of ids) {
    const b = baseMap.get(id);
    const l = localMap.get(id);
    const r = remoteMap.get(id);
    let winner: Command | undefined;

    if (l && r) {
      const lChanged = changedSince(l, b);
      const rChanged = changedSince(r, b);
      if (lChanged && rChanged && !sameContent(l, r)) {
        const [newer, older] = l.updatedAt >= r.updatedAt ? [l, r] : [r, l];
        winner = newer;
        conflicts++;
        commands.push({
          ...older,
          id: newId(),
          title: `${older.title} (conflicted copy)`,
          tags: [...new Set([...older.tags, 'conflict'])],
          favorite: false,
          rev: 1,
        });
      } else {
        winner = rChanged && !lChanged ? r : l;
      }
    } else if (l) {
      // Present locally only: new here, or deleted remotely (keep only if edited since).
      winner = !b || changedSince(l, b) ? l : undefined;
    } else if (r) {
      winner = !b || changedSince(r, b) ? r : undefined;
    }

    const tomb = tombstoneMap.get(id);
    if (winner && tomb && winner.updatedAt <= tomb.deletedAt) winner = undefined;
    if (winner) commands.push(winner);
  }

  return { commands, tombstones: [...tombstoneMap.values()], conflicts };
}

export const VAULT_README = `# CmdVault data

This gist is managed by [CmdVault](https://cmdvault.vercel.app). Please don't edit \`cmdvault.json\` by hand.

**This is a secret gist: it is unlisted, not private.** Anyone who has its URL can read it.
Don't store passwords, API keys or other secrets here unless you turn on encryption in CmdVault.
`;
