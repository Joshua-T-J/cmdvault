import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';
import {
  LIMITS,
  findUnsafeChars,
  plainTextProblem,
  stripUnsafeChars,
  tagsProblem,
} from '../../../core/security/input-safety';
import { replaceSecrets, scanForSecrets } from '../../../core/security/secret-scanner';
import { Command, SHELLS, Shell } from '../../../core/storage/vault.models';
import { Icon } from '../../../shared/icon/icon';
import { CommandStore, parseTags } from '../command.store';

interface EditorModel {
  title: string;
  command: string;
  tags: string;
  shell: Shell;
  notes: string;
}

interface Segment {
  text: string;
  secret: boolean;
}

const EMPTY: EditorModel = { title: '', command: '', tags: '', shell: 'bash', notes: '' };

const SHELL_LABELS: Record<Shell, string> = {
  bash: 'bash',
  zsh: 'zsh',
  fish: 'fish',
  powershell: 'PowerShell',
  cmd: 'cmd',
  other: 'Other',
};

/** "New command" / "Edit command" modal with the pre-save secret check. */
@Component({
  selector: 'app-command-editor',
  imports: [FormField, Icon],
  templateUrl: './command-editor.html',
  styleUrl: './command-editor.scss',
  host: {
    '(keydown.control.enter)': 'save($event)',
    '(keydown.meta.enter)': 'save($event)',
  },
})
export class CommandEditor {
  readonly #store = inject(CommandStore);
  protected readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly commandInput =
    viewChild.required<ElementRef<HTMLTextAreaElement>>('commandInput');

  readonly saved = output<Command>();
  readonly closed = output<void>();

  protected readonly shells = SHELLS.map((value) => ({ value, label: SHELL_LABELS[value] }));
  protected readonly editingId = signal<string | null>(null);
  protected readonly confirmDelete = signal(false);

  protected readonly model = signal<EditorModel>({ ...EMPTY });
  protected readonly editor = form(this.model, (path) => {
    required(path.title, { message: 'Give the command a title.' });
    maxLength(path.title, LIMITS.title, { message: 'Keep the title under 120 characters.' });
    validate(path.title, ({ value }) => unsafe(plainTextProblem(value())));
    required(path.command, { message: 'Enter the command.' });
    maxLength(path.command, LIMITS.command, {
      message: 'Commands are limited to 4,000 characters.',
    });
    // Shell syntax (<, >, &) is fine in commands; hidden characters that disguise them are not.
    validate(path.command, ({ value }) =>
      findUnsafeChars(value()).length
        ? { kind: 'hidden-chars', message: 'This command contains hidden characters.' }
        : undefined,
    );
    validate(path.tags, ({ value }) => unsafe(tagsProblem(value())));
    maxLength(path.notes, LIMITS.notes, { message: 'Notes are limited to 1,000 characters.' });
    validate(path.notes, ({ value }) => unsafe(plainTextProblem(value())));
  });

  /** Hidden characters (e.g. right-to-left override) that could disguise what a command does. */
  protected readonly hiddenChars = computed(() => findUnsafeChars(this.model().command));
  protected readonly hiddenCharList = computed(() =>
    [...new Set(this.hiddenChars().map((c) => c.codePoint))].join(', '),
  );

  protected readonly secrets = computed(() => scanForSecrets(this.model().command));
  protected readonly hasSecrets = computed(() => this.secrets().length > 0);
  protected readonly secretHeadline = computed(() => {
    const kind = this.secrets()[0]?.kind;
    if (!kind) return '';
    if (kind === 'Stripe key' || kind === 'API key') return 'This looks like a live API key.';
    return `This looks like a secret (${kind.toLowerCase()}).`;
  });
  protected readonly segments = computed<Segment[]>(() => {
    const text = this.model().command;
    const out: Segment[] = [];
    let cursor = 0;
    for (const m of this.secrets()) {
      if (m.start > cursor) out.push({ text: text.slice(cursor, m.start), secret: false });
      out.push({ text: text.slice(m.start, m.end), secret: true });
      cursor = m.end;
    }
    if (cursor < text.length) out.push({ text: text.slice(cursor), secret: false });
    return out;
  });

  protected readonly heading = computed(() => (this.editingId() ? 'Edit command' : 'New command'));

  protected errorFor(field: 'title' | 'command' | 'tags' | 'notes'): string | null {
    const state = this.editor[field]();
    if (!state.touched()) return null;
    // Hidden characters in the command get their own alert with a fix button.
    const error = state.errors().find((e) => e.kind !== 'hidden-chars');
    return error?.message ?? null;
  }

  protected removeHiddenChars(): void {
    this.model.update((m) => ({ ...m, command: stripUnsafeChars(m.command) }));
    this.commandInput().nativeElement.focus();
  }

  open(command?: Command): void {
    this.editingId.set(command?.id ?? null);
    this.confirmDelete.set(false);
    this.model.set(
      command
        ? {
            title: command.title,
            command: command.command,
            tags: command.tags.join(', '),
            shell: command.shell ?? 'bash',
            notes: command.description ?? '',
          }
        : { ...EMPTY },
    );
    this.editor().reset();
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected onClosed(): void {
    this.closed.emit();
  }

  protected replaceWithPlaceholder(): void {
    const { command } = this.model();
    this.model.update((m) => ({ ...m, command: replaceSecrets(command, this.secrets()) }));
    // The warning (and the button that was clicked) disappears, so keep focus in the dialog.
    this.commandInput().nativeElement.focus();
  }

  protected async save(event?: Event): Promise<void> {
    event?.preventDefault();
    if (this.hasSecrets()) return;
    await submit(this.editor, async () => {
      const value = this.model();
      const saved = this.#store.save(
        {
          title: value.title,
          command: value.command,
          tags: parseTags(value.tags),
          shell: value.shell,
          description: value.notes,
        },
        this.editingId() ?? undefined,
      );
      this.saved.emit(saved);
      this.close();
      return undefined;
    });
  }

  protected remove(): void {
    const id = this.editingId();
    if (!id) return;
    if (!this.confirmDelete()) {
      this.confirmDelete.set(true);
      return;
    }
    this.#store.remove(id);
    this.close();
  }
}

function unsafe(message: string | null) {
  return message ? { kind: 'unsafe-input', message } : undefined;
}
