# Palette's Journal

## 2024-05-22 - Initial Setup
**Learning:** Establishing a journal helps track UX/A11y decisions and outcomes.
**Action:** Review this journal before starting new tasks to avoid repeating mistakes.

## 2024-05-24 - Tooltip Accessibility
**Learning:** Tooltips triggered by non-interactive elements (like `Info` icons) are inaccessible to keyboard users because they cannot receive focus.
**Action:** Always wrap informative icons in a `<button>` with an `aria-label` inside `TooltipTrigger` to ensure they are focusable and announceable.

## 2024-05-24 - Keyboard Shortcuts
**Learning:** Power users expect common shortcuts like `/` for search. Visual hints for these shortcuts improve discoverability.
**Action:** Add `<kbd>` hints to search inputs and implement global hotkeys where appropriate.
