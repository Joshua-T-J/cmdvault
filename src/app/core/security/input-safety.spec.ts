import {
  containsMarkup,
  findUnsafeChars,
  isValidTag,
  placeholderValueProblem,
  sanitizeCommand,
  sanitizePlainText,
  sanitizeTag,
  stripMarkup,
  stripUnsafeChars,
} from './input-safety';

describe('containsMarkup', () => {
  it.each([
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '<iframe src="https://evil.example">',
    '<a href="javascript:alert(1)">x</a>',
    'javascript:alert(document.cookie)',
    'JaVaScRiPt :alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    '<div style="x">',
    '</title>',
    '<!-- comment -->',
    'x onmouseover="alert(1)"',
  ])('flags %s', (input) => {
    expect(containsMarkup(input)).toBe(true);
  });

  it.each([
    'git checkout <branch>',
    'Copy <src> to <dest>',
    'Redirect stderr 2>&1 to a file',
    'Find files where size < 10MB',
    'Read from < input.txt',
    'Rebase branch onto main',
    'Use a & b, then c > d',
  ])('allows %s', (input) => {
    expect(containsMarkup(input)).toBe(false);
  });
});

describe('hidden characters', () => {
  it('finds bidi overrides, zero-width and control characters', () => {
    const text = 'rm -rf ./tmp\u202E\u200B\u0007';
    expect(findUnsafeChars(text).map((c) => c.codePoint)).toEqual(['U+202E', 'U+200B', 'U+0007']);
  });

  it('keeps tabs and newlines, normalises CRLF', () => {
    expect(stripUnsafeChars('a\tb\r\nc\u202Ed\u0000')).toBe('a\tb\ncd');
  });
});

describe('tags', () => {
  it('normalises and strips unsafe characters', () => {
    expect(sanitizeTag(' Kubernetes ')).toBe('kubernetes');
    expect(sanitizeTag('<script>')).toBe('script');
    expect(sanitizeTag('my tag')).toBe('my-tag');
    expect(sanitizeTag('"onmouseover=x')).toBe('onmouseoverx');
    expect(sanitizeTag('c#')).toBe('c#');
  });

  it('validates the allowed character set', () => {
    expect(isValidTag('k8s')).toBe(true);
    expect(isValidTag('node.js')).toBe(true);
    expect(isValidTag('a<b')).toBe(false);
    expect(isValidTag('-leading')).toBe(false);
  });
});

describe('untrusted text', () => {
  it('strips markup and script URLs from plain-text fields', () => {
    expect(sanitizePlainText('Hi <img src=x onerror=alert(1)>there', 120, true)).toBe('Hi there');
    expect(sanitizePlainText('javascript:alert(1)', 120, true)).toBe('javascript alert(1)');
    expect(stripMarkup('<script>x</script>ok')).toBe('xok');
  });

  it('collapses single-line fields and enforces length', () => {
    expect(sanitizePlainText('a\nb\tc', 120, true)).toBe('a b c');
    expect(sanitizePlainText('x'.repeat(200), 120, true)).toHaveLength(120);
  });

  it('keeps shell syntax in commands but removes hidden characters', () => {
    expect(sanitizeCommand('cat <in.txt >out.txt 2>&1\u202E')).toBe('cat <in.txt >out.txt 2>&1');
  });
});

describe('placeholderValueProblem', () => {
  it('rejects line breaks and hidden characters', () => {
    expect(placeholderValueProblem('staging')).toBeNull();
    expect(placeholderValueProblem('x\nrm -rf ~')).toMatch(/line breaks/);
    expect(placeholderValueProblem('pod\u202E')).toMatch(/hidden/);
  });
});
