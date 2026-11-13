import { Component, DOCUMENT, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from './shared/toast/toast';
import { ThemeService } from './shared/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  template: `
    <a class="skip-link" href="#main" (click)="skipToMain($event)">Skip to content</a>
    <router-outlet />
    <app-toast />
  `,
})
export class App {
  // Instantiated here so the theme class is applied before any page renders.
  protected readonly theme = inject(ThemeService);
  readonly #doc = inject(DOCUMENT);

  /** `<base href="/">` would turn `#main` into a navigation to `/`, so move focus manually. */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    const main = this.#doc.getElementById('main');
    if (!main) return;
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    main.focus();
  }
}
