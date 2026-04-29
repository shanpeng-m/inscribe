export interface SiteConfig {
  title: string;
  description: string;
  domain: string;
  repository: string;
  themeName: string;
  siteName: string;
  branch: string;
  language: string;
  platform: string;
  username: string;
  email: string;
  tokenUsername: string;
  token: string;
  cname: string;
  port: string;
  server: string;
  password: string;
  privateKey: string;
  remotePath: string;
  proxyPath: string;
  proxyPort: string;
  enabledProxy: string;
  netlifyAccessToken: string;
  netlifySiteId: string;
}

export interface ThemeSummary {
  folder: string;
  name: string;
  version: string;
  author: string;
  repository: string;
}

export interface PostData {
  title: string;
  date: string;
  tags: string[];
  published: boolean;
  hideInList: boolean;
  feature: string;
  isTop: boolean;
}

export interface PostSummary {
  fileName: string;
  data: PostData;
  excerpt: string;
}

export interface PostDetail {
  fileName: string;
  data: PostData;
  content: string;
}

export interface WorkspaceSummary {
  root: string;
  postsCount: number;
  hasSiteConfig: boolean;
  currentTheme: string;
}

export interface WorkspacePayload {
  summary: WorkspaceSummary;
  site: SiteConfig;
  themes: ThemeSummary[];
  posts: PostSummary[];
}
