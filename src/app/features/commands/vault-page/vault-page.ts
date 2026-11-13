import {
  Component,
  DOCUMENT,
  ElementRef,
  afterRenderEffect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { SessionService } from '../../../core/auth/session.service';
import { describeError, isGitHubError } from '../../../core/github/github-errors';
import { SeoService } from '../../../core/seo/seo.service';
import { SyncService } from '../../../core/storage/sync.service';
import { Command } from '../../../core/storage/vault.models';
import { Icon } from '../../../shared/icon/icon';
import { SiteFooter } from '../../../shared/site-footer/site-footer';
import { ToastService } from '../../../shared/toast/toast.service';
import { CommandCard } from '../command-card/command-card';
import { CommandEditor } from '../command-editor/command-editor';
import { CommandStore } from '../command.store';
import { FilledCopy, PlaceholderDialog } from '../placeholder-dialog/placeholder-dialog';
import { SAMPLE_COMMANDS } from '../sample-commands';
import { ShortcutsDialog } from '../shortcuts-dialog/shortcuts-dialog';
import { TagSidebar } from '../tag-sidebar/tag-sidebar';
import { VaultHeader } from '../vault-header/vault-header';

const COPIED_MS = 2000;

@Component({
  selector: 'app-vault-page',
  imports: [
    Icon,
    CommandCard,
    CommandEditor,
    PlaceholderDialog,
    ShortcutsDialog,
    TagSidebar,
    VaultHeader,
    SiteFooter,
  ],
  templateUrl: './vault-page.html',
  styleUrl: './vault-page.scss',
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export default class VaultPage {
  protected readonly store = inject(CommandStore);
  protected readonly sync = inject(SyncService);
  protected readonly auth = inject(AuthStore);
  readonly #session = inject(SessionService);
  readonly #toast = inject(ToastService);
  readonly #router = inject(Router);
  readonly #doc = inject(DOCUMENT);

  protected readonly header = viewChild.required(VaultHeader);
  protected readonly editor = viewChild.required(CommandEditor);
  protected readonly fill = viewChild.required(PlaceholderDialog);
  protected readonly shortcuts = viewChild.required(ShortcutsDialog);
  protected readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly mainEl = viewChild.required<ElementRef<HTMLElement>>('main');

  protected readonly copiedId = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);
  #copiedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(SeoService).set({
      title: 'Your commands · CmdVault',
      description: 'Your CmdVault command list.',
      path: '/app',
      noindex: true,
    });
    void this.#init();

    // The filters stay pinned while the list scrolls. When a filter changes far down the page,
    // bring the top of the (now shorter) list back into view instead of leaving empty space.
    let firstRun = true;
    afterRenderEffect(() => {
      this.store.filter();
      if (firstRun) {
        firstRun = false;
        return;
      }
      const main = this.mainEl().nativeElement;
      if (main.getBoundingClientRect().top < 0) {
        const reduceMotion = this.#doc.defaultView?.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches;
        main.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    });
  }

  async #init(): Promise<void> {
    try {
      await this.#session.ensureReady();
    } catch (err) {
      if (isGitHubError(err, 'token-invalid')) {
        await this.#session.logout();
        await this.#router.navigateByUrl('/app/connect');
        return;
      }
      this.loadError.set(describeError(err));
    }
  }

  protected async retry(): Promise<void> {
    this.loadError.set(null);
    await this.#init();
  }

  protected async reconnect(): Promise<void> {
    await this.#session.logout();
    await this.#router.navigateByUrl('/app/connect');
  }

  protected async signOut(): Promise<void> {
    await this.#session.logout();
    this.#toast.show('Signed out. You can revoke the token on GitHub any time.');
    await this.#router.navigateByUrl('/');
  }

  protected openEditor(command?: Command): void {
    this.editor().open(command);
  }

  protected onSaved(command: Command): void {
    this.#toast.show(`Saved “${command.title}”`);
  }

  protected async copy(command: Command): Promise<void> {
    if (command.placeholders?.length) {
      this.fill().open(command);
      return;
    }
    await this.#writeClipboard(command, command.command, 'Copied to clipboard');
  }

  protected async copyFilled({ command, text }: FilledCopy): Promise<void> {
    await this.#writeClipboard(command, text, 'Placeholders filled — copied to clipboard');
  }

  protected addExamples(): void {
    this.store.addMany(SAMPLE_COMMANDS);
    this.#toast.show('Added example commands');
  }

  protected exportJson(): void {
    const blob = new Blob([this.store.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = this.#doc.createElement('a');
    a.href = url;
    a.download = `cmdvault-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.#toast.show('Exported your commands');
  }

  protected chooseImport(): void {
    this.fileInput().nativeElement.click();
  }

  protected async importFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const { added, redacted } = this.store.importJson(await file.text());
      const summary = added
        ? `Imported ${added} command${added === 1 ? '' : 's'}`
        : 'Nothing new to import';
      this.#toast.show(
        redacted
          ? `${summary}. Replaced ${redacted} suspected secret${redacted === 1 ? '' : 's'} with {{API_KEY}}.`
          : summary,
      );
    } catch {
      this.#toast.show('That file isn’t valid CmdVault JSON.');
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        this.header().focusSearch();
      }
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"], dialog[open]')) return;

    switch (event.key) {
      case '/':
        event.preventDefault();
        this.header().focusSearch();
        break;
      case 'n':
        event.preventDefault();
        this.openEditor();
        break;
      case '?':
        event.preventDefault();
        this.shortcuts().open();
        break;
    }
  }

  async #writeClipboard(command: Command, text: string, message: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      this.#toast.show('Couldn’t reach the clipboard. Select the command and copy it manually.');
      return;
    }
    this.store.recordUse(command.id);
    this.copiedId.set(command.id);
    this.#toast.show(message);
    if (this.#copiedTimer) clearTimeout(this.#copiedTimer);
    this.#copiedTimer = setTimeout(() => this.copiedId.set(null), COPIED_MS);
  }
}
