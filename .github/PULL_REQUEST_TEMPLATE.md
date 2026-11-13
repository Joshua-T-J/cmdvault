## What does this change?

<!-- A short summary of the change and why it's needed. -->

Closes #

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor (no behaviour change)
- [ ] Docs
- [ ] Build / tooling

## How was it tested?

<!-- Steps a reviewer can follow, and the browsers/devices you tried. -->

## Screenshots

<!-- For UI changes: before and after, light and dark, desktop and phone if relevant. -->

## Checklist

- [ ] `npm test` and `npm run build` pass
- [ ] I followed the coding standards in `CLAUDE.md` (signals, `input()`/`output()`, native control flow, no `any`)
- [ ] New logic has unit tests
- [ ] Accessibility: keyboard works, focus is visible, controls have labels, contrast meets WCAG AA
- [ ] Security: no `[innerHTML]` with user content, no `bypassSecurityTrust*`, the token is only sent to `api.github.com`, new text inputs are validated with `core/security/input-safety.ts`
- [ ] No tokens, secrets or personal data in code, tests, screenshots or commit history
- [ ] Any new dependency has an MIT-compatible licence and is added to `THIRD_PARTY_NOTICES.md`
- [ ] Docs updated (README, privacy or security page) if behaviour changed
