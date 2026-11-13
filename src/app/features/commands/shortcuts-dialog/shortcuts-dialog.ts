import { Component, ElementRef, viewChild } from '@angular/core';
import { Icon } from '../../../shared/icon/icon';

@Component({
  selector: 'app-shortcuts-dialog',
  imports: [Icon],
  template: `
    <dialog #dialog class="modal narrow" aria-labelledby="keys-title">
      <header class="modal-header">
        <h2 id="keys-title">Keyboard shortcuts</h2>
        <button type="button" class="btn btn-ghost btn-icon" aria-label="Close" (click)="close()">
          <app-icon name="x" />
        </button>
      </header>
      <div class="modal-body">
        <dl>
          @for (row of rows; track row.action) {
            <div class="row">
              <dt>
                @for (key of row.keys; track key) {
                  <kbd class="kbd">{{ key }}</kbd>
                }
              </dt>
              <dd>{{ row.action }}</dd>
            </div>
          }
        </dl>
        <p class="hint">Shortcuts are off while you type in a field.</p>
      </div>
    </dialog>
  `,
  styles: `
    .narrow {
      width: min(480px, calc(100vw - 32px));
    }
    dl {
      display: grid;
      gap: 10px;
      margin: 0;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    dt {
      display: flex;
      gap: 4px;
    }
    dd {
      margin: 0;
      color: var(--ink);
    }
  `,
})
export class ShortcutsDialog {
  protected readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly rows = [
    { keys: ['/'], action: 'Search' },
    { keys: ['n'], action: 'New command' },
    { keys: ['?'], action: 'Show this sheet' },
    { keys: ['Ctrl', 'Enter'], action: 'Save in the editor' },
    { keys: ['Esc'], action: 'Close a dialog' },
  ];

  open(): void {
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }
}
