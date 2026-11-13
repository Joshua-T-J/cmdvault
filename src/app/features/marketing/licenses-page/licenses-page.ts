import { Component, inject } from '@angular/core';
import { LICENSE_URL } from '../../../core/site.config';
import { SeoService } from '../../../core/seo/seo.service';
import { DocLayout, TocEntry } from '../doc-layout/doc-layout';

interface Credit {
  name: string;
  url: string;
  license: string;
  copyright: string;
  text?: string;
}

@Component({
  selector: 'app-licenses-page',
  imports: [DocLayout],
  template: `
    <app-doc-layout
      eyebrow="licenses"
      heading="Open-source licenses"
      lead="CmdVault is free software under the MIT License, and it is built on other people’s open-source work. This page credits them and links to every licence text that ships with the app."
      updated="13 November 2026"
      path="/licenses"
      [toc]="toc"
    >
      <section id="cmdvault">
        <h2>CmdVault</h2>
        <p>
          Copyright © 2026 Joshua T J and CmdVault contributors. Released under the
          <strong>MIT License</strong>: you may use, copy, modify and distribute it, including
          commercially, as long as the copyright notice and licence are kept.
        </p>
        <p>
          <a href="/licenses/cmdvault.txt">Read the MIT License</a> ·
          <a [href]="licenseUrl" rel="noopener">View it on GitHub</a>
        </p>
      </section>

      <section id="fonts">
        <h2>Fonts</h2>
        <p>
          The fonts are self-hosted from
          <a href="https://fontsource.org" rel="noopener">Fontsource</a> packages and licensed under
          the <strong>SIL Open Font License 1.1</strong>, which allows bundling them with software
          as long as their licence travels with them.
        </p>
        <ul class="credits">
          @for (font of fonts; track font.name) {
            <li>
              <a [href]="font.url" rel="noopener">{{ font.name }}</a> — {{ font.license }}.
              {{ font.copyright }}.
              <a [href]="font.text">Licence text</a>
            </li>
          }
        </ul>
      </section>

      <section id="software">
        <h2>Software</h2>
        <p>These packages are compiled into the app you download:</p>
        <ul class="credits">
          @for (lib of software; track lib.name) {
            <li>
              <a [href]="lib.url" rel="noopener">{{ lib.name }}</a> — {{ lib.license }}.
              {{ lib.copyright }}.
            </li>
          }
        </ul>
        <p>
          The full licence texts, generated from the exact versions in this build, are in
          <a href="/licenses/third-party.txt">third-party.txt</a>.
        </p>
      </section>

      <section id="icons">
        <h2>Icons and artwork</h2>
        <p>
          The CmdVault logo and interface icons are original line drawings made for this project and
          are covered by CmdVault’s MIT License.
        </p>
        <p>
          The GitHub mark used on “Connect GitHub” buttons comes from
          <a href="https://github.com/primer/octicons" rel="noopener">Octicons</a> (MIT License,
          copyright GitHub Inc.) and is used unmodified, as GitHub’s logo guidelines allow, to show
          that the button connects to GitHub.
        </p>
      </section>

      <section id="trademarks">
        <h2>Trademarks</h2>
        <p>
          GitHub and the GitHub logo are trademarks of GitHub, Inc. Vercel is a trademark of Vercel
          Inc. Other names are trademarks of their respective owners. They are used here only to
          describe what CmdVault works with.
          <strong>CmdVault is not affiliated with, endorsed by or sponsored by GitHub, Inc.</strong>
        </p>
      </section>
    </app-doc-layout>
  `,
  styles: `
    .credits {
      display: grid;
      gap: 10px;
    }
  `,
})
export default class LicensesPage {
  protected readonly licenseUrl = LICENSE_URL;

  protected readonly toc: readonly TocEntry[] = [
    { id: 'cmdvault', label: 'CmdVault' },
    { id: 'fonts', label: 'Fonts' },
    { id: 'software', label: 'Software' },
    { id: 'icons', label: 'Icons and artwork' },
    { id: 'trademarks', label: 'Trademarks' },
  ];

  protected readonly fonts: readonly Credit[] = [
    {
      name: 'Inter',
      url: 'https://github.com/rsms/inter',
      license: 'SIL OFL 1.1',
      copyright: 'Copyright 2016 The Inter Project Authors',
      text: '/licenses/fonts/inter.txt',
    },
    {
      name: 'Space Grotesk',
      url: 'https://github.com/floriankarsten/space-grotesk',
      license: 'SIL OFL 1.1',
      copyright: 'Copyright 2020 The Space Grotesk Project Authors',
      text: '/licenses/fonts/space-grotesk.txt',
    },
    {
      name: 'JetBrains Mono',
      url: 'https://github.com/JetBrains/JetBrainsMono',
      license: 'SIL OFL 1.1',
      copyright: 'Copyright 2020 The JetBrains Mono Project Authors',
      text: '/licenses/fonts/jetbrains-mono.txt',
    },
  ];

  protected readonly software: readonly Credit[] = [
    {
      name: 'Angular',
      url: 'https://github.com/angular/angular',
      license: 'MIT License',
      copyright: 'Copyright Google LLC',
    },
    {
      name: 'RxJS',
      url: 'https://github.com/ReactiveX/rxjs',
      license: 'Apache License 2.0',
      copyright: 'Copyright Google, Inc., Netflix, Inc., Microsoft Corp. and contributors',
    },
    {
      name: 'tslib',
      url: 'https://github.com/microsoft/tslib',
      license: '0BSD',
      copyright: 'Copyright Microsoft Corporation',
    },
  ];

  constructor() {
    inject(SeoService).set({
      title: 'Open-source licenses · CmdVault',
      description:
        'CmdVault is MIT-licensed and built on Angular, RxJS and OFL-licensed fonts. Credits, licence texts and trademark notes.',
      path: '/licenses',
    });
  }
}
