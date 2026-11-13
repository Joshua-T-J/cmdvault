import { VaultTooNewError, mergeVaults, parseVault, vaultSizeLevel } from './vault-codec';
import { Command } from './vault.models';

const NOW = Date.parse('2026-11-13T00:00:00Z');
let counter = 0;
const newId = () => `new-${++counter}`;

function cmd(id: string, patch: Partial<Command> = {}): Command {
  return {
    id,
    title: `Command ${id}`,
    command: `echo ${id}`,
    tags: [],
    favorite: false,
    usageCount: 0,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    rev: 1,
    ...patch,
  };
}

function merge(
  base: Command[] | null,
  local: Command[],
  remote: Command[],
  tombs = { local: [], remote: [] } as {
    local: { id: string; deletedAt: string }[];
    remote: { id: string; deletedAt: string }[];
  },
) {
  return mergeVaults({
    base,
    local,
    remote,
    localTombstones: tombs.local,
    remoteTombstones: tombs.remote,
    now: NOW,
    newId,
  });
}

describe('mergeVaults', () => {
  it('takes the side that changed', () => {
    const base = [cmd('a')];
    const local = [cmd('a', { title: 'Local', rev: 2, updatedAt: '2026-11-02T00:00:00Z' })];
    const result = merge(base, local, base);
    expect(result.commands.map((c) => c.title)).toEqual(['Local']);
    expect(result.conflicts).toBe(0);
  });

  it('keeps both versions when both sides edited the same command', () => {
    const base = [cmd('a')];
    const local = [cmd('a', { title: 'Local', rev: 2, updatedAt: '2026-11-03T00:00:00Z' })];
    const remote = [cmd('a', { title: 'Remote', rev: 2, updatedAt: '2026-11-02T00:00:00Z' })];
    const result = merge(base, local, remote);
    expect(result.conflicts).toBe(1);
    expect(result.commands.map((c) => c.title).sort()).toEqual([
      'Local',
      'Remote (conflicted copy)',
    ]);
    expect(result.commands.find((c) => c.title.includes('conflicted'))?.tags).toContain('conflict');
  });

  it('adds new commands from both sides', () => {
    const result = merge([], [cmd('l')], [cmd('r')]);
    expect(result.commands.map((c) => c.id).sort()).toEqual(['l', 'r']);
  });

  it('honours a local delete when the remote copy is unchanged', () => {
    const base = [cmd('a')];
    const result = merge(base, [], base, {
      local: [{ id: 'a', deletedAt: '2026-11-05T00:00:00Z' }],
      remote: [],
    });
    expect(result.commands).toEqual([]);
    expect(result.tombstones.map((t) => t.id)).toEqual(['a']);
  });

  it('keeps a command edited after it was deleted elsewhere', () => {
    const base = [cmd('a')];
    const edited = cmd('a', { title: 'Edited', rev: 2, updatedAt: '2026-11-06T00:00:00Z' });
    const result = merge(base, [edited], [], {
      local: [],
      remote: [{ id: 'a', deletedAt: '2026-11-05T00:00:00Z' }],
    });
    expect(result.commands.map((c) => c.title)).toEqual(['Edited']);
  });

  it('drops tombstones older than 30 days', () => {
    const result = merge([], [], [], {
      local: [{ id: 'old', deletedAt: '2026-09-01T00:00:00Z' }],
      remote: [],
    });
    expect(result.tombstones).toEqual([]);
  });
});

describe('parseVault', () => {
  it('normalizes commands from untrusted JSON', () => {
    const doc = parseVault(
      JSON.stringify({
        schema: 1,
        commands: [
          { title: ' Pods ', command: 'kubectl get pods -n {{ns}}', tags: ['K8s', 'k8s', 3] },
          { nope: true },
        ],
        tombstones: [],
      }),
      '2026-11-13T00:00:00Z',
      newId,
    );
    expect(doc.commands).toHaveLength(1);
    expect(doc.commands[0]).toMatchObject({
      title: 'Pods',
      tags: ['k8s'],
      placeholders: [{ name: 'ns' }],
    });
  });

  it('strips markup, hidden characters and unsafe tags from untrusted commands', () => {
    const doc = parseVault(
      JSON.stringify({
        schema: 1,
        commands: [
          {
            title: '<img src=x onerror=alert(1)>Deploy\u202E',
            command: 'kubectl apply -f app.yaml > out.log\u200B',
            description: 'See <script>alert(1)</script> javascript:alert(1)',
            tags: ['<b>k8s</b>', 'ok', '"><svg onload=alert(1)>'],
          },
        ],
        tombstones: [],
      }),
      '2026-11-13T00:00:00Z',
      newId,
    );
    const [c] = doc.commands;
    expect(c?.title).toBe('Deploy');
    expect(c?.command).toBe('kubectl apply -f app.yaml > out.log');
    expect(c?.description).toBe('See alert(1) javascript alert(1)');
    expect(c?.tags).toEqual(['bk8sb', 'ok', 'svg-onloadalert1']);
  });

  it('refuses vaults from a newer schema', () => {
    expect(() => parseVault('{"schema":99}', '', newId)).toThrow(VaultTooNewError);
  });
});

describe('vaultSizeLevel', () => {
  it('warns and blocks at the documented thresholds', () => {
    expect(vaultSizeLevel(100)).toBe('ok');
    expect(vaultSizeLevel(850 * 1024)).toBe('warn');
    expect(vaultSizeLevel(960 * 1024)).toBe('block');
  });
});
