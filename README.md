# CmdVault

> Save the shell commands you look up twice — in a secret gist on your own GitHub account.

CmdVault is a free, open-source web app for storing, tagging, searching and copying CLI commands
(git, docker, kubectl, anything). There is **no server and no database**: your commands live in one
secret gist that belongs to you, and your browser talks to GitHub directly.

- **Your data, your account** — one secret gist, readable as plain JSON.
- **Placeholders** — write `{{host}}` once, fill it in when you copy. Values are never saved.
- **Secret check** — API keys, tokens and passwords are caught before they reach your gist.
- **Keyboard first** — `/` to search, `n` for a new command, `?` for all shortcuts.
- **Accessible** — built to WCAG 2.2 AA, checked with axe.

> [!IMPORTANT]
> A secret gist is **unlisted, not private**. Anyone with its URL can read it. Don't store real
> secrets in CmdVault — use placeholders. See the in-app **Security model** page (`/security`).

## Getting started

Requirements: Node.js 22.22+ or 24.15+.

```bash
npm install
npm start          # http://localhost:4200
```

To use the app you need a GitHub token with **Gists: Read and write** access only (fine-grained,
no repositories, 90-day expiry recommended). The Connect wizard in the app walks you through it.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Dev server with live reload |
| `npm run build` | Production build into `dist/cmdvault/browser`, plus licence files |
| `npm test` | Security check, then unit tests (Vitest) |
| `npm run check:security` | Fails on unsafe HTML APIs or hidden Unicode characters in `src/` |
| `npm run format` | Format source files with Prettier |

## Project structure

```
src/app/
├── core/          auth, GitHub API + interceptors, vault storage and sync, secret scanner, SEO
├── features/
│   ├── commands/   the vault: vault-page/, command-card/, command-editor/, … + command.store.ts
│   ├── onboarding/ connect-page/, token-help/
│   └── marketing/  home-page/, privacy-page/, security-page/, licenses-page/, …
└── shared/        icon/, logo/, theme-picker/, toast/, site-footer/, …
```

Each component lives in a folder named after it (`command-card/command-card.ts`, with its template
and styles beside it), following the Angular style guide.

Coding standards for contributors (and AI assistants) are in [`CLAUDE.md`](CLAUDE.md): standalone
components, signals, `input()`/`output()`, native control flow, Signal Forms, and no `any`.

## Deploying

The app is a static site. On Vercel, import the repository; `vercel.json` sets the build command,
output folder, SPA rewrites and security headers. Other static hosts work too — serve
`dist/cmdvault/browser` with a fallback to `index.html`.

Before publishing your own deployment, replace `OWNER/REPO` in
[`src/app/core/site.config.ts`](src/app/core/site.config.ts) and
[`.github/ISSUE_TEMPLATE/config.yml`](.github/ISSUE_TEMPLATE/config.yml), and update the origin in
`src/app/core/seo/seo.service.ts` and `public/robots.txt`.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our
[Code of Conduct](CODE_OF_CONDUCT.md). Found a security issue? Follow [SECURITY.md](SECURITY.md)
instead of opening a public issue.

## License

[MIT](LICENSE) © 2026 Joshua T J and CmdVault contributors.
Third-party software and fonts are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

CmdVault is not affiliated with, endorsed by or sponsored by GitHub, Inc. GitHub and the GitHub
logo are trademarks of GitHub, Inc.
