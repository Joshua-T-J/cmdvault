import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/seo/seo.service';
import { ISSUES_URL, SECURITY_ADVISORY_URL } from '../../../core/site.config';
import { DocLayout, TocEntry } from '../doc-layout/doc-layout';

@Component({
  selector: 'app-security-page',
  imports: [RouterLink, DocLayout],
  templateUrl: './security-page.html',
})
export default class SecurityPage {
  protected readonly issuesUrl = ISSUES_URL;
  protected readonly advisoryUrl = SECURITY_ADVISORY_URL;
  protected readonly toc: readonly TocEntry[] = [
    { id: 'summary', label: 'Straight talk' },
    { id: 'how-it-works', label: 'How data flows' },
    { id: 'token', label: 'Your GitHub token' },
    { id: 'secret-check', label: 'The secret check' },
    { id: 'input', label: 'Input validation' },
    { id: 'sync', label: 'Saving and sync' },
    { id: 'browser', label: 'Browser protections' },
    { id: 'encryption', label: 'Encryption' },
    { id: 'limits', label: 'What we can’t protect' },
    { id: 'checklist', label: 'Best practices' },
    { id: 'leaked', label: 'If your token leaks' },
    { id: 'report', label: 'Report a vulnerability' },
  ];

  protected readonly patterns: readonly string[] = [
    'GitHub tokens (ghp_, gho_, ghs_, github_pat_ …)',
    'AWS access key IDs',
    'Slack tokens',
    'Stripe secret keys',
    'Generic sk- API keys',
    'Google API keys',
    'Private key blocks (-----BEGIN … PRIVATE KEY-----)',
    'JSON Web Tokens',
    'password=, secret=, token= assignments',
    'Usernames and passwords inside URLs',
    'Long random-looking strings (high entropy)',
  ];

  constructor() {
    inject(SeoService).set({
      title: 'Security model · GistVault',
      description:
        'How GistVault protects your commands and GitHub token: direct-to-GitHub requests, in-memory tokens, a pre-save secret check, strict CSP, and honest limits.',
      path: '/security',
    });
  }
}
