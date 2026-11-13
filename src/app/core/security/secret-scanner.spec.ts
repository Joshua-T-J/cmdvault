import { replaceSecrets, scanForSecrets, shannonEntropy } from './secret-scanner';

describe('secret scanner', () => {
  it('flags a Stripe live key in a curl header', () => {
    const cmd =
      'curl -H "Authorization: Bearer sk_live_51HxAbCdEfGhIjKlMn9fQ2" https://api.example.com/health';
    const matches = scanForSecrets(cmd);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.value).toBe('sk_live_51HxAbCdEfGhIjKlMn9fQ2');
  });

  it('flags GitHub tokens, AWS keys and credentials in URLs', () => {
    expect(scanForSecrets(`echo ghp_${'a'.repeat(36)}`)[0]?.kind).toBe('GitHub token');
    expect(
      scanForSecrets('aws configure set aws_access_key_id AKIAABCDEFGHIJKLMNOP'),
    ).not.toHaveLength(0);
    const url = scanForSecrets('git clone https://joe:hunter22@example.com/repo.git');
    expect(url[0]?.value).toBe('hunter22');
  });

  it('flags password assignments but not placeholders', () => {
    expect(scanForSecrets('mysql --password=s3cret')).toHaveLength(1);
    expect(scanForSecrets('mysql --password={{DB_PASSWORD}}')).toHaveLength(0);
  });

  it('leaves ordinary commands alone', () => {
    for (const cmd of [
      'git fetch origin && git rebase origin/main',
      'docker compose logs -f --tail=100 {{service}}',
      'kubectl port-forward svc/{{service}} 8080:80',
      'lsof -i :{{port}}',
    ]) {
      expect(scanForSecrets(cmd)).toEqual([]);
    }
  });

  it('replaces secrets with a placeholder', () => {
    const cmd = 'export STRIPE=sk_test_abcdefghijklmnop1234';
    expect(replaceSecrets(cmd, scanForSecrets(cmd))).toBe('export STRIPE={{API_KEY}}');
  });

  it('computes Shannon entropy', () => {
    expect(shannonEntropy('aaaa')).toBe(0);
    expect(shannonEntropy('abcd')).toBe(2);
  });
});
