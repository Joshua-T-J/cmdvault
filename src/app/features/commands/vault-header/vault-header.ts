import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { SyncService } from '../../../core/storage/sync.service';
import { Icon } from '../../../shared/icon/icon';
import { Logo } from '../../../shared/logo/logo';
import { ThemePicker } from '../../../shared/theme-picker/theme-picker';
import { CommandStore } from '../command.store';

@Component({
  selector: 'app-vault-header',
  imports: [RouterLink, Icon, Logo, ThemePicker],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'closeMenu(true)',
  },
  template: `
    <header class="bar">
      <a routerLink="/app" class="home-link" aria-label="GistVault — all commands"><app-logo /></a>

      <div class="search" role="search">
        <label for="vault-search" class="visually-hidden">Search title, command or tag</label>
        <app-icon name="search" class="search-icon" />
        <input
          #search
          id="vault-search"
          type="search"
          class="input"
          placeholder="Search title, command or tag"
          autocomplete="off"
          [value]="store.query()"
          (input)="onSearch($event)"
        />
        <kbd class="kbd key-hint" aria-hidden="true">/</kbd>
      </div>

      <p class="status" role="status" aria-live="polite">
        @switch (sync.status()) {
          @case ('saving') {
            <span class="spinner" aria-hidden="true"></span> Saving…
          }
          @case ('loading') {
            <span class="spinner" aria-hidden="true"></span> Loading…
          }
          @case ('offline') {
            <app-icon name="warning" [size]="16" /> Offline
          }
          @case ('error') {
            <app-icon name="warning" [size]="16" /> Not synced
          }
          @case ('synced') {
            <span class="ok"><app-icon name="check" [size]="16" /></span> Synced to your gist
          }
        }
      </p>

      <button type="button" class="btn btn-primary" (click)="newCommand.emit()">
        <app-icon name="plus" [size]="16" /> <span class="new-label">New command</span>
      </button>

      <div class="account">
        <button
          #menuButton
          type="button"
          class="avatar"
          aria-label="Account menu"
          aria-haspopup="true"
          aria-controls="account-menu"
          [attr.aria-expanded]="menuOpen()"
          (click)="toggleMenu()"
        >
          {{ auth.initials() }}
        </button>
        @if (menuOpen()) {
          <div id="account-menu" class="menu card">
            @if (auth.user(); as user) {
              <p class="signed-in">
                Signed in as <strong>&#64;{{ user.login }}</strong>
              </p>
            }
            <app-theme-picker class="menu-theme" [showLabel]="true" />
            <a routerLink="/security" class="btn btn-ghost item">
              <app-icon name="shield" [size]="16" /> Security model
            </a>
            <a routerLink="/privacy" class="btn btn-ghost item">
              <app-icon name="eye" [size]="16" /> Privacy policy
            </a>
            <button type="button" class="btn btn-ghost item" (click)="signOut.emit()">
              <app-icon name="logout" [size]="16" /> Sign out
            </button>
          </div>
        }
      </div>
    </header>
  `,
  styleUrl: './vault-header.scss',
})
export class VaultHeader {
  protected readonly store = inject(CommandStore);
  protected readonly sync = inject(SyncService);
  protected readonly auth = inject(AuthStore);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly newCommand = output<void>();
  readonly signOut = output<void>();

  protected readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('search');
  protected readonly menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');
  protected readonly menuOpen = signal(false);

  focusSearch(): void {
    const input = this.searchInput().nativeElement;
    input.focus();
    input.select();
  }

  protected onSearch(event: Event): void {
    this.store.setQuery((event.target as HTMLInputElement).value);
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(restoreFocus = false): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (restoreFocus) this.menuButton().nativeElement.focus();
  }

  protected onDocumentClick(event: MouseEvent): void {
    const account = this.#host.nativeElement.querySelector('.account');
    if (account && !account.contains(event.target as Node)) this.closeMenu();
  }
}
