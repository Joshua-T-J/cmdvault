export const SHELLS = ['bash', 'zsh', 'fish', 'powershell', 'cmd', 'other'] as const;
export type Shell = (typeof SHELLS)[number];

export interface Placeholder {
  name: string;
  default?: string;
}

export interface Command {
  id: string;
  title: string;
  command: string;
  description?: string;
  shell?: Shell;
  tags: string[];
  placeholders?: Placeholder[];
  favorite: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  rev: number;
}

export interface Tombstone {
  id: string;
  deletedAt: string;
}

export interface VaultEncryption {
  alg: 'AES-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
}

export interface VaultDoc {
  schema: 1;
  updatedAt: string;
  deviceId: string;
  encryption?: VaultEncryption;
  commands: Command[];
  ciphertext?: string;
  tombstones: Tombstone[];
}

export const CURRENT_SCHEMA = 1;
export const VAULT_FILE = 'cmdvault.json';
export const VAULT_README_FILE = 'README.md';
export const VAULT_MARKER = '[cmdvault:v1]';
export const VAULT_DESCRIPTION = `CmdVault data — do not edit manually ${VAULT_MARKER}`;

/** Size thresholds for cmdvault.json, in bytes. */
export const VAULT_SIZE_WARN = 800 * 1024;
export const VAULT_SIZE_BLOCK = 950 * 1024;

export const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
