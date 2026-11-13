import { DOCUMENT, Service, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_URL } from '../site.config';

export interface SeoPage {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: object;
}

@Service()
export class SeoService {
  readonly #title = inject(Title);
  readonly #meta = inject(Meta);
  readonly #doc = inject(DOCUMENT);

  set(page: SeoPage): void {
    const url = `${SITE_URL}${page.path}`;

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
    // Only advertise a preview image that exists (add 1200×630 images under public/og/).
    if (page.image) {
      this.#meta.updateTag({ property: 'og:image', content: `${SITE_URL}${page.image}` });
    } else {
      this.#meta.removeTag("property='og:image'");
    }
    this.#meta.updateTag({
      name: 'twitter:card',
      content: page.image ? 'summary_large_image' : 'summary',
    });

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
