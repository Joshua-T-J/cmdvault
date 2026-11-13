import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../../../shared/logo/logo';
import { GithubMark } from '../../../shared/github-mark/github-mark';
import { ThemePicker } from '../../../shared/theme-picker/theme-picker';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, Logo, GithubMark, ThemePicker],
  template: `
    <header class="bar">
      <a routerLink="/" class="home-link" aria-label="CmdVault home"><app-logo /></a>
      <nav aria-label="Main">
        <ul>
          <li><a routerLink="/" fragment="features">Features</a></li>
          <li><a routerLink="/" fragment="how-it-works">How it works</a></li>
          <li><a routerLink="/security">Security</a></li>
          <li><a routerLink="/" fragment="faq">FAQ</a></li>
        </ul>
      </nav>
      <app-theme-picker [compact]="true" />
      <a routerLink="/app/connect" class="btn btn-dark connect">
        <app-github-mark /> <span class="connect-label">Connect GitHub</span>
      </a>
    </header>
  `,
  styles: `
    .bar {
      display: flex;
      align-items: center;
      gap: 16px;
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px 24px;
    }
    .home-link {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      text-decoration: none;
      border-radius: 8px;
    }
    nav {
      margin-left: auto;
    }
    ul {
      display: flex;
      gap: 4px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    nav a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 12px;
      border-radius: 8px;
      color: var(--body);
      font-weight: 500;
      text-decoration: none;
    }
    nav a:hover {
      color: var(--ink);
    }
    @media (max-width: 860px) {
      nav {
        display: none;
      }
      app-theme-picker {
        margin-left: auto;
      }
    }
    @media (max-width: 520px) {
      .bar {
        gap: 8px;
        padding: 12px 16px;
      }
      .connect {
        width: 44px;
        padding: 0;
      }
      .connect-label {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
    }
  `,
})
export class SiteHeader {}
