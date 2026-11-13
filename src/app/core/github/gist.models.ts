export interface GitHubUserDto {
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface GistFileDto {
  filename: string;
  size: number;
  raw_url: string;
  truncated?: boolean;
  content?: string;
}

export interface GistSummaryDto {
  id: string;
  description: string | null;
  public: boolean;
  updated_at: string;
  files: Record<string, Omit<GistFileDto, 'content' | 'truncated'>>;
}

export interface GistHistoryEntryDto {
  version: string;
  committed_at: string;
}

export interface GistDto extends Omit<GistSummaryDto, 'files'> {
  files: Record<string, GistFileDto | undefined>;
  history?: GistHistoryEntryDto[];
}

export type GistFilesPatch = Record<string, { content: string } | null>;

export interface CreateGistBody {
  description: string;
  public: false;
  files: Record<string, { content: string }>;
}
