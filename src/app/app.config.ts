import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';
import { AUTH_STRATEGY } from './core/auth/auth-strategy';
import { PatAuthStrategy } from './core/auth/pat-auth.strategy';
import {
  apiVersionInterceptor,
  authInterceptor,
  errorInterceptor,
  rateLimitInterceptor,
} from './core/http/interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(
      withFetch(),
      // Order matters: errorInterceptor sits outside auth/rate-limit so they see raw responses.
      withInterceptors([
        apiVersionInterceptor,
        errorInterceptor,
        authInterceptor,
        rateLimitInterceptor,
      ]),
    ),
    // The only line Option B (Sign in with GitHub) changes.
    { provide: AUTH_STRATEGY, useClass: PatAuthStrategy },
  ],
};
