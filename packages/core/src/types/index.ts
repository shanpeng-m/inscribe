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

export interface SiteConfig {
  title: string;
  description: string;
  domain: string;
  repository: string;
  themeName: string;
  siteName: string;
  branch: string;
  language: string;
}
