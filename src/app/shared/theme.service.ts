import { DOCUMENT, Service, computed, effect, inject, signal } from '@angular/core';

const THEME_KEY = 'gistvault.theme';
/** Key used before the rename from CmdVault; read once and migrated. */
const LEGACY_THEME_KEY = 'cmdvault.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export type Theme = 'light' | 'dark';
export type ThemePreference = 'system' | Theme;

/**
 * Theme preference: System (default, follows the OS live), Light or Dark.
 * The choice is not sensitive, so it is kept in localStorage.
 */
@Service()
export class ThemeService {
  readonly #doc = inject(DOCUMENT);
  readonly #media = this.#doc.defaultView?.matchMedia?.(DARK_QUERY) ?? null;

  readonly #preference = signal<ThemePreference>(this.#readPreference());
  readonly #systemDark = signal(this.#media?.matches ?? false);

  readonly preference = this.#preference.asReadonly();
  readonly theme = computed<Theme>(() => {
    const preference = this.#preference();
    if (preference !== 'system') return preference;
    return this.#systemDark() ? 'dark' : 'light';
  });

  constructor() {
    this.#media?.addEventListener('change', (event) => this.#systemDark.set(event.matches));
    effect(() => {
      this.#doc.documentElement.classList.toggle('dark', this.theme() === 'dark');
    });
  }

  setPreference(preference: ThemePreference): void {
    this.#preference.set(preference);
    try {
      if (preference === 'system') {
        localStorage.removeItem(THEME_KEY);
      } else {
        localStorage.setItem(THEME_KEY, preference);
      }
    } catch {
      // Storage can be unavailable (private mode); the choice still applies for this visit.
    }
  }

  #readPreference(): ThemePreference {
    try {
      const legacy = localStorage.getItem(LEGACY_THEME_KEY);
      if (legacy !== null) {
        localStorage.removeItem(LEGACY_THEME_KEY);
        if (localStorage.getItem(THEME_KEY) === null) localStorage.setItem(THEME_KEY, legacy);
      }
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // Fall back to the system preference.
    }
    return 'system';
  }
}
