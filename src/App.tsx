import {
  ArrowLeft,
  CalendarDays,
  Check,
  FolderKanban,
  Globe,
  Menu,
  Palette,
  Plus,
  Search,
  Sparkles,
  SquarePen,
  Tag as TagIcon,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type AppLanguage,
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  normalizeLanguageCode,
} from "@/i18n";
import { loadPost, loadWorkspace, savePost, saveSiteSettings } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PostDetail, SiteConfig, WorkspacePayload } from "@/types/inscribe";
import pkg from "../package.json";
import "./App.css";

type Section = "articles" | "menu" | "tags" | "theme" | "setting";

const DEFAULT_WORKSPACE = "internal://database";

function emptyPost(): PostDetail {
  return {
    content: "",
    data: {
      date: new Date().toISOString().slice(0, 19).replace("T", " "),
      feature: "",
      hideInList: false,
      isTop: false,
      published: false,
      tags: [],
      title: "",
    },
    fileName: "",
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatPostDate(value: string, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(parsed);
}

interface LanguagePickerProps {
  value: AppLanguage;
  onChange: (value: AppLanguage) => void;
}

interface SettingsFieldProps {
  htmlFor: string;
  label: string;
  children: ReactNode;
}

function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  return (
    <select
      id="system-language"
      className="settings-select"
      onChange={(event) => onChange(normalizeLanguageCode(event.currentTarget.value))}
      value={value}
    >
      {LANGUAGE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function SettingsField({ htmlFor, label, children }: SettingsFieldProps) {
  return (
    <div className="settings-field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

function AppContent() {
  const { t, i18n } = useTranslation();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [siteDraft, setSiteDraft] = useState<SiteConfig | null>(null);
  const [selectedPostName, setSelectedPostName] = useState("");
  const [draft, setDraft] = useState<PostDetail>(emptyPost);
  const [activeSection, setActiveSection] = useState<Section>("articles");
  const [editorVisible, setEditorVisible] = useState(false);
  const [systemVisible, setSystemVisible] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [language, setLanguage] = useState<AppLanguage>(DEFAULT_LANGUAGE);
  const [loadingPost, setLoadingPost] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [savingSite, setSavingSite] = useState(false);
  const [savingSystem, setSavingSystem] = useState(false);
  const [status, setStatus] = useState(t("loadingReady"));
  const [error, setError] = useState("");

  const filteredPosts = useMemo(() => {
    const posts = workspace?.posts ?? [];
    if (!keyword.trim()) {
      return posts;
    }

    const query = keyword.trim().toLowerCase();
    return posts.filter((post) => {
      const title = post.data.title.toLowerCase();
      const tags = (post.data.tags ?? []).join(" ").toLowerCase();
      return (
        title.includes(query) || tags.includes(query) || post.fileName.toLowerCase().includes(query)
      );
    });
  }, [keyword, workspace?.posts]);

  const tagSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of workspace?.posts ?? []) {
      for (const tag of post.data.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([name, count]) => ({ count, name }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
  }, [workspace?.posts]);

  const publishedCount = useMemo(
    () => (workspace?.posts ?? []).filter((post) => post.data.published).length,
    [workspace?.posts]
  );
  const draftCount = useMemo(
    () => (workspace?.posts ?? []).filter((post) => !post.data.published).length,
    [workspace?.posts]
  );
  const featuredCount = useMemo(
    () =>
      (workspace?.posts ?? []).filter((post) => post.data.isTop || Boolean(post.data.feature))
        .length,
    [workspace?.posts]
  );

  const isGitPlatform = ["github", "coding", "gitee"].includes(siteDraft?.platform ?? "");
  const isNetlify = siteDraft?.platform === "netlify";
  const isSftp = siteDraft?.platform === "sftp";
  const useProxy = siteDraft?.enabledProxy === "proxy";
  const sectionTitle =
    activeSection === "articles"
      ? t("posts")
      : activeSection === "menu"
        ? t("menuTitle")
        : activeSection === "tags"
          ? t("tags")
          : activeSection === "theme"
            ? t("themeLibrary")
            : t("remote");
  const sectionDescription =
    activeSection === "articles"
      ? t("appTagline")
      : activeSection === "menu" || activeSection === "tags"
        ? t("structureOverview")
        : activeSection === "theme"
          ? t("theme")
          : t("remoteIntro");
  const menus = useMemo(
    () => [
      {
        count: workspace?.posts.length ?? 0,
        icon: SquarePen,
        key: "articles" as const,
        label: t("posts"),
      },
      { count: 3, icon: Menu, key: "menu" as const, label: t("menu") },
      { count: tagSummary.length, icon: TagIcon, key: "tags" as const, label: t("tags") },
      {
        count: workspace?.themes.length ?? 0,
        icon: Palette,
        key: "theme" as const,
        label: t("theme"),
      },
      {
        count: siteDraft?.repository ? 1 : 0,
        icon: FolderKanban,
        key: "setting" as const,
        label: t("remote"),
      },
    ],
    [siteDraft?.repository, t, tagSummary.length, workspace?.posts.length, workspace?.themes.length]
  );

  const handleLoadWorkspace = useCallback(
    async (path = DEFAULT_WORKSPACE) => {
      try {
        setError("");
        setStatus(t("loadingWorkspace"));
        const payload = await loadWorkspace(path);
        setWorkspace(payload);
        setSiteDraft(payload.site);
        setStatus(t("loadedPosts", { count: payload.posts.length }));
        setActiveSection("articles");

        if (payload.posts[0]) {
          const detail = await loadPost(path, payload.posts[0].fileName);
          setDraft(detail);
          setSelectedPostName(detail.fileName);
        } else {
          setDraft(emptyPost());
          setSelectedPostName("");
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : String(loadError);
        setError(message);
        setStatus(t("loadFailed"));
      }
    },
    [t]
  );

  async function handleSelectPost(fileName: string) {
    if (!workspace) {
      return;
    }

    try {
      setLoadingPost(true);
      setError("");
      setSelectedPostName(fileName);
      const detail = await loadPost(workspace.summary.root, fileName);
      setDraft(detail);
      setEditorVisible(true);
      setStatus(t("openedPost", { name: detail.data.title || fileName }));
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : String(loadError);
      setError(message);
    } finally {
      setLoadingPost(false);
    }
  }

  function startNewPost() {
    setDraft(emptyPost());
    setSelectedPostName("");
    setEditorVisible(true);
    setStatus(t("createdDraft"));
  }

  async function handleSavePost(published: boolean) {
    if (!workspace) {
      setError(t("workspaceRequired"));
      return;
    }

    const fileName = draft.fileName || slugify(draft.data.title);
    if (!fileName) {
      setError(t("fileNameRequired"));
      return;
    }

    try {
      setSavingPost(true);
      setError("");
      const nextData = { ...draft.data, published };
      const saved = await savePost({
        content: draft.content,
        data: nextData,
        fileName,
        workspacePath: workspace.summary.root,
      });

      const refreshed = await loadWorkspace(workspace.summary.root);
      setWorkspace(refreshed);
      setSiteDraft(refreshed.site);
      setDraft(saved);
      setSelectedPostName(saved.fileName);
      setStatus(t("savePostDone", { name: saved.fileName }));
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setError(message);
    } finally {
      setSavingPost(false);
    }
  }

  async function handleSaveSite() {
    if (!(workspace && siteDraft)) {
      setError(t("workspaceRequired"));
      return;
    }

    try {
      setSavingSite(true);
      setError("");
      const saved = await saveSiteSettings(workspace.summary.root, siteDraft);
      setWorkspace({
        ...workspace,
        site: saved,
        summary: {
          ...workspace.summary,
          currentTheme: saved.themeName,
        },
      });
      setSiteDraft(saved);
      setStatus(t("saveSiteDone"));
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setError(message);
    } finally {
      setSavingSite(false);
    }
  }

  function updateDraft(section: "data" | "root", key: string, value: string | boolean | string[]) {
    setDraft((current) => {
      if (section === "root") {
        return { ...current, [key]: value };
      }

      return {
        ...current,
        data: {
          ...current.data,
          [key]: value,
        },
      };
    });
  }

  function updateSiteDraft(key: keyof SiteConfig, value: string) {
    setSiteDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  useEffect(() => {
    void handleLoadWorkspace(DEFAULT_WORKSPACE);
  }, [handleLoadWorkspace]);

  async function handleSaveSystem() {
    try {
      setSavingSystem(true);
      await i18n.changeLanguage(language);
      await handleLoadWorkspace(DEFAULT_WORKSPACE);
      setSystemVisible(false);
      setStatus(t("saveSystemDone"));
    } finally {
      setSavingSystem(false);
    }
  }

  return (
    <SidebarProvider defaultOpen>
      <main className="app-shell">
        <div className="app-shell__ambient" />
        <AppSidebar
          activeSection={activeSection}
          appName={t("appName")}
          isDark={resolvedTheme === "dark"}
          items={menus}
          navigationLabel={t("menu")}
          onOpenSettings={() => setSystemVisible(true)}
          onSectionSelect={(section) => setActiveSection(section as Section)}
          onToggleTheme={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          settingsLabel={t("settings")}
          themeLabel={t("systemTheme")}
          version={pkg.version}
        />

        <SidebarInset className="app-main">
          <header className="app-toolbar">
            <div className="app-toolbar__summary">
              <SidebarTrigger className="sidebar-trigger toolbar-action" />
              <div className="app-toolbar__title">
                <strong>{sectionTitle}</strong>
                {error ? (
                  <span className="app-toolbar__error">{error}</span>
                ) : (
                  <span className="app-toolbar__meta">{workspace?.posts.length ?? 0}</span>
                )}
              </div>
            </div>

            <div className="app-toolbar__actions">
              {activeSection === "articles" ? (
                <div className="search-field">
                  <Search className="search-field__icon size-4" />
                  <input
                    onChange={(event) => setKeyword(event.currentTarget.value)}
                    placeholder={t("searchArticle")}
                    value={keyword}
                  />
                </div>
              ) : null}
              <Button
                className="toolbar-action"
                onClick={() => setSystemVisible(true)}
                type="button"
                variant="outline"
              >
                <Globe className="size-4" />
              </Button>
              <Button className="toolbar-create" onClick={startNewPost} type="button">
                <Plus className="size-4" />
                <span>{t("newArticle")}</span>
              </Button>
            </div>
          </header>

          <div className="content-stage">
            <section className="page-intro">
              <div>
                <h1>{sectionTitle}</h1>
                <p>{sectionDescription}</p>
              </div>
              <div className="page-intro__status">
                <Badge variant="outline">{t("statusLabel")}</Badge>
                <span>{error || status}</span>
              </div>
            </section>

            <section className="summary-grid">
              {[
                {
                  label: t("allPosts"),
                  value: workspace?.posts.length ?? 0,
                },
                {
                  label: t("publishedPosts"),
                  value: publishedCount,
                },
                {
                  label: t("draftPosts"),
                  value: draftCount,
                },
                {
                  label: t("themeLibrary"),
                  value: featuredCount,
                },
              ].map((metric) => (
                <div className="summary-item" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </section>

            {activeSection === "articles" ? (
              <section className="content-panel content-panel--list">
                <div className="panel-header">
                  <div>
                    <h2>{t("posts")}</h2>
                    <p>{t("contentOverview")}</p>
                  </div>
                  <Badge variant="secondary">{filteredPosts.length}</Badge>
                </div>

                <div className="article-list">
                  {filteredPosts.map((post) => (
                    <button
                      className={cn(
                        "article-row",
                        post.fileName === selectedPostName && "article-row--active"
                      )}
                      key={post.fileName}
                      onClick={() => handleSelectPost(post.fileName)}
                      type="button"
                    >
                      <div className="article-row__main">
                        <div className="article-row__title">
                          {post.data.title || t("untitledPost")}
                        </div>
                        <div className="article-row__meta">
                          <span className="article-status">
                            <span
                              className={cn(
                                "article-status__dot",
                                post.data.published && "article-status__dot--published"
                              )}
                            />
                            {post.data.published ? t("published") : t("draft")}
                          </span>
                          <span className="article-row__meta-item">
                            <CalendarDays className="size-3.5" />
                            {formatPostDate(post.data.date, i18n.language, t("noDate"))}
                          </span>
                          {(post.data.tags || []).slice(0, 3).map((tag) => (
                            <span className="tag-pill" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {activeSection === "tags" ? (
              <section className="content-panel">
                <div className="panel-header">
                  <div>
                    <h2>{t("tags")}</h2>
                    <p>{t("structureOverview")}</p>
                  </div>
                </div>
                <div className="tag-grid">
                  {tagSummary.length ? (
                    tagSummary.map((tag) => (
                      <div className="tag-card" key={tag.name}>
                        <div className="tag-card__head">
                          <TagIcon className="size-4" />
                          <strong>{tag.name}</strong>
                        </div>
                        <Badge variant="outline">
                          {tag.count} {t("posts")}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="empty-copy">{t("noTags")}</p>
                  )}
                </div>
              </section>
            ) : null}

            {activeSection === "menu" ? (
              <section className="content-panel">
                <div className="panel-header">
                  <div>
                    <h2>{t("menuTitle")}</h2>
                    <p>{t("structureOverview")}</p>
                  </div>
                </div>
                <div className="menu-grid">
                  {[
                    { name: t("menuIntro1"), note: t("menuIntro1Desc") },
                    { name: t("menuIntro2"), note: t("menuIntro2Desc") },
                    { name: t("menuIntro3"), note: t("menuIntro3Desc") },
                  ].map((item) => (
                    <div className="menu-card" key={item.name}>
                      <div className="menu-card__title">{item.name}</div>
                      <p>{item.note}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {activeSection === "theme" ? (
              <section className="content-panel">
                <div className="panel-header">
                  <div>
                    <h2>{t("themeLibrary")}</h2>
                    <p>{t("theme")}</p>
                  </div>
                </div>
                <div className="theme-grid">
                  {workspace?.themes.length ? (
                    workspace.themes.map((themeItem) => (
                      <Card className="theme-card" key={themeItem.folder}>
                        <CardContent className="theme-card__content">
                          <div className="theme-card__top">
                            <div>
                              <strong>{themeItem.name}</strong>
                              <div className="theme-card__folder">{themeItem.folder}</div>
                            </div>
                            <Sparkles className="size-4 text-primary" />
                          </div>
                          <div className="theme-card__meta">
                            {themeItem.version ? (
                              <Badge variant="outline">{themeItem.version}</Badge>
                            ) : null}
                            {workspace.summary.currentTheme === themeItem.folder ? (
                              <Badge variant="success">{t("current")}</Badge>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="empty-copy">{t("themeEmpty")}</p>
                  )}
                </div>
              </section>
            ) : null}

            {activeSection === "setting" ? (
              <section className="content-panel">
                <div className="panel-header">
                  <div>
                    <h2>{t("remote")}</h2>
                    <p>{t("remoteIntro")}</p>
                  </div>
                </div>

                <div className="settings-summary">
                  <Badge variant="outline">{t("internalDatabase")}</Badge>
                  <Badge variant="outline">{siteDraft?.themeName || t("themeNotSet")}</Badge>
                  <Badge variant="outline">{siteDraft?.platform || t("platformNotSet")}</Badge>
                </div>

                <div className="settings-form">
                  <div className="settings-grid">
                    <SettingsField htmlFor="site-name" label={t("siteName")}>
                      <Input
                        id="site-name"
                        onChange={(event) => updateSiteDraft("siteName", event.currentTarget.value)}
                        value={siteDraft?.siteName ?? ""}
                      />
                    </SettingsField>
                    <SettingsField htmlFor="site-title" label={t("siteTitle")}>
                      <Input
                        id="site-title"
                        onChange={(event) => updateSiteDraft("title", event.currentTarget.value)}
                        value={siteDraft?.title ?? ""}
                      />
                    </SettingsField>
                    <SettingsField htmlFor="site-description" label={t("description")}>
                      <Textarea
                        id="site-description"
                        onChange={(event) =>
                          updateSiteDraft("description", event.currentTarget.value)
                        }
                        value={siteDraft?.description ?? ""}
                      />
                    </SettingsField>
                    <SettingsField htmlFor="site-domain" label={t("domain")}>
                      <Input
                        id="site-domain"
                        onChange={(event) => updateSiteDraft("domain", event.currentTarget.value)}
                        value={siteDraft?.domain ?? ""}
                      />
                    </SettingsField>
                    <SettingsField htmlFor="site-repository" label={t("repository")}>
                      <Input
                        id="site-repository"
                        onChange={(event) =>
                          updateSiteDraft("repository", event.currentTarget.value)
                        }
                        value={siteDraft?.repository ?? ""}
                      />
                    </SettingsField>
                    <SettingsField htmlFor="site-branch" label={t("branch")}>
                      <Input
                        id="site-branch"
                        onChange={(event) => updateSiteDraft("branch", event.currentTarget.value)}
                        value={siteDraft?.branch ?? ""}
                      />
                    </SettingsField>
                    <SettingsField htmlFor="theme-name" label={t("themeName")}>
                      <Input
                        id="theme-name"
                        onChange={(event) =>
                          updateSiteDraft("themeName", event.currentTarget.value)
                        }
                        value={siteDraft?.themeName ?? ""}
                      />
                    </SettingsField>
                    <SettingsField htmlFor="publish-platform" label={t("publishPlatform")}>
                      <select
                        id="publish-platform"
                        className="settings-select"
                        onChange={(event) => updateSiteDraft("platform", event.currentTarget.value)}
                        value={siteDraft?.platform ?? "github"}
                      >
                        <option value="github">{t("platformGithubPages")}</option>
                        <option value="netlify">{t("netlify")}</option>
                        <option value="coding">{t("platformCodingPages")}</option>
                        <option value="gitee">{t("platformGiteePages")}</option>
                        <option value="sftp">{t("sftp")}</option>
                      </select>
                    </SettingsField>
                  </div>

                  <Separator />

                  {isGitPlatform ? (
                    <div className="settings-section">
                      <div className="settings-section__title">{t("gitPublishing")}</div>
                      <div className="settings-grid">
                        <SettingsField htmlFor="git-repository" label={t("repository")}>
                          <Input
                            id="git-repository"
                            onChange={(event) =>
                              updateSiteDraft("repository", event.currentTarget.value)
                            }
                            value={siteDraft?.repository ?? ""}
                          />
                        </SettingsField>
                        <SettingsField htmlFor="git-branch" label={t("branch")}>
                          <Input
                            id="git-branch"
                            onChange={(event) =>
                              updateSiteDraft("branch", event.currentTarget.value)
                            }
                            value={siteDraft?.branch ?? ""}
                          />
                        </SettingsField>
                        <SettingsField htmlFor="git-username" label={t("username")}>
                          <Input
                            id="git-username"
                            onChange={(event) =>
                              updateSiteDraft("username", event.currentTarget.value)
                            }
                            value={siteDraft?.username ?? ""}
                          />
                        </SettingsField>
                        <SettingsField htmlFor="git-email" label={t("email")}>
                          <Input
                            id="git-email"
                            onChange={(event) =>
                              updateSiteDraft("email", event.currentTarget.value)
                            }
                            value={siteDraft?.email ?? ""}
                          />
                        </SettingsField>
                        {siteDraft?.platform === "coding" ? (
                          <SettingsField htmlFor="git-token-username" label={t("gitTokenUsername")}>
                            <Input
                              id="git-token-username"
                              onChange={(event) =>
                                updateSiteDraft("tokenUsername", event.currentTarget.value)
                              }
                              value={siteDraft?.tokenUsername ?? ""}
                            />
                          </SettingsField>
                        ) : null}
                        <SettingsField htmlFor="git-access-token" label={t("accessToken")}>
                          <Input
                            id="git-access-token"
                            onChange={(event) =>
                              updateSiteDraft("token", event.currentTarget.value)
                            }
                            type="password"
                            value={siteDraft?.token ?? ""}
                          />
                        </SettingsField>
                      </div>
                    </div>
                  ) : null}

                  {isNetlify ? (
                    <div className="settings-section">
                      <div className="settings-section__title">{t("netlifySection")}</div>
                      <div className="settings-grid">
                        <SettingsField htmlFor="netlify-site-id" label={t("siteId")}>
                          <Input
                            id="netlify-site-id"
                            onChange={(event) =>
                              updateSiteDraft("netlifySiteId", event.currentTarget.value)
                            }
                            value={siteDraft?.netlifySiteId ?? ""}
                          />
                        </SettingsField>
                        <SettingsField htmlFor="netlify-access-token" label={t("accessToken")}>
                          <Input
                            id="netlify-access-token"
                            onChange={(event) =>
                              updateSiteDraft("netlifyAccessToken", event.currentTarget.value)
                            }
                            type="password"
                            value={siteDraft?.netlifyAccessToken ?? ""}
                          />
                        </SettingsField>
                      </div>
                    </div>
                  ) : null}

                  {isSftp ? (
                    <div className="settings-section">
                      <div className="settings-section__title">{t("sftpSection")}</div>
                      <div className="settings-grid">
                        <SettingsField htmlFor="sftp-port" label={t("port")}>
                          <Input
                            id="sftp-port"
                            onChange={(event) => updateSiteDraft("port", event.currentTarget.value)}
                            value={siteDraft?.port ?? ""}
                          />
                        </SettingsField>
                        <SettingsField htmlFor="sftp-server" label={t("server")}>
                          <Input
                            id="sftp-server"
                            onChange={(event) =>
                              updateSiteDraft("server", event.currentTarget.value)
                            }
                            value={siteDraft?.server ?? ""}
                          />
                        </SettingsField>
                        <SettingsField htmlFor="sftp-username" label={t("username")}>
                          <Input
                            id="sftp-username"
                            onChange={(event) =>
                              updateSiteDraft("username", event.currentTarget.value)
                            }
                            value={siteDraft?.username ?? ""}
                          />
                        </SettingsField>
                        <SettingsField htmlFor="sftp-password" label={t("password")}>
                          <Input
                            id="sftp-password"
                            onChange={(event) =>
                              updateSiteDraft("password", event.currentTarget.value)
                            }
                            type="password"
                            value={siteDraft?.password ?? ""}
                          />
                        </SettingsField>
                        <SettingsField htmlFor="sftp-private-key" label={t("privateKeyPath")}>
                          <Input
                            id="sftp-private-key"
                            onChange={(event) =>
                              updateSiteDraft("privateKey", event.currentTarget.value)
                            }
                            value={siteDraft?.privateKey ?? ""}
                          />
                        </SettingsField>
                        <SettingsField htmlFor="sftp-remote-path" label={t("remotePath")}>
                          <Input
                            id="sftp-remote-path"
                            onChange={(event) =>
                              updateSiteDraft("remotePath", event.currentTarget.value)
                            }
                            value={siteDraft?.remotePath ?? ""}
                          />
                        </SettingsField>
                      </div>
                    </div>
                  ) : null}

                  {!isSftp ? (
                    <div className="settings-section">
                      <div className="settings-section__title">{t("proxySection")}</div>
                      <div className="settings-grid">
                        <SettingsField htmlFor="proxy-mode" label={t("connectionMode")}>
                          <select
                            id="proxy-mode"
                            className="settings-select"
                            onChange={(event) =>
                              updateSiteDraft("enabledProxy", event.currentTarget.value)
                            }
                            value={siteDraft?.enabledProxy ?? "direct"}
                          >
                            <option value="direct">{t("direct")}</option>
                            <option value="proxy">{t("proxy")}</option>
                          </select>
                        </SettingsField>
                        {useProxy ? (
                          <>
                            <SettingsField htmlFor="proxy-address" label={t("proxyAddress")}>
                              <Input
                                id="proxy-address"
                                onChange={(event) =>
                                  updateSiteDraft("proxyPath", event.currentTarget.value)
                                }
                                value={siteDraft?.proxyPath ?? ""}
                              />
                            </SettingsField>
                            <SettingsField htmlFor="proxy-port" label={t("proxyPort")}>
                              <Input
                                id="proxy-port"
                                onChange={(event) =>
                                  updateSiteDraft("proxyPort", event.currentTarget.value)
                                }
                                value={siteDraft?.proxyPort ?? ""}
                              />
                            </SettingsField>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <Separator />

                  <div className="settings-section">
                    <div className="settings-section__title">{t("comments")}</div>
                    <div className="settings-grid">
                      <SettingsField htmlFor="comment-platform" label={t("commentPlatform")}>
                        <select
                          className="settings-select"
                          defaultValue="gitalk"
                          id="comment-platform"
                        >
                          <option value="gitalk">Gitalk</option>
                          <option value="disqus">Disqus</option>
                        </select>
                      </SettingsField>
                      <SettingsField htmlFor="comment-visibility" label={t("commentVisibility")}>
                        <select
                          className="settings-select"
                          defaultValue="show"
                          id="comment-visibility"
                        >
                          <option value="show">{t("show")}</option>
                          <option value="hide">{t("hide")}</option>
                        </select>
                      </SettingsField>
                      <SettingsField htmlFor="comment-client-id" label={t("clientIdShortname")}>
                        <Input id="comment-client-id" placeholder={t("commentsPlaceholder")} />
                      </SettingsField>
                      <SettingsField
                        htmlFor="comment-client-secret"
                        label={t("clientSecretApiKey")}
                      >
                        <Input
                          id="comment-client-secret"
                          placeholder={t("commentsPlaceholder")}
                          type="password"
                        />
                      </SettingsField>
                    </div>
                  </div>

                  <Button disabled={savingSite} onClick={handleSaveSite} type="button">
                    {savingSite ? t("saving") : t("save")}
                  </Button>
                </div>
              </section>
            ) : null}
          </div>
        </SidebarInset>

        <Dialog onOpenChange={setEditorVisible} open={editorVisible}>
          <DialogContent className="editor-overlay max-w-none border-0 p-0 shadow-none">
            <div className="editor-overlay__topbar">
              <div className="editor-overlay__title">
                <Badge variant="outline">{t("editorSettings")}</Badge>
                <span>{draft.data.title || t("untitledPost")}</span>
              </div>
              <div className="editor-overlay__actions">
                <Button
                  className="toolbar-action"
                  onClick={() => setEditorVisible(false)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <Button
                  className="toolbar-action"
                  disabled={savingPost || loadingPost}
                  onClick={() => handleSavePost(false)}
                  type="button"
                  variant="outline"
                >
                  <Check className="size-4" />
                  <span>{t("saveDraft")}</span>
                </Button>
                <Button
                  disabled={savingPost || loadingPost}
                  onClick={() => handleSavePost(true)}
                  type="button"
                >
                  <Check className="size-4" />
                  <span>{t("publishNow")}</span>
                </Button>
              </div>
            </div>

            <div className="editor-overlay__content">
              <div className="editor-main">
                <Input
                  className="editor-title"
                  onChange={(event) => updateDraft("data", "title", event.currentTarget.value)}
                  placeholder={t("title")}
                  value={draft.data.title}
                />
                <Textarea
                  className="editor-textarea"
                  onChange={(event) => updateDraft("root", "content", event.currentTarget.value)}
                  placeholder={t("markdownContent")}
                  value={draft.content}
                />
                <div className="editor-footer">
                  {draft.content ? t("writingIn") : t("editorEmpty")}
                </div>
              </div>

              <aside className="editor-sidepanel">
                <Accordion className="w-full" collapsible defaultValue="url" type="single">
                  <AccordionItem value="url">
                    <AccordionTrigger>{t("url")}</AccordionTrigger>
                    <AccordionContent className="editor-sidepanel__group">
                      <Input
                        onChange={(event) =>
                          updateDraft("root", "fileName", event.currentTarget.value)
                        }
                        value={draft.fileName}
                      />
                      <Button
                        onClick={() =>
                          updateDraft(
                            "root",
                            "fileName",
                            draft.fileName || slugify(draft.data.title)
                          )
                        }
                        type="button"
                        variant="outline"
                      >
                        {t("generateSlug")}
                      </Button>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="tags">
                    <AccordionTrigger>{t("tags")}</AccordionTrigger>
                    <AccordionContent className="editor-sidepanel__group">
                      <Input
                        onChange={(event) =>
                          updateDraft(
                            "data",
                            "tags",
                            event.currentTarget.value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="tag1, tag2"
                        value={draft.data.tags.join(", ")}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="date">
                    <AccordionTrigger>{t("createdAt")}</AccordionTrigger>
                    <AccordionContent className="editor-sidepanel__group">
                      <Input
                        onChange={(event) => updateDraft("data", "date", event.currentTarget.value)}
                        value={draft.data.date}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="feature">
                    <AccordionTrigger>{t("featureImage")}</AccordionTrigger>
                    <AccordionContent className="editor-sidepanel__group">
                      <Input
                        onChange={(event) =>
                          updateDraft("data", "feature", event.currentTarget.value)
                        }
                        value={draft.data.feature}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="options">
                    <AccordionTrigger>{t("articleOptions")}</AccordionTrigger>
                    <AccordionContent className="editor-sidepanel__group">
                      <div className="switch-row">
                        <span>{t("hideInList")}</span>
                        <Switch
                          checked={draft.data.hideInList}
                          onCheckedChange={(checked) => updateDraft("data", "hideInList", checked)}
                        />
                      </div>
                      <Separator />
                      <div className="switch-row">
                        <span>{t("pinToTop")}</span>
                        <Switch
                          checked={draft.data.isTop}
                          onCheckedChange={(checked) => updateDraft("data", "isTop", checked)}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </aside>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog onOpenChange={setSystemVisible} open={systemVisible}>
          <DialogContent className="system-overlay border-0 p-0 shadow-none">
            <div className="system-panel">
              <div className="system-panel__header">
                <div>
                  <div className="system-panel__eyebrow">{t("appName")}</div>
                  <h2>{t("settings")}</h2>
                  <p>{t("settingsDescription")}</p>
                </div>
                <Button
                  className="toolbar-action"
                  onClick={() => setSystemVisible(false)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              </div>

              <div className="system-panel__content">
                <Card className="system-card">
                  <CardHeader className="p-5 pb-0">
                    <CardTitle className="text-base">{t("language")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="settings-form">
                      <SettingsField htmlFor="system-language" label={t("uiLanguage")}>
                        <LanguagePicker onChange={setLanguage} value={language} />
                      </SettingsField>
                    </div>
                  </CardContent>
                </Card>

                <Card className="system-card">
                  <CardHeader className="p-5 pb-0">
                    <CardTitle className="text-base">{t("systemAppearance")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="settings-form">
                      <SettingsField htmlFor="system-theme" label={t("systemTheme")}>
                        <select
                          className="settings-select"
                          id="system-theme"
                          onChange={(event) => setTheme(event.currentTarget.value)}
                          value={theme ?? "system"}
                        >
                          <option value="system">{t("systemThemeSystem")}</option>
                          <option value="light">{t("systemThemeLight")}</option>
                          <option value="dark">{t("systemThemeDark")}</option>
                        </select>
                      </SettingsField>
                    </div>
                  </CardContent>
                </Card>

                <Card className="system-card">
                  <CardHeader className="p-5 pb-0">
                    <CardTitle className="text-base">{t("version")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 system-version">
                    <div className="system-version__row">
                      <span>{t("version")}</span>
                      <strong>{pkg.version}</strong>
                    </div>
                    <div className="system-version__row">
                      <span>{t("product")}</span>
                      <strong>{t("appName")}</strong>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="system-panel__footer">
                <Button disabled={savingSystem} onClick={handleSaveSystem} type="button">
                  {savingSystem ? t("saving") : t("save")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
