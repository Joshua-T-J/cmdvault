import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Icon, IconName } from '../icon/icon';
import { ThemePreference, ThemeService } from '../theme.service';

interface ThemeOption {
  value: ThemePreference;
  label: string;
  icon: IconName;
}

const OPTIONS: readonly ThemeOption[] = [
  { value: 'system', label: 'System', icon: 'monitor' },
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
];

let nextId = 0;

/**
 * Theme dropdown: a menu button that opens System / Light / Dark as `menuitemradio` items.
 * Keyboard: Enter/Space/↓ opens, ↑/↓/Home/End move, Enter selects, Esc closes.
 */
@Component({
  selector: 'app-theme-picker',
  imports: [Icon],
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    <div class="wrap">
      @if (showLabel()) {
        <span class="label" [id]="labelId">Theme</span>
      }
      <button
        #trigger
        type="button"
        class="trigger"
        [class.compact]="compact()"
        aria-haspopup="menu"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="menuId"
        [attr.aria-label]="'Theme: ' + current().label"
        (click)="toggle()"
        (keydown.arrowdown)="openAndFocus($event, 'checked')"
        (keydown.arrowup)="openAndFocus($event, 'last')"
      >
        <app-icon [name]="current().icon" [size]="16" />
        @if (!compact()) {
          <span>{{ current().label }}</span>
        }
        <app-icon name="chevron" [size]="14" class="chevron" />
      </button>

      @if (open()) {
        <div
          class="menu"
          role="menu"
          [id]="menuId"
          aria-label="Theme"
          [class.align-start]="align() === 'start'"
          (keydown)="onMenuKeydown($event)"
        >
          @for (option of options; track option.value) {
            <button
              #item
              type="button"
              role="menuitemradio"
              class="item"
              tabindex="-1"
              [attr.aria-checked]="theme.preference() === option.value"
              (click)="choose(option.value)"
            >
              <app-icon [name]="option.icon" [size]="16" />
              <span class="item-label">{{ option.label }}</span>
              @if (theme.preference() === option.value) {
                <app-icon name="check" [size]="16" class="tick" />
              }
            </button>
          }
          @if (theme.preference() === 'system') {
            <p class="note">Following your device: {{ theme.theme() }}</p>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .label {
      color: var(--body);
      font-size: 15px;
      font-weight: 500;
    }
    .trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--ink);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    .trigger:hover {
      border-color: var(--accent);
    }
    .trigger.compact {
      gap: 4px;
      padding: 0 10px;
    }
    .chevron {
      transform: rotate(90deg);
      color: var(--muted);
    }
    .menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 40;
      display: grid;
      min-width: 200px;
      padding: 6px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--surface);
      box-shadow: 0 12px 32px rgb(14 17 22 / 18%);
    }
    .menu.align-start {
      right: auto;
      left: 0;
    }
    .item {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 0 10px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--body);
      font-size: 15px;
      text-align: left;
      cursor: pointer;
    }
    .item:hover,
    .item:focus-visible {
      background: var(--accent-soft);
      color: var(--ink);
    }
    .item[aria-checked='true'] {
      color: var(--ink);
      font-weight: 600;
    }
    .item-label {
      flex: 1;
    }
    .tick {
      color: var(--accent);
    }
    .note {
      padding: 6px 10px 4px;
      border-top: 1px solid var(--line);
      margin-top: 4px;
      color: var(--muted);
      font-size: 13px;
    }
  `,
})
export class ThemePicker {
  protected readonly theme = inject(ThemeService);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Icon-only trigger (the accessible name still says the current theme). */
  readonly compact = input(false);
  /** Shows a visible "Theme" label beside the trigger, e.g. inside a settings menu. */
  readonly showLabel = input(false);
  /** Which edge the menu lines up with. */
  readonly align = input<'start' | 'end'>('end');

  protected readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  protected readonly items = viewChildren<ElementRef<HTMLButtonElement>>('item');

  protected readonly options = OPTIONS;
  protected readonly open = signal(false);
  protected readonly current = computed(
    () => OPTIONS.find((o) => o.value === this.theme.preference()) ?? OPTIONS[0]!,
  );

  readonly #id = nextId++;
  protected readonly menuId = `theme-menu-${this.#id}`;
  protected readonly labelId = `theme-label-${this.#id}`;

  protected toggle(): void {
    if (this.open()) {
      this.close(false);
    } else {
      this.#openMenu('checked');
    }
  }

  protected openAndFocus(event: Event, target: 'checked' | 'last'): void {
    event.preventDefault();
    this.#openMenu(target);
  }

  protected choose(value: ThemePreference): void {
    this.theme.setPreference(value);
    this.close(true);
  }

  protected close(restoreFocus: boolean): void {
    this.open.set(false);
    if (restoreFocus) this.trigger().nativeElement.focus();
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    const items = this.items().map((i) => i.nativeElement);
    const index = items.indexOf(event.target as HTMLButtonElement);
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(items.length - 1);
        break;
      case 'Escape':
        // Don't let a surrounding menu (e.g. the account menu) close too.
        event.preventDefault();
        event.stopPropagation();
        this.close(true);
        break;
      case 'Tab':
        this.close(false);
        break;
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.#host.nativeElement.contains(event.target as Node)) {
      this.close(false);
    }
  }

  #openMenu(target: 'checked' | 'last'): void {
    this.open.set(true);
    // Wait for the menu to render, then move focus into it.
    setTimeout(() => {
      const items = this.items().map((i) => i.nativeElement);
      const checked = items.findIndex((el) => el.getAttribute('aria-checked') === 'true');
      items[target === 'last' ? items.length - 1 : Math.max(checked, 0)]?.focus();
    });
  }
}
