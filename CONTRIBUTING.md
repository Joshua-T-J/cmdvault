# Contributing to GistVault

Thanks for helping! Bug reports, ideas, docs fixes and code are all welcome.

## Before you start

- **Bugs and ideas:** search [existing issues](https://github.com/Joshua-T-J/cmdvault/issues) first, then open one with the matching
  template.
- **Security problems:** don't open a public issue — see [SECURITY.md](SECURITY.md).
- **Bigger changes:** open an issue to discuss the approach before writing a lot of code.

By contributing, you agree that your contributions are licensed under the project's
[MIT License](LICENSE) and that you have the right to submit them.

## Development setup

Requirements: Node.js 22.22+, 24.15+ or 26.

```bash
npm install
npm start        # http://localhost:4200
npm test         # unit tests
npm run build    # production build
```

You'll need a GitHub token with **Gists: Read and write** access to try the vault. Use a test
GitHub account if you can.

## Coding standards

Follow [`CLAUDE.md`](CLAUDE.md). The essentials:

- Strict TypeScript; no `any` (use `unknown`).
- Standalone components (don't set `standalone: true`), signals for state, `computed()` for derived
  state, `input()` / `output()` / `model()` instead of decorators.
- Native control flow (`@if`, `@for`, `@switch`); `class` / `style` bindings instead of `ngClass` /
  `ngStyle`; no `CommonModule`.
- `inject()` instead of constructor injection; `@Service()` for new singleton services.
- Host bindings in the `host` object, not `@HostBinding` / `@HostListener`.
- Signal Forms for new forms.
- **Accessibility is required:** WCAG 2.2 AA, visible focus, labels on every control, no meaning
  conveyed by colour alone, 44 px touch targets.
- **Security:** never render user content with `[innerHTML]`, never use `bypassSecurityTrust*`, and
  never send the token anywhere except `api.github.com`. Validate new text inputs with the helpers in
  `src/app/core/security/input-safety.ts`. `npm run check:security` (run automatically by
  `npm test` and `npm run build`) fails on unsafe HTML APIs and hidden Unicode characters.
- **File layout:** one component per folder, named after the component, e.g.
  `features/commands/command-card/command-card.ts` with its `.html` / `.scss` beside it.

Run `npm run format` before committing.

## Pull requests

1. Fork the repo and create a branch from `main` (`fix/…`, `feat/…`, `docs/…`).
2. Keep each PR focused on one change. Add or update tests for logic changes.
3. Make sure `npm test` and `npm run build` pass.
4. Fill in the pull request template, including screenshots for UI changes.
5. Use clear commit messages, e.g. `fix: keep focus in editor after replacing a secret`.

A maintainer will review your PR. Please be patient and open to feedback.

## Adding dependencies

Keep runtime dependencies to a minimum. Any new dependency must use a licence compatible with MIT
(MIT, BSD, ISC, Apache-2.0, 0BSD, OFL for fonts). Add it to
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and, if it ships in the app, to the
**Open-source licenses** page.
