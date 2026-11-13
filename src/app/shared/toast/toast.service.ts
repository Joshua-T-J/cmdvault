import { Service, signal } from '@angular/core';

const TOAST_MS = 2600;

/** One polite toast at a time, announced through an `aria-live` region in `Toast`. */
@Service()
export class ToastService {
  readonly #message = signal<string | null>(null);
  readonly message = this.#message.asReadonly();
  #timer: ReturnType<typeof setTimeout> | null = null;

  show(message: string): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#message.set(message);
    this.#timer = setTimeout(() => this.#message.set(null), TOAST_MS);
  }

  dismiss(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#message.set(null);
  }
}
