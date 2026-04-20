# Inscribe UI Modernization

Use this skill when working on Inscribe's UI shell, panels, editor experience, navigation, settings, or visual polish.

## Goal
Preserve Inscribe as a focused desktop editorial tool while improving clarity, speed, and visual quality.

## Core Principles
- Design for desktop task flow first.
- Keep the editing workflow obvious and low-friction.
- Prefer one strong primary action per area.
- Use visual hierarchy to separate:
  - workspace status
  - navigation
  - content list
  - editor
  - system/settings surfaces
- Reuse the project's visual language:
  - rounded panels
  - semi-translucent cards
  - accent-led primary actions
  - compact but readable spacing

## Preferred Files
- `src/App.tsx`
- `src/App.css`
- `src/index.css`
- `src/components/ui/*`

## Before Editing
1. Identify whether the change belongs to:
   - app shell
   - list/detail flow
   - editor flow
   - settings flow
2. Check whether the change can reuse an existing `src/components/ui/` primitive.
3. If the change adds substantial UI logic, extract a focused component instead of extending `src/App.tsx` indefinitely.

## Interaction Rules
- Make loading, empty, and error states visible.
- Avoid hidden critical actions.
- Do not bury the current document state or workspace state.
- Preserve readability for long post titles and tag lists.
- Ensure layouts still work on narrower desktop windows.

## Do Not
- Revert to generic admin-dashboard styling.
- Introduce multiple competing accent colors.
- Add gratuitous animation or motion-heavy behavior.
- Make the editor visually noisy.

## Verification
- Run `pnpm type-check`
- Run `pnpm build`
- Check that light and dark themes both remain coherent
- Confirm the language switcher and settings dialog still fit visually
