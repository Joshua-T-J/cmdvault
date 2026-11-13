import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GistApiService } from '../github/gist-api.service';
import { isGitHubError } from '../github/github-errors';
import { GistRepository } from '../storage/gist-repository';
import { SyncService } from '../storage/sync.service';
import { AUTH_STRATEGY, RememberMode } from './auth-strategy';
import { AuthStore } from './auth.store';
import { TokenCapabilities, readCapabilities } from './token-probe';

export type ConnectStep = 'token' | 'scopes' | 'vault';

export interface ConnectProgress {
  step: ConnectStep;
  state: 'running' | 'done';
  detail?: string;
}

export interface ConnectResult {
  capabilities: TokenCapabilities;
  gistId: string;
  createdVault: boolean;
}

/** Orchestrates sign-in, vault discovery and sign-out across auth, repository and sync. */
@Service()
export class SessionService {
  readonly #auth = inject(AUTH_STRATEGY);
  readonly #store = inject(AuthStore);
  readonly #api = inject(GistApiService);
  readonly #repo = inject(GistRepository);
  readonly #sync = inject(SyncService);

  /** Runs the capability probe from the Connect wizard, reporting each step as it finishes. */
  async connect(
    token: string,
    remember: RememberMode,
    onProgress: (progress: ConnectProgress) => void = () => undefined,
  ): Promise<ConnectResult> {
    await this.#auth.login({ token, remember });
    try {
      onProgress({ step: 'token', state: 'running' });
      const capabilities = readCapabilities(await firstValueFrom(this.#api.getUser()));
      onProgress({ step: 'token', state: 'done', detail: `@${capabilities.user.login}` });

      onProgress({ step: 'scopes', state: 'running' });
      const { gistId, created } = await this.#findOrCreateVault(capabilities.user.login);
      onProgress({ step: 'scopes', state: 'done' });

      onProgress({ step: 'vault', state: 'running' });
      await this.#sync.load(gistId);
      this.#store.markConnected(capabilities.user, capabilities.expiresAt);
      onProgress({ step: 'vault', state: 'done', detail: created ? 'Created' : 'Found' });

      return { capabilities, gistId, createdVault: created };
    } catch (err) {
      await this.#auth.logout();
      throw err;
    }
  }

  /** Called on entering /app after a reload when the token was remembered for this tab. */
  async ensureReady(): Promise<void> {
    if (this.#sync.loaded()) return;
    const capabilities = readCapabilities(await firstValueFrom(this.#api.getUser()));
    this.#store.markConnected(capabilities.user, capabilities.expiresAt);
    const { gistId } = await this.#findOrCreateVault(capabilities.user.login);
    await this.#sync.load(gistId);
  }

  async logout(): Promise<void> {
    try {
      await this.#sync.flush();
    } finally {
      this.#sync.reset();
      await this.#auth.logout();
      this.#store.clear();
    }
  }

  async #findOrCreateVault(login: string): Promise<{ gistId: string; created: boolean }> {
    const cached = this.#repo.cachedVaultId(login);
    if (cached && (await this.#exists(cached))) return { gistId: cached, created: false };
    if (cached) this.#repo.forgetVaultId(login);

    const found = await this.#repo.searchVault();
    if (found) {
      this.#repo.rememberVaultId(login, found);
      return { gistId: found, created: false };
    }
    const created = await this.#repo.createVault();
    this.#repo.rememberVaultId(login, created);
    return { gistId: created, created: true };
  }

  async #exists(gistId: string): Promise<boolean> {
    try {
      await firstValueFrom(this.#api.getGist(gistId));
      return true;
    } catch (err) {
      if (isGitHubError(err, 'not-found')) return false;
      throw err;
    }
  }
}
