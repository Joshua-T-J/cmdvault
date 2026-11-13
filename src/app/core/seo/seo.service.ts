import { DOCUMENT, Service, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoPage {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: object;
}

export const SITE_ORIGIN = 'https://cmdvault.vercel.app';

@Service()
export class SeoService {
  readonly #title = inject(Title);
  readonly #meta = inject(Meta);
  readonly #doc = inject(DOCUMENT);

  set(page: SeoPage): void {
    const url = `${SITE_ORIGIN}${page.path}`;
    const image = `${SITE_ORIGIN}${page.image ?? '/og/default.png'}`;

    this.#title.setTitle(page.title);
    this.#meta.updateTag({ name: 'description', content: page.description });
    this.#meta.updateTag({
      name: 'robots',
      content: page.noindex ? 'noindex, nofollow' : 'index, follow',
    });
    this.#meta.updateTag({ property: 'og:type', content: 'website' });
    this.#meta.updateTag({ property: 'og:title', content: page.title });
    this.#meta.updateTag({ property: 'og:description', content: page.description });
    this.#meta.updateTag({ property: 'og:url', content: url });
    this.#meta.updateTag({ property: 'og:image', content: image });
    this.#meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    this.#setCanonical(url);
    this.#setJsonLd(page.jsonLd ?? null);
  }

  #setCanonical(url: string): void {
    let link = this.#doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.#doc.createElement('link');
      link.rel = 'canonical';
      this.#doc.head.appendChild(link);
    }
    link.href = url;
  }

  #setJsonLd(data: object | null): void {
    let el = this.#doc.head.querySelector<HTMLScriptElement>('script#ld-json');
    if (!data) {
      el?.remove();
      return;
    }
    if (!el) {
      el = this.#doc.createElement('script');
      el.id = 'ld-json';
      el.type = 'application/ld+json';
      this.#doc.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }
}
