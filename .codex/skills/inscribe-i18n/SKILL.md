# Inscribe i18n and Language Expansion

Use this skill when adding copy, expanding language support, normalizing locale codes, or fixing translation regressions in Inscribe.

## Current Supported Languages
- `en`
- `zh-CN`
- `zh-TW`
- `ja`
- `fr`
- `ko`
- `de`

## Relevant Files
- `src/i18n.ts`
- `src/locales/en.ts`
- `src/locales/zhHans.ts`
- `src/locales/zhHant.ts`
- `src/locales/ja_JP.ts`
- `src/locales/fr.ts`
- `src/locales/ko.ts`
- `src/locales/de.ts`

## Rules
- Keep `en` as the reference schema for translation keys.
- When adding keys, update `en` first, then add corresponding entries in other locale files.
- Keep normalized codes stable. Do not introduce new variants if `src/i18n.ts` already maps legacy codes.
- If older values such as `zhHans`, `ja_JP`, or `fr_FR` appear, map them through normalization rather than duplicating locale resources.
- Prefer concise product copy. This is a desktop tool, not marketing UI.

## Translation Guidance
- Use natural product language, not word-for-word literal conversions.
- Preserve UI brevity for buttons, badges, and headings.
- Keep labels stable and predictable across screens.
- For technical fields like repository, branch, proxy, token, or workspace, prefer familiar developer-facing wording.

## Verification
1. Run `pnpm type-check`
2. Run `pnpm build`
3. Switch languages in the app and confirm:
   - settings dialog still fits
   - toolbar actions do not overflow badly
   - long translated labels do not break layout
