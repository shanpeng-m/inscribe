# AGENTS.md — Instructions for Coding Agents Working on Inscribe

## Project Goal
Build and maintain `inscribe` as a modern desktop publishing workspace.

The product is currently a Tauri + React desktop app for:
- loading a workspace
- browsing and editing posts
- editing site/publish settings
- managing local themes
- storing an internal fallback workspace in SQLite

Changes should improve clarity, usability, and maintainability without dragging the project into unnecessary architecture.

## Working Style
- Start from the user goal, not from the first implementation idea.
- Keep changes focused and local to the requested outcome.
- Prefer improving the current code over introducing broad abstractions.
- Explain assumptions when the target behavior is not fully specified.
- If a proposed direction is workable but clearly suboptimal, say so before implementing.

## Ground Rules
- Do not refactor unrelated code.
- Do not modify generated artifacts such as `dist/`, `src-tauri/target/`, or `src-tauri/gen/`.
- Do not upgrade dependencies or rewrite configuration broadly unless the task actually requires it.
- Avoid lockfile churn unless a new dependency is necessary.
- Prefer existing utilities and UI primitives before adding new helpers or components.
- Be explicit about commands you ran and what you verified.

## Project Shape
- Frontend entry: `src/main.tsx`
- App shell and page composition: `src/App.tsx`
- Global styling and tokens: `src/index.css`, `src/App.css`
- UI primitives: `src/components/ui/`
- Theme provider: `src/components/theme-provider.tsx`
- Frontend API bridge: `src/lib/api.ts`
- Shared helpers: `src/lib/utils.ts`
- i18n bootstrap: `src/i18n.ts`
- Locale dictionaries: `src/locales/`
- Frontend shared types: `src/types/inscribe.ts`
- Tauri backend: `src-tauri/src/`
- Current backend implementation is primarily in: `src-tauri/src/lib.rs`

## Architecture Guidance
- `src/App.tsx` is already large. Do not keep appending unrelated UI and state forever.
- For any non-trivial new area, prefer extracting a focused nearby module rather than making `App.tsx` larger.
- Good extraction candidates:
  - presentational UI sections into `src/components/`
  - editing or filtering logic into `src/lib/`
  - i18n-related helpers into `src/i18n.ts` or a nearby helper file
  - backend parsing/persistence helpers into small Rust functions or modules under `src-tauri/src/`
- Keep shared abstractions narrow. This repo does not need large framework-style layers.

## UI / UX Rules
- Optimize for editorial workflow first: scanability, fast selection, low-friction editing, safe settings changes.
- Prefer strong hierarchy, clear panels, visible status, and obvious primary actions.
- Keep desktop ergonomics in mind: dense enough to be efficient, but not cramped.
- Avoid “template-looking” UI. Use the existing visual direction:
  - glassy card surfaces
  - strong primary accent
  - rounded desktop panels
  - clear split between navigation, content, and editor states
- Every new UI should consider:
  - empty state
  - loading state
  - error feedback
  - disabled state
  - long text / overflow behavior
  - narrow window behavior

## i18n Rules
- Supported UI languages:
  - `en`
  - `zh-CN`
  - `zh-TW`
  - `ja`
  - `fr`
  - `ko`
  - `de`
- Register new locales and language mappings in `src/i18n.ts`.
- Keep locale keys aligned across dictionaries.
- When adding UI copy, update all locale files in the same change when practical.
- If full translation coverage is not feasible, fall back cleanly through the existing i18n configuration rather than leaving broken keys in the UI.
- Do not introduce ad hoc language code variants when an existing normalized code already exists.

## Backend Rules
- The backend currently mixes workspace loading, SQLite persistence, and content serialization inside `src-tauri/src/lib.rs`.
- Reuse existing persistence patterns before adding new storage formats.
- Keep command payloads explicit and camelCase-compatible with the current serde setup.
- Avoid adding backend complexity unless the user request needs it.
- If `src-tauri/src/lib.rs` grows significantly again, prefer extracting cohesive modules instead of extending the monolith.

## Code Reuse
- Before creating new helpers, check:
  - `src/components/ui/`
  - `src/lib/api.ts`
  - `src/lib/utils.ts`
  - `src/types/inscribe.ts`
- Reuse existing app conventions for:
  - button variants
  - cards
  - dialogs
  - input styles
  - workspace and post payload shapes

## Commands
Run what is relevant before finishing:
- install deps: `pnpm i`
- type-check: `pnpm type-check`
- build frontend: `pnpm build:frontend`
- full build: `pnpm build`
- tauri dev: `pnpm tauri:dev`

If a command is not run, say why.

## Validation Discipline
- After every code edit, run the relevant validation commands before finishing the task.
- Minimum expectation for frontend edits:
  - `pnpm type-check`
  - `pnpm lint`
- For formatting-sensitive changes, also run:
  - `pnpm format:check`
- For Tauri or Rust backend changes, also run the backend checks included in:
  - `pnpm lint`
  - `pnpm format:check`
- For changes that affect bundling, startup flow, or asset loading, also run:
  - `pnpm build`
- Do not skip validation just because the change feels small.
- If a required check cannot run, state the blocker explicitly in the final response.

## Acceptance Criteria
- The requested behavior is implemented without unrelated churn.
- Type-check and/or build pass when relevant.
- New UI is consistent with the current Inscribe visual system.
- i18n changes remain normalized and do not regress language switching.
- Backend/frontend payloads remain aligned.

## Avoid
- Overengineering the repo into a large enterprise architecture.
- Adding new dependencies for problems the current stack already solves.
- Creating duplicate UI primitives.
- Mixing unrelated product ideas into the same patch.
- Silencing problems instead of fixing them cleanly.
