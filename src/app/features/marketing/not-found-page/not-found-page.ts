import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/seo/seo.service';
import { SiteFooter } from '../../../shared/site-footer/site-footer';
import { SiteHeader } from '../site-header/site-header';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, SiteHeader, SiteFooter],
  template: `
    <app-site-header />
    <main id="main" class="wrap">
      <p class="code" aria-hidden="true">404</p>
      <h1>This page doesn’t exist.</h1>
      <p>The link may be old, or the address may have a typo.</p>
      <a routerLink="/" class="btn btn-primary">Back to the home page</a>
    </main>
    <app-site-footer />
  `,
  styles: `
    .wrap {
      display: grid;
      justify-items: start;
      gap: 16px;
      max-width: 720px;
      margin: 0 auto;
      padding: 96px 24px;
    }
    .code {
      color: var(--accent);
      font-family: var(--font-mono);
      font-weight: 500;
    }
    h1 {
      font-size: 40px;
    }
  `,
})
export default class NotFoundPage {
  constructor() {
    inject(SeoService).set({
      title: 'Page not found · CmdVault',
      description: 'This page doesn’t exist.',
      path: '/404',
      noindex: true,
    });
  }
}
