import { Component, ElementRef, computed, output, signal, viewChild } from '@angular/core';
import { Command } from '../../../core/storage/vault.models';
import { LIMITS, placeholderValueProblem } from '../../../core/security/input-safety';
import { fillPlaceholders } from '../../../core/util/placeholders';
import { Icon } from '../../../shared/icon/icon';

export interface FilledCopy {
  command: Command;
  text: string;
}

/** Fill-in form shown before copying a command with `{{placeholders}}`. Values are never saved. */
@Component({
  selector: 'app-placeholder-dialog',
  imports: [Icon],
  template: `
    <dialog #dialog class="modal narrow" aria-labelledby="fill-title" (close)="reset()">
      <form (submit)="copyFilled($event)">
        <header class="modal-header">
          <h2 id="fill-title">Fill in before copying</h2>
          <button type="button" class="btn btn-ghost btn-icon" aria-label="Close" (click)="close()">
            <app-icon name="x" />
          </button>
        </header>
        @if (command(); as cmd) {
          <div class="modal-body">
            <p class="label">{{ cmd.title }}</p>
            @for (p of cmd.placeholders ?? []; track p.name; let i = $index) {
              <div class="field">
                <label class="label mono" [for]="'ph-' + i">{{ p.name }}</label>
                <input
                  class="input mono"
                  autocomplete="off"
                  spellcheck="false"
                  [id]="'ph-' + i"
                  [attr.maxlength]="maxLength"
                  [value]="values()[p.name] ?? ''"
                  [placeholder]="p.default ?? ''"
                  [attr.aria-invalid]="problems()[p.name] ? 'true' : null"
                  [attr.aria-describedby]="problems()[p.name] ? 'ph-error-' + i : null"
                  (input)="setValue(p.name, $event)"
                />
                @if (problems()[p.name]; as problem) {
                  <p class="error-text" [id]="'ph-error-' + i">{{ problem }}</p>
                }
              </div>
            }
            <div>
              <p class="hint">Preview</p>
              <pre class="code-block"><code>{{ preview() }}</code></pre>
            </div>
            <p class="hint">Values aren’t saved to your vault.</p>
          </div>
          <footer class="modal-footer">
            <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="hasProblems()">
              <app-icon name="copy" [size]="16" /> Copy filled command
            </button>
          </footer>
        }
      </form>
    </dialog>
  `,
  styles: `
    .narrow {
      width: min(560px, calc(100vw - 32px));
    }
  `,
})
export class PlaceholderDialog {
  protected readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  readonly copied = output<FilledCopy>();

  protected readonly command = signal<Command | null>(null);
  protected readonly values = signal<Record<string, string>>({});
  protected readonly maxLength = LIMITS.placeholderValue;

  /** Values that could inject extra lines or hidden characters into the copied command. */
  protected readonly problems = computed(() => {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(this.values())) {
      const problem = placeholderValueProblem(value);
      if (problem) out[name] = problem;
    }
    return out;
  });
  protected readonly hasProblems = computed(() => Object.keys(this.problems()).length > 0);

  protected readonly preview = computed(() => {
    const cmd = this.command();
    return cmd ? fillPlaceholders(cmd.command, this.values()) : '';
  });

  open(command: Command): void {
    this.command.set(command);
    this.values.set({});
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  protected reset(): void {
    this.command.set(null);
    this.values.set({});
  }

  protected setValue(name: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.values.update((v) => ({ ...v, [name]: value }));
  }

  protected copyFilled(event: Event): void {
    event.preventDefault();
    const cmd = this.command();
    if (!cmd || this.hasProblems()) return;
    this.copied.emit({ command: cmd, text: this.preview() });
    this.close();
  }
}
