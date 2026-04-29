# Inscribe

Inscribe is a Tauri v2 + React desktop publishing workspace for writing Markdown posts, managing local site settings, and building a static blog.

The first implementation follows Gridea's source-folder idea: a normal local directory is the project. Markdown remains the source of truth, while generated indexes and settings live beside the content.

## Workspace Layout

An Inscribe workspace uses this layout:

```text
config/
  setting.json
  posts.json
content/
  posts/
  post-images/
themes/
dist/
```

- `content/posts/*.md` is the canonical article location.
- `config/setting.json` stores site and publish settings.
- `config/posts.json` is a generated post index cache.
- `themes/` is reserved for local themes.
- `dist/` is reserved for generated site output.

The editor still reads legacy `posts/` folders as a fallback, but new saves go to `content/posts/`.

## Project Layout

- `apps/editor`: Tauri desktop/mobile editor.
- `apps/site`: static site renderer.
- `packages/core`: shared package for future parsing and platform-neutral logic.
- `content/`: default development workspace content.

## Setup

Requirements:

- Node.js 22+
- pnpm 10+
- Rust toolchain for desktop/Tauri development
- Xcode for iOS development

Install dependencies from the repository root:

```bash
pnpm install
```

## Common Commands

```bash
pnpm dev                 # same as pnpm dev:editor
pnpm dev:editor          # run the Tauri editor
pnpm dev:editor:frontend # run only the Vite frontend
pnpm dev:site            # run the static site preview
pnpm build:frontend      # build editor frontend
pnpm build:site          # build static site
pnpm build               # build the Tauri editor
pnpm type-check          # TypeScript checks
pnpm lint                # Biome checks
pnpm format:check        # formatting check
pnpm rust:check          # cargo check for the Tauri backend
```

## iOS

The root package forwards iOS commands to `apps/editor`:

```bash
pnpm ios:init
pnpm ios:dev
pnpm ios:dev:host
pnpm ios:open
pnpm ios:build
```

If `pnpm tauri ios dev` no longer works from the repository root, use `pnpm ios:dev`. The direct Tauri command must be run from `apps/editor`.

## Current Scope

Implemented:

- workspace loading and initialization
- article browse/create/edit/save/delete
- immediate language and theme switching
- local settings editing
- theme discovery
- site build command

Not implemented yet:

- integrated Git publish
- full theme engine
- editor image import UI
- local preview server controlled from the editor
