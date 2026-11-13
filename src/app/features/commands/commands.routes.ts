import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./vault-page/vault-page'),
  },
] satisfies Routes;
