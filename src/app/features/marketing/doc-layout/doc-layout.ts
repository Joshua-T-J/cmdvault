import { Component, DOCUMENT, afterNextRender, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteFooter } from '../../../shared/site-footer/site-footer';
import { SiteHeader } from '../site-header/site-header';

export interface TocEntry {
  id: string;
  label: string;
}

/** How far below the viewport top a section must reach to count as "current". */
const SPY_OFFSET = 120;
/** After a TOC click, ignore scroll-spy updates briefly so the clicked entry stays active. */
const CLICK_PIN_MS = 600;

/**
 * Header, title block, sticky table of contents with scroll spy, projected article and footer.
 * Projected sections must use the ids listed in `toc`.
 */
@Component({
  selector: 'app-doc-layout',
  imports: [RouterLink, SiteHeader, SiteFooter],
  host: {
    '(window:scroll)': 'scheduleUpdate()',
    '(window:resize)': 'scheduleUpdate()',
  },
  template: `
    <app-site-header />
    <main id="main" class="doc">
      <header class="doc-head">
        <p class="eyebrow">{{ eyebrow() }}</p>
        <h1>{{ heading() }}</h1>
        <p class="lead">{{ lead() }}</p>
        <p class="updated">Last updated {{ updated() }}</p>
      </header>

      <div class="doc-body">
        <nav class="toc" aria-label="On this page">
          <h2>On this page</h2>
          <ol>
            @for (entry of toc(); track entry.id) {
              <li>
                <a
                  [routerLink]="path()"
                  [fragment]="entry.id"
                  [class.active]="activeId() === entry.id"
                  [attr.aria-current]="activeId() === entry.id ? 'location' : null"
                  (click)="pin(entry.id)"
                  >{{ entry.label }}</a
                >
              </li>
            }
          </ol>
        </nav>
        <article class="prose">
          <ng-content />
        </article>
      </div>
    </main>
    <app-site-footer />
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      flex-direction: column;
    }
    .doc {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 24px 0;
    }
    .doc-head {
      display: grid;
      gap: 12px;
      max-width: 760px;
      padding-bottom: 32px;
      border-bottom: 1px solid var(--line);
    }
    .eyebrow {
      color: var(--accent);
      font-family: var(--font-mono);
      font-size: 14px;
      font-weight: 500;
    }
    h1 {
      font-size: clamp(34px, 4.4vw, 48px);
    }
    .lead {
      font-size: 19px;
    }
    .updated {
      color: var(--muted);
      font-size: 14px;
    }
    .doc-body {
      display: grid;
      grid-template-columns: 240px minmax(0, 760px);
      gap: 56px;
      padding-top: 32px;
    }
    .toc {
      position: sticky;
      top: 24px;
      align-self: start;
    }
    .toc h2 {
      margin-bottom: 8px;
      font-family: var(--font-body);
      font-size: 14px;
      letter-spacing: 0;
    }
    .toc ol {
      display: grid;
      margin: 0;
      padding: 0;
      list-style: none;
      border-left: 2px solid var(--line);
    }
    .toc a {
      display: flex;
      align-items: center;
      min-height: 36px;
      padding: 0 12px;
      color: var(--body);
      font-size: 15px;
      text-decoration: none;
    }
    .toc a {
      margin-left: -2px;
      border-left: 2px solid transparent;
      transition:
        color 120ms ease,
        border-color 120ms ease;
    }
    .toc a:hover {
      color: var(--accent);
    }
    .toc a.active {
      border-left-color: var(--accent);
      color: var(--accent);
      font-weight: 600;
    }
    @media (max-width: 900px) {
      .doc-body {
        grid-template-columns: minmax(0, 1fr);
        gap: 24px;
      }
      .toc {
        position: static;
      }
    }
  `,
})
export class DocLayout {
  readonly eyebrow = input.required<string>();
  readonly heading = input.required<string>();
  readonly lead = input.required<string>();
  readonly updated = input.required<string>();
  readonly path = input.required<string>();
  readonly toc = input.required<readonly TocEntry[]>();

  readonly #doc = inject(DOCUMENT);
  protected readonly activeId = signal<string | null>(null);
  #frame: number | null = null;
  #pinnedUntil = 0;

  constructor() {
    afterNextRender(() => this.#update());
  }

  protected scheduleUpdate(): void {
    if (this.#frame !== null) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = null;
      this.#update();
    });
  }

  protected pin(id: string): void {
    this.activeId.set(id);
    this.#pinnedUntil = performance.now() + CLICK_PIN_MS;
  }

  #update(): void {
    if (performance.now() < this.#pinnedUntil) return;
    const view = this.#doc.defaultView;
    const sections = this.toc()
      .map((entry) => this.#doc.getElementById(entry.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!view || !sections.length) return;

    const scrolledToBottom =
      view.innerHeight + view.scrollY >= this.#doc.documentElement.scrollHeight - 2;
    let active = sections[0]!;
    if (scrolledToBottom) {
      active = sections[sections.length - 1]!;
    } else {
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= SPY_OFFSET) active = section;
      }
    }
    this.activeId.set(active.id);
  }
}
