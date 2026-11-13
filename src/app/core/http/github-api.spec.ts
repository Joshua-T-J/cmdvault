import { isGitHubApi } from './github-api';

describe('isGitHubApi', () => {
  it('only matches the configured API origin', () => {
    expect(isGitHubApi('https://api.github.com/gists')).toBe(true);
    expect(isGitHubApi('https://api.github.com.evil.com/gists')).toBe(false);
    expect(isGitHubApi('https://gist.githubusercontent.com/raw')).toBe(false);
  });

  it('supports a same-origin BFF base', () => {
    expect(isGitHubApi('/api/gh/gists', '/api/gh')).toBe(true);
    expect(isGitHubApi('/api/ghost', '/api/gh')).toBe(false);
  });
});
