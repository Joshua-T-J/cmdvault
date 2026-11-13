import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AUTH_STRATEGY } from './auth-strategy';
import { AuthStore } from './auth.store';

/** Unauthenticated visitors never download the vault chunk; they are sent to the wizard. */
export const authGuard: CanMatchFn = async () => {
  const store = inject(AuthStore);
  const auth = inject(AUTH_STRATEGY);
  const router = inject(Router);

  if (store.isAuthenticated()) return true;
  if (await auth.restore()) {
    store.markConnected(null);
    return true;
  }
  return router.createUrlTree(['/app/connect']);
};
