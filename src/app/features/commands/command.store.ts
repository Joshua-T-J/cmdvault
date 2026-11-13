import { Service, computed, inject, signal } from '@angular/core';
import { SyncService } from '../../core/storage/sync.service';
import {
  LIMITS,
  sanitizeTag,
  stripUnsafeChars,
  toSingleLine,
} from '../../core/security/input-safety';
import { normalizeCommand } from '../../core/storage/vault-codec';
import { Command, Shell } from '../../core/storage/vault.models';
import { replaceSecrets, scanForSecrets } from '../../core/security/secret-scanner';
import { parsePlaceholders } from '../../core/util/placeholders';

export type CommandFilter = { kind: 'all' } | { kind: 'favorites' } | { kind: 'tag'; tag: string };

export interface CommandDraft {
  title: string;
  command: string;
  tags: string[];
  shell?: Shell;
  description?: string;
}

export interface ImportResult {
  added: number;
  /** Commands whose suspected secrets were replaced with {{API_KEY}}. */
  redacted: number;
}

export interface TagCount {
  tag: string;
  count: number;
}

/** Splits "a, b c" into normalized, de-duplicated tags. */
export function parseTags(input: string): string[] {
  return [
    ...new Set(
      input
        .split(/[,\s]+/)
        .map(sanitizeTag)
        .filter(Boolean),
    ),
  ];
}

export function matchesQuery(command: Command, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = [command.title, command.command, command.description ?? '', ...command.tags]
    .join(' ')
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export function compareCommands(a: Command, b: Command): number {
  return (
    Number(b.favorite) - Number(a.favorite) ||
    b.usageCount - a.usageCount ||
    a.title.localeCompare(b.title)
  );
}

/** View state (search, filters) and every mutation of the command list. */
@Service()
export class CommandStore {
  readonly #sync = inject(SyncService);

  readonly #query = signal('');
  readonly #filter = signal<CommandFilter>({ kind: 'all' });

  readonly query = this.#query.asReadonly();
  readonly filter = this.#filter.asReadonly();
  readonly commands = this.#sync.commands;

  readonly tagCounts = computed<TagCount[]>(() => {
    const counts = new Map<string, number>();
    for (const c of this.commands()) {
      for (const tag of c.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  });

  readonly favoritesCount = computed(() => this.commands().filter((c) => c.favorite).length);

  readonly filtered = computed(() => {
    const filter = this.#filter();
    const query = this.#query();
    return this.commands()
      .filter((c) => {
        if (filter.kind === 'favorites') return c.favorite;
        if (filter.kind === 'tag') return c.tags.includes(filter.tag);
        return true;
      })
      .filter((c) => matchesQuery(c, query))
      .sort(compareCommands);
  });

  readonly listTitle = computed(() => {
    const filter = this.#filter();
    if (filter.kind === 'favorites') return 'Favorites';
    if (filter.kind === 'tag') return `Tagged ${filter.tag}`;
    return 'All commands';
  });

  readonly hasActiveFilters = computed(
    () => this.#filter().kind !== 'all' || this.#query().trim() !== '',
  );

  setQuery(query: string): void {
    this.#query.set(query);
  }

  setFilter(filter: CommandFilter): void {
    this.#filter.set(filter);
  }

  clearFilters(): void {
    this.#query.set('');
    this.#filter.set({ kind: 'all' });
  }

  isFilterActive(filter: CommandFilter): boolean {
    const current = this.#filter();
    if (current.kind !== filter.kind) return false;
    return current.kind !== 'tag' || (filter.kind === 'tag' && current.tag === filter.tag);
  }

  /** Creates a command, or updates it when `id` is given. Returns the saved command. */
  save(draft: CommandDraft, id?: string): Command {
    const now = new Date().toISOString();
    const existing = id ? this.commands().find((c) => c.id === id) : undefined;
    // Defence in depth: the editor validates, but the store never trusts its callers.
    const command = stripUnsafeChars(draft.command).trim().slice(0, LIMITS.command);
    const placeholders = parsePlaceholders(command);
    const description = stripUnsafeChars(draft.description ?? '')
      .trim()
      .slice(0, LIMITS.notes);

    const saved: Command = {
      id: existing?.id ?? crypto.randomUUID(),
      title: toSingleLine(draft.title).trim().slice(0, LIMITS.title),
      command,
      tags: [...new Set(draft.tags.map(sanitizeTag).filter(Boolean))].slice(0, LIMITS.tags),
      ...(draft.shell ? { shell: draft.shell } : {}),
      ...(description ? { description } : {}),
      ...(placeholders.length ? { placeholders } : {}),
      favorite: existing?.favorite ?? false,
      usageCount: existing?.usageCount ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      rev: (existing?.rev ?? 0) + 1,
    };

    this.#sync.update((list) =>
      existing ? list.map((c) => (c.id === saved.id ? saved : c)) : [...list, saved],
    );
    return saved;
  }

  addMany(drafts: readonly CommandDraft[]): number {
    drafts.forEach((draft) => this.save(draft));
    return drafts.length;
  }

  remove(id: string): void {
    this.#sync.tombstone(id);
    this.#sync.update((list) => list.filter((c) => c.id !== id));
  }

  toggleFavorite(id: string): void {
    this.#patch(id, (c) => ({ favorite: !c.favorite }));
  }

  recordUse(id: string): void {
    this.#patch(id, (c) => ({ usageCount: c.usageCount + 1 }));
  }

  /**
   * Imports CmdVault JSON (a vault file or a bare array). Skips exact duplicates and replaces
   * anything that looks like a secret with {{API_KEY}} before it can reach the gist.
   */
  importJson(json: string): ImportResult {
    const parsed: unknown = JSON.parse(json);
    const items: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { commands?: unknown })?.commands)
        ? (parsed as { commands: unknown[] }).commands
        : [];
    const now = new Date().toISOString();
    const existing = new Set(this.commands().map((c) => c.command));
    let redacted = 0;

    const incoming = items
      .map((item) => normalizeCommand(item, now, () => crypto.randomUUID()))
      .filter((c): c is Command => c !== null)
      .map((c) => {
        const secrets = scanForSecrets(c.command);
        if (!secrets.length) return c;
        redacted++;
        const command = replaceSecrets(c.command, secrets);
        const placeholders = parsePlaceholders(command);
        return { ...c, command, placeholders };
      })
      .filter((c) => !existing.has(c.command))
      .map((c) => ({ ...c, id: crypto.randomUUID(), rev: 1, updatedAt: now }));

    if (incoming.length) this.#sync.update((list) => [...list, ...incoming]);
    return { added: incoming.length, redacted };
  }

  exportJson(): string {
    return JSON.stringify(
      { schema: 1, exportedAt: new Date().toISOString(), commands: this.commands() },
      null,
      2,
    );
  }

  #patch(id: string, change: (c: Command) => Partial<Command>): void {
    const now = new Date().toISOString();
    this.#sync.update((list) =>
      list.map((c) => (c.id === id ? { ...c, ...change(c), updatedAt: now, rev: c.rev + 1 } : c)),
    );
  }
}
