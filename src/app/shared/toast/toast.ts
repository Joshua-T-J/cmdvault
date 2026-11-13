import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-region" role="status" aria-live="polite" aria-atomic="true">
      @if (toast.message(); as message) {
        <p class="toast">{{ message }}</p>
      }
    </div>
  `,
  styles: `
    .toast-region {
      position: fixed;
      inset-inline: 0;
      bottom: 24px;
      display: flex;
      justify-content: center;
      pointer-events: none;
      z-index: 50;
    }
    .toast {
      margin: 0;
      padding: 12px 18px;
      border-radius: 10px;
      background: #0e1116;
      color: #ffffff;
      font-weight: 500;
      box-shadow: 0 8px 24px rgb(14 17 22 / 25%);
    }
    :host-context(.dark) .toast {
      background: #ffffff;
      color: #0e1116;
    }
  `,
})
export class Toast {
  protected readonly toast = inject(ToastService);
}
