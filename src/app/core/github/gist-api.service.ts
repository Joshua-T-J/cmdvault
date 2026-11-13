import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { AUTH_STRATEGY } from '../auth/auth-strategy';
import { GIST_RAW_HOST, SKIP_API_HEADERS } from '../http/github-api';
import {
  CreateGistBody,
  GistDto,
  GistFilesPatch,
  GistSummaryDto,
  GitHubUserDto,
} from './gist.models';

/** Thin, typed wrapper over the GitHub Gists REST endpoints GistVault uses. */
@Service()
export class GistApiService {
  readonly #http = inject(HttpClient);
  readonly #auth = inject(AUTH_STRATEGY);

  #url(path: string): string {
    return `${this.#auth.apiBase}${path}`;
  }

  getUser() {
    return this.#http.get<GitHubUserDto>(this.#url('/user'), { observe: 'response' });
  }

  listGists(page = 1) {
    return this.#http.get<GistSummaryDto[]>(this.#url('/gists'), {
      params: { per_page: 100, page },
      observe: 'response',
    });
  }

  getGist(id: string, etag?: string) {
    const headers = etag ? new HttpHeaders({ 'If-None-Match': etag }) : undefined;
    return this.#http.get<GistDto>(this.#url(`/gists/${encodeURIComponent(id)}`), {
      headers,
      observe: 'response',
    });
  }

  createGist(body: CreateGistBody) {
    return this.#http.post<GistDto>(this.#url('/gists'), body);
  }

  updateGist(id: string, files: GistFilesPatch, description?: string) {
    return this.#http.patch<GistDto>(this.#url(`/gists/${encodeURIComponent(id)}`), {
      files,
      description,
    });
  }

  /** For files the API truncated (over 1 MB). The token is never sent to this host. */
  getRaw(rawUrl: string) {
    if (new URL(rawUrl).hostname !== GIST_RAW_HOST) {
      throw new Error('Unexpected raw gist host');
    }
    return this.#http.get(rawUrl, {
      responseType: 'text',
      context: new HttpContext().set(SKIP_API_HEADERS, true),
    });
  }
}
