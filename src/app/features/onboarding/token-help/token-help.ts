import { Component, input } from '@angular/core';
import { Icon } from '../../../shared/icon/icon';

export const TOKEN_URL =
  'https://github.com/settings/personal-access-tokens/new?name=GistVault&description=GistVault%20vault%20access&expires_in=90&gists=write';

@Component({
  selector: 'app-token-help',
  imports: [Icon],
  template: `
    <details [open]="open()">
      <summary>Don’t have a token yet?</summary>
      <ol>
        <li>
          <a [href]="tokenUrl" target="_blank" rel="noopener noreferrer">
            Open GitHub’s token page
            <app-icon name="external" [size]="14" />
            <span class="visually-hidden">(opens in a new tab)</span>
          </a>
          — the name and permission are pre-filled.
        </li>
        <li>Set <strong>Repository access</strong> to <strong>No repositories</strong>.</li>
        <li>
          Under <strong>Account permissions</strong>, set <strong>Gists</strong> to
          <strong>Read and write</strong>.
        </li>
        <li>Pick an expiry of 90 days or less.</li>
        <li>Generate the token and copy it.</li>
      </ol>
      <p class="hint">Using a classic token instead? Tick only the <code>gist</code> scope.</p>
    </details>
  `,
  styles: `
    details {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 0 16px;
    }
    summary {
      display: flex;
      align-items: center;
      min-height: 48px;
      color: var(--ink);
      font-weight: 600;
      cursor: pointer;
    }
    ol {
      display: grid;
      gap: 8px;
      margin: 0 0 12px;
      padding-left: 20px;
    }
    a {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }
    .hint {
      padding-bottom: 16px;
    }
  `,
})
export class TokenHelp {
  readonly open = input(false);
  protected readonly tokenUrl = TOKEN_URL;
}
