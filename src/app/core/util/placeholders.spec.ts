import { fillPlaceholders, parsePlaceholders } from './placeholders';

describe('placeholders', () => {
  it('parses unique placeholders in order, with defaults', () => {
    expect(
      parsePlaceholders('kubectl exec -it {{pod}} -n {{ namespace:default }} {{pod}}'),
    ).toEqual([{ name: 'pod' }, { name: 'namespace', default: 'default' }]);
  });

  it('fills values, falls back to defaults, and keeps unknown tokens', () => {
    const cmd = 'ssh {{user:root}}@{{host}} -p {{port}}';
    expect(fillPlaceholders(cmd, { host: 'example.com' })).toBe('ssh root@example.com -p {{port}}');
  });
});
