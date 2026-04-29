import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { PostDetail, SiteConfig, WorkspacePayload } from "../types/inscribe";

const desktopRuntimeMessage = "Desktop runtime is required for workspace file operations.";

function isTauriRuntimeAvailable() {
  if (typeof window === "undefined") {
    return false;
  }

  const tauriWindow = window as Window & {
    __TAURI_INTERNALS__?: {
      invoke?: unknown;
    };
  };

  return typeof tauriWindow.__TAURI_INTERNALS__?.invoke === "function";
}

function emptySiteConfig(): SiteConfig {
  return {
    branch: "",
    cname: "",
    description: "",
    domain: "",
    email: "",
    enabledProxy: "direct",
    language: "zh-CN",
    netlifyAccessToken: "",
    netlifySiteId: "",
    password: "",
    platform: "github",
    port: "",
    privateKey: "",
    proxyPath: "",
    proxyPort: "",
    remotePath: "",
    repository: "",
    server: "",
    siteName: "Inscribe",
    themeName: "",
    title: "Inscribe",
    token: "",
    tokenUsername: "",
    username: "",
  };
}

function browserWorkspace(workspacePath: string): WorkspacePayload {
  return {
    posts: [],
    site: emptySiteConfig(),
    summary: {
      currentTheme: "",
      hasSiteConfig: false,
      postsCount: 0,
      root: workspacePath,
    },
    themes: [],
  };
}

export function loadWorkspace(workspacePath: string) {
  if (!isTauriRuntimeAvailable()) {
    return Promise.resolve(browserWorkspace(workspacePath));
  }

  return invoke<WorkspacePayload>("load_workspace", { workspacePath });
}

export async function selectWorkspaceDirectory() {
  if (!isTauriRuntimeAvailable()) {
    return null;
  }

  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select Inscribe workspace",
  });

  return typeof selected === "string" ? selected : null;
}

export function initializeWorkspace(workspacePath: string) {
  if (!isTauriRuntimeAvailable()) {
    return Promise.resolve(browserWorkspace(workspacePath));
  }

  return invoke<WorkspacePayload>("initialize_workspace", { workspacePath });
}

export function loadPost(workspacePath: string, fileName: string) {
  if (!isTauriRuntimeAvailable()) {
    return Promise.reject(new Error(desktopRuntimeMessage));
  }

  return invoke<PostDetail>("load_post", { workspacePath, fileName });
}

export function savePost(payload: {
  workspacePath: string;
  fileName: string;
  data: PostDetail["data"];
  content: string;
}) {
  if (!isTauriRuntimeAvailable()) {
    return Promise.reject(new Error(desktopRuntimeMessage));
  }

  return invoke<PostDetail>("save_post", {
    request: payload,
  });
}

export function deletePost(workspacePath: string, fileName: string) {
  if (!isTauriRuntimeAvailable()) {
    return Promise.reject(new Error(desktopRuntimeMessage));
  }

  return invoke<void>("delete_post", { workspacePath, fileName });
}

export function saveSiteSettings(workspacePath: string, site: SiteConfig) {
  if (!isTauriRuntimeAvailable()) {
    return Promise.reject(new Error(desktopRuntimeMessage));
  }

  return invoke<SiteConfig>("save_site_settings", { workspacePath, site });
}

export function runBlogBuild(workspacePath: string) {
  if (!isTauriRuntimeAvailable()) {
    return Promise.reject(new Error(desktopRuntimeMessage));
  }

  return invoke("run_blog_build", { workspacePath });
}
