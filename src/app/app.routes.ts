import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/marketing/home-page/home-page'),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./features/marketing/privacy-page/privacy-page'),
  },
  {
    path: 'security',
    loadComponent: () => import('./features/marketing/security-page/security-page'),
  },
  {
    path: 'licenses',
    loadComponent: () => import('./features/marketing/licenses-page/licenses-page'),
  },
  {
    path: 'app/connect',
    loadComponent: () => import('./features/onboarding/connect-page/connect-page'),
  },
  {
    path: 'app',
    canMatch: [authGuard],
    loadChildren: () => import('./features/commands/commands.routes'),
  },
  {
    path: '**',
    loadComponent: () => import('./features/marketing/not-found-page/not-found-page'),
  },
];
