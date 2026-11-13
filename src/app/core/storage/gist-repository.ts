import { HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GistApiService } from '../github/gist-api.service';
import { GistDto, GistSummaryDto } from '../github/gist.models';
import {
  VAULT_README,
  emptyVault,
  parseVault,
  serializeVault,
  vaultSize,
  vaultSizeLevel,
} from './vault-codec';
import {
  VAULT_DESCRIPTION,
  VAULT_FILE,
  VAULT_MARKER,
  VAULT_README_FILE,
  VaultDoc,
} from './vault.models';

const GIST_ID_KEY = 'cmdvault.gist-id';
const DEVICE_ID_KEY = 'cmdvault.device-id';
const MAX_LIST_PAGES = 30;

export type VaultReadResult =
  | { changed: false }
  | { changed: true; doc: VaultDoc; version: string | null; etag: string | null };

export class VaultTooLargeError extends Error {
  constructor() {
    super('Your vault is over 950 KB. Export and archive some commands before saving.');
    this.name = 'VaultTooLargeError';
  }
}

function newId(): string {
  return crypto.randomUUID();
}

/** All reads and writes of the vault gist. Writes only ever target the vault's own gist ID. */
@Service()
export class GistRepository {
  readonly #api = inject(GistApiService);

  /** The gist ID is not a secret, so it is cached in localStorage per GitHub account. */
  cachedVaultId(login: string): string | null {
    return localStorage.getItem(`${GIST_ID_KEY}:${login}`);
  }

  rememberVaultId(login: string, id: string): void {
    localStorage.setItem(`${GIST_ID_KEY}:${login}`, id);
  }

  forgetVaultId(login: string): void {
    localStorage.removeItem(`${GIST_ID_KEY}:${login}`);
  }

  deviceId(): string {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = newId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  /** Pages through the user's gists looking for the CmdVault marker. */
  async searchVault(): Promise<string | null> {
    for (let page = 1; page <= MAX_LIST_PAGES; page++) {
      const res = await firstValueFrom(this.#api.listGists(page));
      const match = (res.body ?? []).find(isVaultGist);
      if (match) return match.id;
      if (!res.headers.get('link')?.includes('rel="next"')) break;
    }
    return null;
  }

  async createVault(): Promise<string> {
    const doc = emptyVault(this.deviceId(), new Date().toISOString());
    const gist = await firstValueFrom(
      this.#api.createGist({
        description: VAULT_DESCRIPTION,
        public: false,
        files: {
          [VAULT_FILE]: { content: serializeVault(doc) },
          [VAULT_README_FILE]: { content: VAULT_README },
        },
      }),
    );
    return gist.id;
  }

  async read(id: string, etag?: string | null): Promise<VaultReadResult> {
    try {
      const res = await firstValueFrom(this.#api.getGist(id, etag ?? undefined));
      if (res.status === 304 || !res.body) return { changed: false };
      const json = await this.#fileContent(res.body);
      const doc = json
        ? parseVault(json, new Date().toISOString(), newId)
        : emptyVault(this.deviceId(), new Date().toISOString());
      return {
        changed: true,
        doc,
        version: res.body.history?.[0]?.version ?? null,
        etag: res.headers.get('etag'),
      };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 304) return { changed: false };
      throw err;
    }
  }

  async write(id: string, doc: VaultDoc): Promise<string | null> {
    const json = serializeVault(doc);
    if (vaultSizeLevel(vaultSize(json)) === 'block') throw new VaultTooLargeError();
    const gist = await firstValueFrom(
      this.#api.updateGist(id, { [VAULT_FILE]: { content: json } }),
    );
    return gist.history?.[0]?.version ?? null;
  }

  async #fileContent(gist: GistDto): Promise<string | null> {
    const file = gist.files[VAULT_FILE];
    if (!file) return null;
    if (file.truncated) return firstValueFrom(this.#api.getRaw(file.raw_url));
    return file.content ?? null;
  }
}

function isVaultGist(gist: GistSummaryDto): boolean {
  return !gist.public && !!gist.files[VAULT_FILE] && !!gist.description?.includes(VAULT_MARKER);
}
