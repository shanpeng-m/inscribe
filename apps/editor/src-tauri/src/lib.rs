use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

const INTERNAL_WORKSPACE: &str = "internal://database";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceSummary {
    root: String,
    posts_count: usize,
    has_site_config: bool,
    current_theme: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct SiteConfig {
    title: String,
    description: String,
    domain: String,
    repository: String,
    theme_name: String,
    site_name: String,
    branch: String,
    language: String,
    platform: String,
    username: String,
    email: String,
    token_username: String,
    token: String,
    cname: String,
    port: String,
    server: String,
    password: String,
    private_key: String,
    remote_path: String,
    proxy_path: String,
    proxy_port: String,
    enabled_proxy: String,
    netlify_access_token: String,
    netlify_site_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ThemeSummary {
    folder: String,
    name: String,
    version: String,
    author: String,
    repository: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct PostData {
    title: String,
    date: String,
    tags: Vec<String>,
    published: bool,
    hide_in_list: bool,
    feature: String,
    is_top: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PostSummary {
    file_name: String,
    data: PostData,
    excerpt: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PostDetail {
    file_name: String,
    data: PostData,
    content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspacePayload {
    summary: WorkspaceSummary,
    site: SiteConfig,
    themes: Vec<ThemeSummary>,
    posts: Vec<PostSummary>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SavePostRequest {
    workspace_path: String,
    file_name: String,
    data: PostData,
    content: String,
}

fn default_site_config() -> SiteConfig {
    SiteConfig {
        title: "Inscribe".into(),
        description: String::new(),
        domain: String::new(),
        repository: String::new(),
        theme_name: "inscribe-default".into(),
        site_name: "Inscribe".into(),
        branch: "main".into(),
        language: "zhHans".into(),
        platform: "github".into(),
        username: String::new(),
        email: String::new(),
        token_username: String::new(),
        token: String::new(),
        cname: String::new(),
        port: "22".into(),
        server: String::new(),
        password: String::new(),
        private_key: String::new(),
        remote_path: String::new(),
        proxy_path: String::new(),
        proxy_port: String::new(),
        enabled_proxy: "direct".into(),
        netlify_access_token: String::new(),
        netlify_site_id: String::new(),
    }
}

fn internal_themes() -> Vec<ThemeSummary> {
    vec![ThemeSummary {
        folder: "inscribe-default".into(),
        name: "Inscribe Default".into(),
        version: "1.0".into(),
        author: "Inscribe".into(),
        repository: String::new(),
    }]
}

fn is_internal_workspace(workspace_path: &str) -> bool {
    let trimmed = workspace_path.trim();
    trimmed.is_empty() || trimmed == INTERNAL_WORKSPACE
}

fn open_internal_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data dir: {error}"))?;

    fs::create_dir_all(&app_data_dir).map_err(|error| {
        format!(
            "Failed to create app data dir {}: {error}",
            app_data_dir.display()
        )
    })?;

    let db_path = app_data_dir.join("inscribe.db");
    let conn = Connection::open(&db_path)
        .map_err(|error| format!("Failed to open database {}: {error}", db_path.display()))?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS posts (
          file_name TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          date TEXT NOT NULL,
          tags_json TEXT NOT NULL,
          published INTEGER NOT NULL DEFAULT 0,
          hide_in_list INTEGER NOT NULL DEFAULT 0,
          feature TEXT NOT NULL DEFAULT '',
          is_top INTEGER NOT NULL DEFAULT 0,
          content TEXT NOT NULL DEFAULT ''
        );
        ",
    )
    .map_err(|error| format!("Failed to initialize database schema: {error}"))?;

    let existing: Option<String> = conn
        .query_row(
            "SELECT value FROM meta WHERE key = 'site_config'",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|error| format!("Failed to read site config metadata: {error}"))?;

    if existing.is_none() {
        let site_json = serde_json::to_string(&default_site_config())
            .map_err(|error| format!("Failed to serialize default site config: {error}"))?;
        conn.execute(
            "INSERT INTO meta (key, value) VALUES ('site_config', ?1)",
            params![site_json],
        )
        .map_err(|error| format!("Failed to initialize site config metadata: {error}"))?;
    }

    Ok(conn)
}

fn load_internal_site_config(conn: &Connection) -> Result<SiteConfig, String> {
    let raw: String = conn
        .query_row(
            "SELECT value FROM meta WHERE key = 'site_config'",
            [],
            |row| row.get(0),
        )
        .map_err(|error| format!("Failed to load site config from database: {error}"))?;

    serde_json::from_str(&raw)
        .map_err(|error| format!("Failed to deserialize site config from database: {error}"))
}

fn save_internal_site_config(conn: &Connection, site: &SiteConfig) -> Result<SiteConfig, String> {
    let raw = serde_json::to_string(site)
        .map_err(|error| format!("Failed to serialize site config for database: {error}"))?;

    conn.execute(
        "INSERT INTO meta (key, value) VALUES ('site_config', ?1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![raw],
    )
    .map_err(|error| format!("Failed to save site config to database: {error}"))?;

    Ok(site.clone())
}

fn load_internal_posts(conn: &Connection) -> Result<Vec<PostSummary>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT file_name, title, date, tags_json, published, hide_in_list, feature, is_top, content
             FROM posts
             ORDER BY date DESC, file_name ASC",
        )
        .map_err(|error| format!("Failed to prepare internal posts query: {error}"))?;

    let rows = stmt
        .query_map([], |row| {
            let tags_json: String = row.get(3)?;
            let tags = serde_json::from_str::<Vec<String>>(&tags_json).unwrap_or_default();

            let data = PostData {
                title: row.get(1)?,
                date: row.get(2)?,
                tags,
                published: row.get::<_, i64>(4)? != 0,
                hide_in_list: row.get::<_, i64>(5)? != 0,
                feature: row.get(6)?,
                is_top: row.get::<_, i64>(7)? != 0,
            };
            let content: String = row.get(8)?;

            Ok(PostSummary {
                file_name: row.get(0)?,
                excerpt: build_excerpt(&content),
                data,
            })
        })
        .map_err(|error| format!("Failed to load internal posts: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Failed to collect internal posts: {error}"))
}

fn load_internal_post(conn: &Connection, file_name: &str) -> Result<PostDetail, String> {
    conn.query_row(
        "SELECT file_name, title, date, tags_json, published, hide_in_list, feature, is_top, content
         FROM posts
         WHERE file_name = ?1",
        params![file_name],
        |row| {
            let tags_json: String = row.get(3)?;
            let tags = serde_json::from_str::<Vec<String>>(&tags_json).unwrap_or_default();
            Ok(PostDetail {
                file_name: row.get(0)?,
                data: PostData {
                    title: row.get(1)?,
                    date: row.get(2)?,
                    tags,
                    published: row.get::<_, i64>(4)? != 0,
                    hide_in_list: row.get::<_, i64>(5)? != 0,
                    feature: row.get(6)?,
                    is_top: row.get::<_, i64>(7)? != 0,
                },
                content: row.get(8)?,
            })
        },
    )
    .map_err(|error| format!("Failed to load post '{file_name}' from database: {error}"))
}

fn save_internal_post(conn: &Connection, request: &SavePostRequest) -> Result<PostDetail, String> {
    let tags_json = serde_json::to_string(&request.data.tags)
        .map_err(|error| format!("Failed to serialize post tags: {error}"))?;

    conn.execute(
        "INSERT INTO posts (
          file_name, title, date, tags_json, published, hide_in_list, feature, is_top, content
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(file_name) DO UPDATE SET
          title = excluded.title,
          date = excluded.date,
          tags_json = excluded.tags_json,
          published = excluded.published,
          hide_in_list = excluded.hide_in_list,
          feature = excluded.feature,
          is_top = excluded.is_top,
          content = excluded.content",
        params![
            request.file_name,
            request.data.title,
            request.data.date,
            tags_json,
            if request.data.published { 1 } else { 0 },
            if request.data.hide_in_list { 1 } else { 0 },
            request.data.feature,
            if request.data.is_top { 1 } else { 0 },
            request.content,
        ],
    )
    .map_err(|error| format!("Failed to save post to database: {error}"))?;

    load_internal_post(conn, &request.file_name)
}

fn delete_internal_post(conn: &Connection, file_name: &str) -> Result<(), String> {
    let affected = conn
        .execute("DELETE FROM posts WHERE file_name = ?1", params![file_name])
        .map_err(|error| format!("Failed to delete post from database: {error}"))?;

    if affected == 0 {
        return Err(format!("Post not found: {file_name}"));
    }

    Ok(())
}

fn normalize_workspace(workspace_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(workspace_path.trim());
    if workspace_path.trim().is_empty() {
        return Err("Workspace path is required.".into());
    }
    if !path.exists() {
        return Err(format!("Workspace does not exist: {}", path.display()));
    }
    if !path.is_dir() {
        return Err(format!("Workspace is not a directory: {}", path.display()));
    }
    Ok(path)
}

fn config_dir(workspace: &Path) -> PathBuf {
    workspace.join("config")
}

fn setting_path(workspace: &Path) -> PathBuf {
    config_dir(workspace).join("setting.json")
}

fn posts_index_path(workspace: &Path) -> PathBuf {
    config_dir(workspace).join("posts.json")
}

fn canonical_posts_dir(workspace: &Path) -> PathBuf {
    workspace.join("content").join("posts")
}

fn legacy_posts_dir(workspace: &Path) -> PathBuf {
    workspace.join("posts")
}

fn post_images_dir(workspace: &Path) -> PathBuf {
    workspace.join("content").join("post-images")
}

fn resolve_posts_dir_for_read(workspace: &Path) -> PathBuf {
    if canonical_posts_dir(workspace).exists() {
        canonical_posts_dir(workspace)
    } else {
        legacy_posts_dir(workspace)
    }
}

fn resolve_post_path_for_read(workspace: &Path, file_name: &str) -> PathBuf {
    let canonical = canonical_posts_dir(workspace).join(format!("{file_name}.md"));
    if canonical.exists() {
        canonical
    } else {
        legacy_posts_dir(workspace).join(format!("{file_name}.md"))
    }
}

fn read_json_map(path: &Path) -> Result<Map<String, Value>, String> {
    if !path.exists() {
        return Ok(Map::new());
    }

    let raw = fs::read_to_string(path)
        .map_err(|error| format!("Failed to read {}: {error}", path.display()))?;
    let value: Value = serde_json::from_str(&raw)
        .map_err(|error| format!("Failed to parse {}: {error}", path.display()))?;

    match value {
        Value::Object(map) => Ok(map),
        _ => Err(format!("Expected JSON object in {}", path.display())),
    }
}

fn string_value(map: &Map<String, Value>, key: &str) -> String {
    map.get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

fn bool_value(map: &Map<String, Value>, key: &str) -> bool {
    map.get(key).and_then(Value::as_bool).unwrap_or(false)
}

fn parse_tags(raw: &str) -> Vec<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return vec![];
    }

    let without_brackets = trimmed.trim_start_matches('[').trim_end_matches(']').trim();

    if without_brackets.is_empty() {
        return vec![];
    }

    without_brackets
        .split(',')
        .flat_map(|item| item.split_whitespace().collect::<Vec<_>>())
        .map(clean_scalar)
        .filter(|item| !item.is_empty())
        .collect()
}

fn clean_scalar(raw: &str) -> String {
    raw.trim()
        .trim_matches('\'')
        .trim_matches('"')
        .trim()
        .to_string()
}

fn split_frontmatter(raw: &str) -> (Map<String, Value>, String) {
    let normalized = raw.replace("\r\n", "\n");
    let mut lines = normalized.lines();
    let mut frontmatter = Map::new();

    if lines.next() != Some("---") {
        return (frontmatter, normalized);
    }

    let mut body_start_index = 0usize;
    let mut consumed = "---\n".len();

    for line in normalized["---\n".len()..].lines() {
        consumed += line.len() + 1;
        if line.trim() == "---" {
            body_start_index = consumed;
            break;
        }

        if let Some((key, value)) = line.split_once(':') {
            let parsed_value = value.trim();
            let key = key.trim();
            let json_value = if parsed_value.starts_with('[') && parsed_value.ends_with(']') {
                Value::Array(
                    parse_tags(parsed_value)
                        .into_iter()
                        .map(Value::String)
                        .collect(),
                )
            } else if matches!(parsed_value, "true" | "false") {
                Value::Bool(parsed_value == "true")
            } else {
                Value::String(clean_scalar(parsed_value))
            };

            frontmatter.insert(key.to_string(), json_value);
        }
    }

    let content = if body_start_index > 0 && body_start_index <= normalized.len() {
        normalized[body_start_index..].to_string()
    } else {
        String::new()
    };

    (frontmatter, content)
}

fn post_data_from_map(map: &Map<String, Value>) -> PostData {
    let tags = match map.get("tags") {
        Some(Value::Array(items)) => items
            .iter()
            .filter_map(Value::as_str)
            .map(ToString::to_string)
            .collect(),
        Some(Value::String(raw)) => parse_tags(raw),
        _ => vec![],
    };

    PostData {
        title: string_value(map, "title"),
        date: string_value(map, "date"),
        tags,
        published: bool_value(map, "published"),
        hide_in_list: bool_value(map, "hideInList"),
        feature: string_value(map, "feature"),
        is_top: bool_value(map, "isTop"),
    }
}

fn build_excerpt(content: &str) -> String {
    let marker = "<!-- more -->";
    let before_more = content.split(marker).next().unwrap_or(content).trim();
    let compact = before_more
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join(" ");

    if compact.len() <= 180 {
        compact
    } else {
        format!("{}...", &compact[..180])
    }
}

fn parse_post_file(path: &Path) -> Result<PostDetail, String> {
    let raw = fs::read_to_string(path)
        .map_err(|error| format!("Failed to read {}: {error}", path.display()))?;
    let (frontmatter, content) = split_frontmatter(&raw);
    let data = post_data_from_map(&frontmatter);
    let file_name = path
        .file_stem()
        .and_then(|item| item.to_str())
        .unwrap_or_default()
        .to_string();

    Ok(PostDetail {
        file_name,
        data,
        content,
    })
}

fn load_site_config(workspace: &Path) -> Result<SiteConfig, String> {
    let map = read_json_map(&setting_path(workspace))?;
    let config = map
        .get("config")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let defaults = default_site_config();

    Ok(SiteConfig {
        title: string_value(&config, "title").if_empty_then(defaults.title),
        description: string_value(&config, "description"),
        domain: string_value(&config, "domain"),
        repository: string_value(&config, "repository"),
        theme_name: string_value(&config, "themeName").if_empty_then(defaults.theme_name),
        site_name: string_value(&config, "siteName").if_empty_then(defaults.site_name),
        branch: string_value(&config, "branch").if_empty_then(defaults.branch),
        language: string_value(&config, "language").if_empty_then(defaults.language),
        platform: string_value(&config, "platform").if_empty_then(defaults.platform),
        username: string_value(&config, "username"),
        email: string_value(&config, "email"),
        token_username: string_value(&config, "tokenUsername"),
        token: string_value(&config, "token"),
        cname: string_value(&config, "cname"),
        port: string_value(&config, "port").if_empty_then(defaults.port),
        server: string_value(&config, "server"),
        password: string_value(&config, "password"),
        private_key: string_value(&config, "privateKey"),
        remote_path: string_value(&config, "remotePath"),
        proxy_path: string_value(&config, "proxyPath"),
        proxy_port: string_value(&config, "proxyPort"),
        enabled_proxy: string_value(&config, "enabledProxy").if_empty_then(defaults.enabled_proxy),
        netlify_access_token: string_value(&config, "netlifyAccessToken"),
        netlify_site_id: string_value(&config, "netlifySiteId"),
    })
}

fn save_site_config_internal(workspace: &Path, site: &SiteConfig) -> Result<SiteConfig, String> {
    let config_dir = config_dir(workspace);
    fs::create_dir_all(&config_dir)
        .map_err(|error| format!("Failed to create {}: {error}", config_dir.display()))?;

    let setting_path = setting_path(workspace);
    let mut root = read_json_map(&setting_path)?;
    let mut config = root
        .get("config")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();

    config.insert("title".into(), Value::String(site.title.clone()));
    config.insert(
        "description".into(),
        Value::String(site.description.clone()),
    );
    config.insert("domain".into(), Value::String(site.domain.clone()));
    config.insert("repository".into(), Value::String(site.repository.clone()));
    config.insert("themeName".into(), Value::String(site.theme_name.clone()));
    config.insert("siteName".into(), Value::String(site.site_name.clone()));
    config.insert("branch".into(), Value::String(site.branch.clone()));
    config.insert("language".into(), Value::String(site.language.clone()));
    config.insert("platform".into(), Value::String(site.platform.clone()));
    config.insert("username".into(), Value::String(site.username.clone()));
    config.insert("email".into(), Value::String(site.email.clone()));
    config.insert(
        "tokenUsername".into(),
        Value::String(site.token_username.clone()),
    );
    config.insert("token".into(), Value::String(site.token.clone()));
    config.insert("cname".into(), Value::String(site.cname.clone()));
    config.insert("port".into(), Value::String(site.port.clone()));
    config.insert("server".into(), Value::String(site.server.clone()));
    config.insert("password".into(), Value::String(site.password.clone()));
    config.insert("privateKey".into(), Value::String(site.private_key.clone()));
    config.insert("remotePath".into(), Value::String(site.remote_path.clone()));
    config.insert("proxyPath".into(), Value::String(site.proxy_path.clone()));
    config.insert("proxyPort".into(), Value::String(site.proxy_port.clone()));
    config.insert(
        "enabledProxy".into(),
        Value::String(site.enabled_proxy.clone()),
    );
    config.insert(
        "netlifyAccessToken".into(),
        Value::String(site.netlify_access_token.clone()),
    );
    config.insert(
        "netlifySiteId".into(),
        Value::String(site.netlify_site_id.clone()),
    );

    root.insert("config".into(), Value::Object(config));

    let json = serde_json::to_string_pretty(&Value::Object(root))
        .map_err(|error| format!("Failed to serialize setting.json: {error}"))?;
    fs::write(&setting_path, json)
        .map_err(|error| format!("Failed to write {}: {error}", setting_path.display()))?;

    Ok(site.clone())
}

fn load_themes(workspace: &Path) -> Result<Vec<ThemeSummary>, String> {
    let themes_dir = workspace.join("themes");
    if !themes_dir.exists() {
        return Ok(vec![]);
    }

    let mut themes = Vec::new();

    for entry in fs::read_dir(&themes_dir)
        .map_err(|error| format!("Failed to read {}: {error}", themes_dir.display()))?
    {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let folder = entry.file_name().to_string_lossy().to_string();
        let config_path = path.join("config.json");
        let config = read_json_map(&config_path).unwrap_or_default();

        themes.push(ThemeSummary {
            folder: folder.clone(),
            name: string_value(&config, "name").if_empty_then(folder.clone()),
            version: string_value(&config, "version"),
            author: string_value(&config, "author"),
            repository: string_value(&config, "repository"),
        });
    }

    themes.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
    Ok(themes)
}

trait IfEmptyThen {
    fn if_empty_then(self, fallback: String) -> String;
}

impl IfEmptyThen for String {
    fn if_empty_then(self, fallback: String) -> String {
        if self.is_empty() {
            fallback
        } else {
            self
        }
    }
}

fn load_posts(workspace: &Path) -> Result<Vec<PostSummary>, String> {
    let posts_dir = resolve_posts_dir_for_read(workspace);
    if !posts_dir.exists() {
        return Ok(vec![]);
    }

    let mut posts = Vec::new();

    for entry in fs::read_dir(&posts_dir)
        .map_err(|error| format!("Failed to read {}: {error}", posts_dir.display()))?
    {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let is_markdown = path
            .extension()
            .and_then(|item| item.to_str())
            .map(|item| item.eq_ignore_ascii_case("md"))
            .unwrap_or(false);

        if !is_markdown {
            continue;
        }

        let detail = parse_post_file(&path)?;
        posts.push(PostSummary {
            file_name: detail.file_name,
            excerpt: build_excerpt(&detail.content),
            data: detail.data,
        });
    }

    posts.sort_by(|left, right| {
        right
            .data
            .date
            .cmp(&left.data.date)
            .then_with(|| left.file_name.cmp(&right.file_name))
    });

    Ok(posts)
}

fn write_posts_index(workspace: &Path, posts: &[PostSummary]) -> Result<(), String> {
    let config_dir = config_dir(workspace);
    fs::create_dir_all(&config_dir)
        .map_err(|error| format!("Failed to create {}: {error}", config_dir.display()))?;

    let mut root = Map::new();
    let posts_value = serde_json::to_value(posts)
        .map_err(|error| format!("Failed to serialize post index: {error}"))?;
    root.insert("posts".into(), posts_value);

    let json = serde_json::to_string_pretty(&Value::Object(root))
        .map_err(|error| format!("Failed to serialize posts.json: {error}"))?;
    let path = posts_index_path(workspace);
    fs::write(&path, json).map_err(|error| format!("Failed to write {}: {error}", path.display()))
}

fn refresh_posts_index(workspace: &Path) -> Result<Vec<PostSummary>, String> {
    let posts = load_posts(workspace)?;
    write_posts_index(workspace, &posts)?;
    Ok(posts)
}

fn ensure_posts_dir(workspace: &Path) -> Result<PathBuf, String> {
    let posts_dir = canonical_posts_dir(workspace);
    fs::create_dir_all(&posts_dir)
        .map_err(|error| format!("Failed to create {}: {error}", posts_dir.display()))?;
    Ok(posts_dir)
}

fn ensure_workspace_layout(workspace: &Path) -> Result<(), String> {
    if !workspace.exists() {
        fs::create_dir_all(workspace)
            .map_err(|error| format!("Failed to create {}: {error}", workspace.display()))?;
    }

    if !workspace.is_dir() {
        return Err(format!(
            "Workspace is not a directory: {}",
            workspace.display()
        ));
    }

    let required_dirs = [
        config_dir(workspace),
        canonical_posts_dir(workspace),
        post_images_dir(workspace),
        workspace.join("themes"),
        workspace.join("dist"),
    ];

    for dir in required_dirs {
        fs::create_dir_all(&dir)
            .map_err(|error| format!("Failed to create {}: {error}", dir.display()))?;
    }

    if !setting_path(workspace).exists() {
        save_site_config_internal(workspace, &default_site_config())?;
    }

    refresh_posts_index(workspace)?;
    Ok(())
}

fn serialize_post(post: &SavePostRequest) -> String {
    let tags = if post.data.tags.is_empty() {
        String::new()
    } else {
        post.data.tags.join(", ")
    };

    format!(
        "---\n\
title: '{}'\n\
date: {}\n\
tags: [{}]\n\
published: {}\n\
hideInList: {}\n\
feature: {}\n\
isTop: {}\n\
---\n{}",
        post.data.title.replace('\'', "''"),
        post.data.date,
        tags,
        post.data.published,
        post.data.hide_in_list,
        post.data.feature,
        post.data.is_top,
        post.content.trim_end()
    )
}

fn markdown_link_targets(content: &str) -> Vec<String> {
    let mut targets = Vec::new();
    let mut rest = content;

    while let Some(start) = rest.find("](") {
        let after_start = &rest[start + 2..];
        if let Some(end) = after_start.find(')') {
            let target = after_start[..end].trim();
            if !target.is_empty() {
                targets.push(target.to_string());
            }
            rest = &after_start[end + 1..];
        } else {
            break;
        }
    }

    targets
}

fn is_external_target(value: &str) -> bool {
    let lower = value.to_lowercase();
    lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("data:")
        || lower.starts_with("mailto:")
}

fn delete_workspace_media_if_local(workspace: &Path, target: &str) {
    let clean = target
        .split('#')
        .next()
        .unwrap_or(target)
        .split('?')
        .next()
        .unwrap_or(target)
        .trim()
        .trim_start_matches('/');

    if clean.is_empty() || is_external_target(clean) {
        return;
    }

    let candidate = workspace.join(clean);
    let Ok(canonical_workspace) = workspace.canonicalize() else {
        return;
    };
    let Ok(canonical_candidate) = candidate.canonicalize() else {
        return;
    };

    let allowed_media_roots = [
        post_images_dir(workspace),
        workspace.join("post-images"),
        workspace.join("content").join("media"),
    ];

    let is_workspace_local = canonical_candidate.starts_with(&canonical_workspace);
    let is_media_file = allowed_media_roots.iter().any(|root| {
        root.canonicalize()
            .map(|canonical_root| canonical_candidate.starts_with(canonical_root))
            .unwrap_or(false)
    });

    if is_workspace_local && is_media_file && canonical_candidate.is_file() {
        let _ = fs::remove_file(canonical_candidate);
    }
}

fn delete_post_file(workspace: &Path, file_name: &str) -> Result<(), String> {
    let path = resolve_post_path_for_read(workspace, file_name);
    if !path.exists() {
        return Err(format!("Post not found: {}", path.display()));
    }

    let detail = parse_post_file(&path)?;
    let mut media_targets = markdown_link_targets(&detail.content);
    if !detail.data.feature.trim().is_empty() {
        media_targets.push(detail.data.feature);
    }

    fs::remove_file(&path)
        .map_err(|error| format!("Failed to delete {}: {error}", path.display()))?;

    for target in media_targets {
        delete_workspace_media_if_local(workspace, &target);
    }

    refresh_posts_index(workspace)?;
    Ok(())
}

#[tauri::command]
fn load_workspace(
    app: tauri::AppHandle,
    workspace_path: String,
) -> Result<WorkspacePayload, String> {
    if is_internal_workspace(&workspace_path) {
        let conn = open_internal_db(&app)?;
        let site = load_internal_site_config(&conn)?;
        let posts = load_internal_posts(&conn)?;
        let themes = internal_themes();

        return Ok(WorkspacePayload {
            summary: WorkspaceSummary {
                root: INTERNAL_WORKSPACE.into(),
                posts_count: posts.len(),
                has_site_config: true,
                current_theme: site.theme_name.clone(),
            },
            site,
            themes,
            posts,
        });
    }

    let workspace = normalize_workspace(&workspace_path)?;
    let site = load_site_config(&workspace)?;
    let themes = load_themes(&workspace)?;
    let posts = refresh_posts_index(&workspace)?;

    let summary = WorkspaceSummary {
        root: workspace.display().to_string(),
        posts_count: posts.len(),
        has_site_config: setting_path(&workspace).exists(),
        current_theme: site.theme_name.clone(),
    };

    Ok(WorkspacePayload {
        summary,
        site,
        themes,
        posts,
    })
}

#[tauri::command]
fn initialize_workspace(workspace_path: String) -> Result<WorkspacePayload, String> {
    let workspace = normalize_workspace(&workspace_path)?;
    ensure_workspace_layout(&workspace)?;

    let site = load_site_config(&workspace)?;
    let themes = load_themes(&workspace)?;
    let posts = refresh_posts_index(&workspace)?;

    Ok(WorkspacePayload {
        summary: WorkspaceSummary {
            root: workspace.display().to_string(),
            posts_count: posts.len(),
            has_site_config: true,
            current_theme: site.theme_name.clone(),
        },
        site,
        themes,
        posts,
    })
}

#[tauri::command]
fn load_post(
    app: tauri::AppHandle,
    workspace_path: String,
    file_name: String,
) -> Result<PostDetail, String> {
    if is_internal_workspace(&workspace_path) {
        let conn = open_internal_db(&app)?;
        return load_internal_post(&conn, &file_name);
    }

    let workspace = normalize_workspace(&workspace_path)?;
    let path = resolve_post_path_for_read(&workspace, &file_name);
    if !path.exists() {
        return Err(format!("Post not found: {}", path.display()));
    }
    parse_post_file(&path)
}

#[tauri::command]
fn save_post(app: tauri::AppHandle, request: SavePostRequest) -> Result<PostDetail, String> {
    if is_internal_workspace(&request.workspace_path) {
        let conn = open_internal_db(&app)?;
        return save_internal_post(&conn, &request);
    }

    let workspace = normalize_workspace(&request.workspace_path)?;
    let posts_dir = ensure_posts_dir(&workspace)?;
    let path = posts_dir.join(format!("{}.md", request.file_name));
    let serialized = serialize_post(&request);
    fs::write(&path, serialized)
        .map_err(|error| format!("Failed to write {}: {error}", path.display()))?;
    refresh_posts_index(&workspace)?;
    parse_post_file(&path)
}

#[tauri::command]
fn delete_post(
    app: tauri::AppHandle,
    workspace_path: String,
    file_name: String,
) -> Result<(), String> {
    if is_internal_workspace(&workspace_path) {
        let conn = open_internal_db(&app)?;
        return delete_internal_post(&conn, &file_name);
    }

    let workspace = normalize_workspace(&workspace_path)?;
    delete_post_file(&workspace, &file_name)
}

#[tauri::command]
fn save_site_settings(
    app: tauri::AppHandle,
    workspace_path: String,
    site: SiteConfig,
) -> Result<SiteConfig, String> {
    if is_internal_workspace(&workspace_path) {
        let conn = open_internal_db(&app)?;
        return save_internal_site_config(&conn, &site);
    }

    let workspace = normalize_workspace(&workspace_path)?;
    save_site_config_internal(&workspace, &site)
}
#[tauri::command]
async fn run_blog_build(workspace_path: String) -> Result<String, String> {
    if is_internal_workspace(&workspace_path) {
        return Err("Internal database workspace doesn't support local builds yet.".into());
    }

    let _workspace = normalize_workspace(&workspace_path)?;
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let repo_root = manifest_dir
        .parent()
        .and_then(Path::parent)
        .and_then(Path::parent)
        .ok_or_else(|| "Failed to resolve Inscribe repository root.".to_string())?;

    let output = std::process::Command::new("pnpm")
        .arg("build:site")
        .current_dir(repo_root)
        .output()
        .map_err(|e| format!("Failed to execute build command: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            load_workspace,
            initialize_workspace,
            load_post,
            save_post,
            delete_post,
            save_site_settings,
            run_blog_build
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
