import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ISSUES_URL, REPO_URL } from '../../core/site.config';
import { Logo } from '../logo/logo';

/** Site-wide footer, shown at the end of every page. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, Logo],
  template: `
    <footer class="footer">
      <div class="inner">
        <div class="brand">
          <app-logo />
          <p>
            Save the shell commands you look up twice — in a secret gist on your own GitHub account.
            No server, no database, no tracking.
          </p>
        </div>

        <nav class="columns" aria-label="Footer">
          <div>
            <h2>Product</h2>
            <ul>
              <li><a routerLink="/" fragment="features">Features</a></li>
              <li><a routerLink="/" fragment="how-it-works">How it works</a></li>
              <li><a routerLink="/" fragment="faq">FAQ</a></li>
              <li><a routerLink="/app">Open your vault</a></li>
            </ul>
          </div>
          <div>
            <h2>Trust</h2>
            <ul>
              <li><a routerLink="/privacy">Privacy policy</a></li>
              <li><a routerLink="/security">Security model</a></li>
              <li><a routerLink="/security" fragment="report">Report a vulnerability</a></li>
            </ul>
          </div>
          <div>
            <h2>Project</h2>
            <ul>
              <li><a [href]="repoUrl" rel="noopener">Source code</a></li>
              <li><a [href]="issuesUrl" rel="noopener">Report an issue</a></li>
              <li><a routerLink="/licenses">Open-source licenses</a></li>
              <li>
                <a
                  href="https://docs.github.com/en/get-started/writing-on-github/editing-and-sharing-content-with-gists/creating-gists#about-gists"
                  rel="noopener"
                  >About secret gists</a
                >
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <div class="legal">
        <p>
          © 2026 Joshua T J and CmdVault contributors ·
          <a routerLink="/licenses" class="inline">MIT License</a> · not affiliated with GitHub,
          Inc.
        </p>
        <p>Your commands stay in your GitHub account.</p>
      </div>
    </footer>
  `,
  styles: `
    :host {
      display: block;
      /* Pushes the footer to the bottom of short pages (see the sticky-footer rule in styles.scss). */
      margin-top: auto;
    }
    .footer {
      margin-top: 48px;
      border-top: 1px solid var(--line);
      background: var(--surface);
      color: var(--muted);
      font-size: 15px;
    }
    .inner {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 2fr);
      gap: 40px;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 24px 24px;
    }
    .brand {
      display: grid;
      align-content: start;
      gap: 12px;
      max-width: 340px;
    }
    .columns {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
    }
    h2 {
      margin-bottom: 6px;
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0;
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    a {
      display: inline-flex;
      align-items: center;
      min-height: 40px;
      color: var(--body);
      text-decoration: none;
    }
    a:hover {
      color: var(--accent);
      text-decoration: underline;
    }
    a.inline {
      display: inline;
      min-height: 0;
      color: inherit;
      text-decoration: underline;
    }
    .legal {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px;
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px 24px 28px;
      border-top: 1px solid var(--line);
      font-size: 14px;
    }
    @media (max-width: 760px) {
      .inner {
        grid-template-columns: 1fr;
        gap: 24px;
      }
      .columns {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class SiteFooter {
  protected readonly repoUrl = REPO_URL;
  protected readonly issuesUrl = ISSUES_URL;
}
