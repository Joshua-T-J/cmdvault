import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../core/seo/seo.service';
import { ISSUES_URL, SECURITY_ADVISORY_URL } from '../../../core/site.config';
import { DocLayout, TocEntry } from '../doc-layout/doc-layout';

@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink, DocLayout],
  templateUrl: './privacy-page.html',
})
export default class PrivacyPage {
  protected readonly issuesUrl = ISSUES_URL;
  protected readonly advisoryUrl = SECURITY_ADVISORY_URL;
  protected readonly toc: readonly TocEntry[] = [
    { id: 'summary', label: 'The short version' },
    { id: 'data', label: 'What CmdVault handles' },
    { id: 'storage', label: 'Where it is stored' },
    { id: 'visibility', label: 'Who can see your vault' },
    { id: 'not-collected', label: 'What we don’t collect' },
    { id: 'third-parties', label: 'GitHub and hosting' },
    { id: 'controls', label: 'Your controls' },
    { id: 'changes', label: 'Changes and contact' },
  ];

  constructor() {
    inject(SeoService).set({
      title: 'Privacy policy · CmdVault',
      description:
        'CmdVault has no server and no database. Your commands live in a secret gist on your GitHub account. Here is exactly what is stored, where, and for how long.',
      path: '/privacy',
    });
  }
}
