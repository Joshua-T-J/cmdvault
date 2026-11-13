import { CommandDraft } from './command.store';

export const SAMPLE_COMMANDS: readonly CommandDraft[] = [
  {
    title: 'Rebase branch onto main',
    command: 'git fetch origin && git rebase origin/main',
    tags: ['git'],
    shell: 'bash',
  },
  {
    title: 'Remove stopped containers and dangling images',
    command: 'docker system prune -f',
    tags: ['docker'],
    shell: 'bash',
  },
  {
    title: 'Shell into a running pod',
    command: 'kubectl exec -it {{pod}} -n {{namespace}} -- sh',
    tags: ['k8s', 'debug'],
    shell: 'bash',
  },
  {
    title: 'Undo last commit, keep changes',
    command: 'git reset --soft HEAD~1',
    tags: ['git'],
    shell: 'bash',
  },
  {
    title: 'Which process is using a port',
    command: 'lsof -i :{{port}}',
    tags: ['network', 'debug'],
    shell: 'bash',
  },
  {
    title: 'Follow logs for a service',
    command: 'docker compose logs -f --tail=100 {{service}}',
    tags: ['docker', 'debug'],
    shell: 'bash',
  },
  {
    title: 'Port-forward a service locally',
    command: 'kubectl port-forward svc/{{service}} 8080:80',
    tags: ['k8s', 'network'],
    shell: 'bash',
  },
];
