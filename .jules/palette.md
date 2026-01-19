# Palette's Journal

## 2024-05-22 - Initial Setup
**Learning:** Establishing a journal helps track UX/A11y decisions and outcomes.
**Action:** Review this journal before starting new tasks to avoid repeating mistakes.

## 2024-05-22 - Search Accessibility & Shortcuts
**Learning:** Adding a keyboard shortcut (`Cmd+K`) significantly speeds up interaction for power users, but it must be paired with visible hints so new users can discover it.
**Action:** Always include a visual badge (e.g., `<kbd>`) for keyboard shortcuts, and ensure the input has proper ARIA roles (`combobox`, `listbox`) for screen readers.

## 2024-05-22 - Error State Recovery
**Learning:** Users landing on dead-end error states (like 404s) need an explicit path back to safety (Home/Search) to prevent abandonment.
**Action:** Always provide a "Try Again" or "Back" button in error boundaries or empty states.
