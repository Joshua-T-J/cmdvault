// Fails the build if source code uses APIs that bypass Angular's XSS protection,
// or contains hidden Unicode characters that could disguise code ("Trojan Source").
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
const EXTENSIONS = ['.ts', '.html', '.scss'];

const UNSAFE_APIS = [
  { re: /\[innerHTML\]|\.innerHTML\s*=/, why: 'renders HTML; use text interpolation instead' },
  { re: /\[outerHTML\]|\.outerHTML\s*=/, why: 'renders HTML' },
  { re: /insertAdjacentHTML\s*\(/, why: 'renders HTML' },
  { re: /document\.write(ln)?\s*\(/, why: 'renders HTML' },
  { re: /bypassSecurityTrust\w*\s*\(/, why: 'disables Angular sanitisation' },
  { re: /\beval\s*\(/, why: 'executes strings as code' },
  { re: /new\s+Function\s*\(/, why: 'executes strings as code' },
  { re: /\[srcdoc\]|\bsrcdoc\s*=/, why: 'renders HTML in an iframe' },
  { re: /\[attr\.on\w+\]/, why: 'binds an inline event handler attribute' },
];

// Bidi controls, zero-width characters, BOM, line separators and C0 controls (except tab/LF/CR).
const HIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200F\u202A-\u202E\u2028\u2029\u2060-\u2064\u2066-\u2069\uFEFF]/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTENSIONS.some((ext) => path.endsWith(ext))) yield path;
  }
}

const problems = [];
for (const file of walk(ROOT)) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const { re, why } of UNSAFE_APIS) {
        if (re.test(line)) problems.push(`${file}:${i + 1}  ${re.source}  — ${why}`);
      }
      const hidden = line.match(HIDDEN);
      if (hidden) {
        const cp = hidden[0].codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
        problems.push(`${file}:${i + 1}  hidden character U+${cp} — write it as an escape (\\u${cp})`);
      }
    });
}

if (problems.length) {
  console.error('check-unsafe-code: found unsafe code\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('check-unsafe-code: no unsafe HTML APIs or hidden characters found');
