# Security policy

## Reporting a vulnerability

**Please don't report security problems in public issues, discussions or pull requests.**

Use GitHub's private vulnerability reporting instead: open the repository's **Security** tab and
choose **Report a vulnerability**. Please include:

- what the problem is and what an attacker could do with it,
- steps to reproduce (a proof of concept helps),
- the browser and version you used.

We aim to acknowledge reports within **3 working days**, keep you updated while we work on a fix,
and credit you in the release notes if you'd like.

## Supported versions

GistVault is a continuously deployed web app. Only the latest version on `main` is supported.

## Scope

In scope:

- leaking the GitHub token (to storage, logs, other origins or the page),
- cross-site scripting or other script injection,
- writing to gists other than the user's GistVault vault,
- bypassing the secret check in a way that silently saves secrets,
- weaknesses in the security headers or Content Security Policy.

Out of scope:

- the documented fact that secret gists are unlisted, not private,
- attacks that need a compromised device, malicious browser extension or compromised GitHub account,
- GitHub's own services and rate limits,
- missing security headers on preview deployments.

See the in-app **Security model** page (`/security`) for how GistVault is designed.
