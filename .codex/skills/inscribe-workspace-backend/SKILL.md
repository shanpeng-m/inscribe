# Inscribe Workspace and Tauri Backend

Use this skill when changing how Inscribe loads workspaces, persists posts, updates site settings, or stores internal data in SQLite.

## Scope
Inscribe currently supports:
- an internal SQLite-backed workspace
- workspace summary loading
- post listing and post detail loading
- post save/update flows
- site settings persistence
- theme summary exposure

## Relevant Files
- `src/lib/api.ts`
- `src/types/inscribe.ts`
- `src-tauri/src/lib.rs`
- `src-tauri/Cargo.toml`

## Rules
- Keep frontend and backend payload shapes aligned.
- Preserve existing serde camelCase compatibility.
- Avoid adding new persistence formats unless required.
- Favor focused helper extraction over growing `src-tauri/src/lib.rs` further.
- When changing storage behavior, think through:
  - migration/default behavior
  - empty internal workspace behavior
  - invalid content behavior
  - frontend fallback behavior

## Data Safety
- Do not casually rename persisted keys.
- Do not silently discard user content fields.
- Avoid breaking internal workspace bootstrapping.

## When Adding New Backend Features
1. Add or update the Rust model
2. Keep serialization names explicit
3. Update `src/types/inscribe.ts`
4. Update `src/lib/api.ts` if command payloads change
5. Verify the UI still handles empty/default values cleanly

## Verification
- Run `pnpm type-check`
- Run `pnpm build`
- If backend behavior changed, also run the relevant Tauri flow when practical
