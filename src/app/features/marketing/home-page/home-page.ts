import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_ORIGIN, SeoService } from '../../../core/seo/seo.service';
import { Icon, IconName } from '../../../shared/icon/icon';
import { GithubMark } from '../../../shared/github-mark/github-mark';
import { SiteFooter } from '../../../shared/site-footer/site-footer';
import { SiteHeader } from '../site-header/site-header';

interface Feature {
  icon: IconName;
  title: string;
  body: string;
}

interface Faq {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, SiteHeader, SiteFooter, Icon, GithubMark],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export default class HomePage {
  protected readonly features: readonly Feature[] = [
    {
      icon: 'terminal',
      title: 'Stored in your gist',
      body: 'Your commands live in one secret gist on your own GitHub account, as plain JSON you can read.',
    },
    {
      icon: 'copy',
      title: 'Copy with placeholders',
      body: 'Write {{host}} or {{port}} once. Fill in the values when you copy — they’re never saved.',
    },
    {
      icon: 'warning',
      title: 'Secret check before save',
      body: 'API keys, tokens and passwords are caught before they reach your gist, with a one-click fix.',
    },
    {
      icon: 'lock',
      title: 'Optional encryption (coming soon)',
      body: 'Lock the vault with a passphrase so anyone with the gist link sees only ciphertext.',
    },
    {
      icon: 'keyboard',
      title: 'Keyboard first',
      body: 'Press / to search, n for a new command, Enter to copy. Your hands stay on the keys.',
    },
    {
      icon: 'download',
      title: 'Import and export',
      body: 'Bring commands in from JSON and take everything out again whenever you like.',
    },
  ];

  protected readonly faqs: readonly Faq[] = [
    {
      question: 'What can the token access?',
      answer:
        'A token with Gists access can read, create, edit and delete all of your gists — GitHub can’t limit it to one. CmdVault only ever writes to its own vault gist. Choose “No repositories”, Gists read and write, and an expiry of 90 days or less.',
    },
    {
      question: 'Why do I paste the token again after a reload?',
      answer:
        'By default the token is kept only in this tab’s memory, so a script can’t find it later in storage. You can tick “Remember for this tab” to keep it until the tab closes.',
    },
    {
      question: 'What happens if I edit on two devices?',
      answer:
        'Before every save CmdVault fetches the latest vault and merges changes per command. If the same command changed in both places, the newer one wins and the other is kept as a “conflicted copy”.',
    },
    {
      question: 'Does it cost anything?',
      answer:
        'No. CmdVault is free and open source, and your data lives in your own GitHub account. There is no server to pay for.',
    },
  ];

  constructor() {
    inject(SeoService).set({
      title: 'CmdVault — save the commands you look up twice',
      description:
        'Free, open-source command vault. Save, tag and copy shell commands in a secret gist on your own GitHub account. No server, no database.',
      path: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'CmdVault',
        url: SITE_ORIGIN,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
      },
    });
  }
}
