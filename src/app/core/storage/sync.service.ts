import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { describeError, isGitHubError } from '../github/github-errors';
import { redact } from '../security/redact';
import { GistRepository } from './gist-repository';
import { VaultTooNewError, mergeVaults } from './vault-codec';
import { CURRENT_SCHEMA, Command, Tombstone, VaultDoc } from './vault.models';

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'synced' | 'offline' | 'error';

const SAVE_DEBOUNCE_MS = 1500;
const REVALIDATE_INTERVAL_MS = 5 * 60 * 1000;
const CHANNEL = 'cmdvault';
const LOCK = 'cmdvault-save';

/**
 * Owns the vault data and keeps it in step with the gist:
 * debounced refetch → three-way merge → save, one tab at a time.
 */
@Service()
export class SyncService {
  readonly #repo = inject(GistRepository);
  readonly #auth = inject(AuthStore);

  readonly #commands = signal<readonly Command[]>([]);
  readonly #status = signal<SyncStatus>('idle');
  readonly #error = signal<string | null>(null);
  readonly #readOnly = signal(false);
  readonly #loaded = signal(false);

  readonly commands = this.#commands.asReadonly();
  readonly status = this.#status.asReadonly();
  readonly error = this.#error.asReadonly();
  readonly readOnly = this.#readOnly.asReadonly();
  readonly loaded = this.#loaded.asReadonly();
  readonly busy = computed(() => this.#status() === 'loading' || this.#status() === 'saving');

  #gistId: string | null = null;
  #etag: string | null = null;
  #version: string | null = null;
  #base: readonly Command[] | null = null;
  #tombstones: Tombstone[] = [];
  #dirty = false;
  #saving: Promise<void> | null = null;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #lastRevalidate = 0;
  #channel: BroadcastChannel | null = null;
  #listening = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#teardown());
  }

  get gistId(): string | null {
    return this.#gistId;
  }

  /** Loads the vault for the signed-in user. Call once after login or on entering /app. */
  async load(gistId: string): Promise<void> {
    this.#gistId = gistId;
    this.#status.set('loading');
    this.#error.set(null);
    try {
      const result = await this.#repo.read(gistId);
      if (result.changed) this.#applyRemote(result.doc, result.version, result.etag);
      this.#loaded.set(true);
      this.#status.set('synced');
      this.#listen();
    } catch (err) {
      this.#handleError(err);
      throw err;
    }
  }

  /** Replaces the command list locally and schedules a save. */
  update(updater: (commands: readonly Command[]) => readonly Command[]): void {
    if (this.#readOnly()) return;
    this.#commands.update(updater);
    this.#dirty = true;
    this.scheduleSave();
  }

  tombstone(id: string): void {
    this.#tombstones = [
      ...this.#tombstones.filter((t) => t.id !== id),
      { id, deletedAt: new Date().toISOString() },
    ];
  }

  scheduleSave(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
  }

  /** Saves immediately (e.g. before logout or when the page is hidden). */
  async flush(): Promise<void> {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    if (!this.#dirty || !this.#gistId || this.#readOnly()) return;
    if (this.#saving) {
      await this.#saving;
      return this.flush();
    }
    this.#saving = this.#withLock(() => this.#save()).finally(() => (this.#saving = null));
    return this.#saving;
  }

  /** Cheap ETag revalidation; picks up edits made on other devices. */
  async revalidate(force = false): Promise<void> {
    const now = Date.now();
    if (!this.#gistId || this.#saving || this.#dirty) return;
    if (!force && now - this.#lastRevalidate < REVALIDATE_INTERVAL_MS) return;
    this.#lastRevalidate = now;
    try {
      const result = await this.#repo.read(this.#gistId, this.#etag);
      if (result.changed && !this.#dirty)
        this.#applyRemote(result.doc, result.version, result.etag);
      this.#status.set('synced');
    } catch (err) {
      this.#handleError(err);
    }
  }

  reset(): void {
    this.#teardown();
    this.#commands.set([]);
    this.#status.set('idle');
    this.#error.set(null);
    this.#readOnly.set(false);
    this.#loaded.set(false);
    this.#gistId = this.#etag = this.#version = null;
    this.#base = null;
    this.#tombstones = [];
    this.#dirty = false;
  }

  async #save(): Promise<void> {
    const gistId = this.#gistId;
    if (!gistId) return;
    this.#status.set('saving');
    this.#error.set(null);
    const localSnapshot = this.#commands();
    this.#dirty = false;

    try {
      const remote = await this.#repo.read(gistId, this.#etag);
      let merged: readonly Command[] = localSnapshot;
      let tombstones = this.#tombstones;

      if (remote.changed && remote.version !== this.#version) {
        const result = mergeVaults({
          base: this.#base,
          local: localSnapshot,
          remote: remote.doc.commands,
          localTombstones: this.#tombstones,
          remoteTombstones: remote.doc.tombstones,
          now: Date.now(),
          newId: () => crypto.randomUUID(),
        });
        merged = result.commands;
        tombstones = result.tombstones;
      }

      const doc: VaultDoc = {
        schema: CURRENT_SCHEMA,
        updatedAt: new Date().toISOString(),
        deviceId: this.#repo.deviceId(),
        commands: [...merged],
        tombstones,
      };
      this.#version = await this.#repo.write(gistId, doc);
      this.#etag = null;
      this.#base = merged;
      this.#tombstones = tombstones;

      // Keep edits made while the request was in flight; they go out with the next save.
      if (this.#commands() === localSnapshot) {
        this.#commands.set(merged);
      } else {
        this.#dirty = true;
        this.scheduleSave();
      }
      this.#status.set('synced');
      this.#channel?.postMessage({ type: 'changed' });
    } catch (err) {
      this.#dirty = true;
      this.#handleError(err);
    }
  }

  #applyRemote(doc: VaultDoc, version: string | null, etag: string | null): void {
    if (doc.ciphertext) {
      this.#readOnly.set(true);
      this.#error.set(
        'This vault is encrypted. Encrypted vaults aren’t supported in this version yet.',
      );
    }
    this.#commands.set(doc.commands);
    this.#base = doc.commands;
    this.#tombstones = doc.tombstones;
    this.#version = version;
    this.#etag = etag;
  }

  async #withLock(task: () => Promise<void>): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      await navigator.locks.request(LOCK, task);
    } else {
      await task();
    }
  }

  #handleError(err: unknown): void {
    if (err instanceof VaultTooNewError) {
      this.#readOnly.set(true);
      this.#status.set('error');
      this.#error.set(err.message);
      return;
    }
    if (isGitHubError(err, 'token-invalid')) this.#auth.markExpired();
    const offline = isGitHubError(err, 'transient') && err.status === 0;
    this.#status.set(offline ? 'offline' : 'error');
    this.#error.set(offline ? 'Offline — changes will sync when you’re back.' : describeError(err));
    console.error('[cmdvault] sync failed', redact(err instanceof Error ? err.message : err));
  }

  readonly #onFocus = () => void this.revalidate();
  readonly #onOnline = () => void this.flush();
  readonly #onHidden = () => {
    if (document.visibilityState === 'hidden') void this.flush();
  };

  #listen(): void {
    if (this.#listening || typeof window === 'undefined') return;
    this.#listening = true;
    window.addEventListener('focus', this.#onFocus);
    window.addEventListener('online', this.#onOnline);
    document.addEventListener('visibilitychange', this.#onHidden);
    if ('BroadcastChannel' in window) {
      this.#channel = new BroadcastChannel(CHANNEL);
      this.#channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
        if (event.data?.type === 'changed') void this.revalidate(true);
      };
    }
  }

  #teardown(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    if (!this.#listening) return;
    this.#listening = false;
    window.removeEventListener('focus', this.#onFocus);
    window.removeEventListener('online', this.#onOnline);
    document.removeEventListener('visibilitychange', this.#onHidden);
    this.#channel?.close();
    this.#channel = null;
  }
}
