import { invoke } from "@tauri-apps/api/core";
import type { PostDetail, SiteConfig, WorkspacePayload } from "../types/inscribe";

export function loadWorkspace(workspacePath: string) {
  return invoke<WorkspacePayload>("load_workspace", { workspacePath });
}

export function loadPost(workspacePath: string, fileName: string) {
  return invoke<PostDetail>("load_post", { workspacePath, fileName });
}

export function savePost(payload: {
  workspacePath: string;
  fileName: string;
  data: PostDetail["data"];
  content: string;
}) {
  return invoke<PostDetail>("save_post", {
    request: payload,
  });
}

export function saveSiteSettings(workspacePath: string, site: SiteConfig) {
  return invoke<SiteConfig>("save_site_settings", { workspacePath, site });
}
