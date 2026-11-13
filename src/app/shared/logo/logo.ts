import { Component } from '@angular/core';

/** GistVault logo: a rounded terminal window with a prompt, plus the wordmark. */
@Component({
  selector: 'app-logo',
  template: `
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true" focusable="false">
      <rect
        x="1.5"
        y="3.5"
        width="25"
        height="21"
        rx="6"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
      <path
        d="M8 11l3.5 3L8 17M14 17h6"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <span class="wordmark">GistVault</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--logo, var(--accent));
    }
    .wordmark {
      font-family: var(--font-heading);
      font-weight: 700;
      font-size: 20px;
      color: var(--logo-text, var(--ink));
    }
  `,
})
export class Logo {}
