// Writes robots.txt and sitemap.xml into the build output, using SITE_URL from
// src/app/core/site.config.ts. On Vercel it also warns when SITE_URL doesn't match the
// project's production domain (VERCEL_PROJECT_PRODUCTION_URL), so canonical links stay correct.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = 'dist/gistvault/browser';
const config = readFileSync('src/app/core/site.config.ts', 'utf8');
const match = config.match(/export const SITE_URL = '([^']+)'/);
if (!match) {
  console.error('generate-seo-files: SITE_URL not found in src/app/core/site.config.ts');
  process.exit(1);
}
const siteUrl = match[1].replace(/\/$/, '');

const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
if (production && `https://${production}` !== siteUrl) {
  console.warn(
    `generate-seo-files: WARNING — SITE_URL is ${siteUrl} but this Vercel project's production ` +
      `domain is https://${production}. Update SITE_URL in src/app/core/site.config.ts.`,
  );
}

// Public, indexable pages. /app/** is private and stays out (it sends noindex instead).
const pages = ['/', '/security', '/privacy', '/licenses'];

writeFileSync(
  join(out, 'robots.txt'),
  `User-agent: *\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`,
);

const urls = pages
  .map((path) => `  <url>\n    <loc>${siteUrl}${path === '/' ? '/' : path}</loc>\n  </url>`)
  .join('\n');
writeFileSync(
  join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);

console.log(`generate-seo-files: wrote robots.txt and sitemap.xml for ${siteUrl}`);
