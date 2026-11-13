import { Component, inject, output } from '@angular/core';
import { Icon } from '../../../shared/icon/icon';
import { CommandFilter, CommandStore } from '../command.store';

@Component({
  selector: 'app-tag-sidebar',
  imports: [Icon],
  template: `
    <nav class="filters" aria-label="Filter by tag">
      <ul>
        <li>
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="store.isFilterActive(all)"
            (click)="store.setFilter(all)"
          >
            <span>All</span><span class="count">{{ store.commands().length }}</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="store.isFilterActive(favorites)"
            (click)="store.setFilter(favorites)"
          >
            <span>Favorites</span><span class="count">{{ store.favoritesCount() }}</span>
          </button>
        </li>
        @for (t of store.tagCounts(); track t.tag) {
          <li>
            <button
              type="button"
              class="chip mono-chip"
              [attr.aria-pressed]="store.isFilterActive({ kind: 'tag', tag: t.tag })"
              (click)="store.setFilter({ kind: 'tag', tag: t.tag })"
            >
              <span>{{ t.tag }}</span><span class="count">{{ t.count }}</span>
            </button>
          </li>
        }
      </ul>
    </nav>

    <div class="tools">
      <button type="button" class="btn btn-ghost tool" (click)="importClicked.emit()">
        <app-icon name="upload" [size]="16" /> Import
      </button>
      <button type="button" class="btn btn-ghost tool" (click)="exportClicked.emit()">
        <app-icon name="download" [size]="16" /> Export JSON
      </button>
      <button type="button" class="btn btn-ghost tool" (click)="shortcutsClicked.emit()">
        <app-icon name="keyboard" [size]="16" /> Keyboard shortcuts
      </button>
    </div>
  `,
  styles: `
    /* Sticky: the filters stay in view while a long command list scrolls past. */
    :host {
      position: sticky;
      top: 16px;
      align-self: start;
      display: flex;
      flex-direction: column;
      gap: 24px;
      min-width: 0;
      max-height: calc(100dvh - 32px);
    }
    /* Many tags scroll inside the sidebar; the tools below stay visible. */
    .filters {
      flex: 0 1 auto;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      /* Room for the chips' focus ring inside the scroll area. */
      padding: 3px;
      margin: -3px;
    }
    ul {
      display: grid;
      gap: 4px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .chip {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid transparent;
      border-radius: var(--radius);
      background: transparent;
      color: var(--body);
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
    }
    .chip:hover {
      background: color-mix(in srgb, var(--line) 55%, transparent);
    }
    .chip[aria-pressed='true'] {
      border-color: var(--accent);
      background: var(--surface);
      color: var(--accent);
      font-weight: 600;
    }
    .mono-chip span:first-child {
      font-family: var(--font-mono);
      font-size: 14px;
    }
    .count {
      color: var(--muted);
      font-size: 13px;
      font-variant-numeric: tabular-nums;
    }
    .tools {
      flex: none;
      display: grid;
      gap: 2px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
    }
    .tool {
      justify-content: flex-start;
    }
    @media (max-width: 760px) {
      /* Phones: the chip row sticks to the top of the screen instead. */
      :host {
        top: 0;
        z-index: 10;
        max-height: none;
        margin: 0 -16px;
        padding: 8px 16px;
        border-bottom: 1px solid var(--line);
        background: var(--page);
      }
      .filters {
        overflow: visible;
      }
      ul {
        display: flex;
        overflow-x: auto;
        padding-bottom: 4px;
      }
      .chip {
        width: auto;
        border-color: var(--line);
        border-radius: 999px;
      }
      .tools {
        display: none;
      }
    }
  `,
})
export class TagSidebar {
  protected readonly store = inject(CommandStore);
  protected readonly all: CommandFilter = { kind: 'all' };
  protected readonly favorites: CommandFilter = { kind: 'favorites' };

  readonly importClicked = output<void>();
  readonly exportClicked = output<void>();
  readonly shortcutsClicked = output<void>();
}
