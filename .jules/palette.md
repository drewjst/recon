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

## 2025-02-19 - Skip Links & Autofocus
**Learning:** `autoFocus` on the main content (e.g. search input) can bypass the "Skip to Content" link for keyboard users on initial load, but the link remains critical for screen reader users and subsequent navigation.
**Action:** Ensure "Skip to Content" links are always present in the root layout, even if the page has `autoFocus` elements, as they serve different accessibility needs.

## 2026-01-31 - Platform-Specific Keyboard Hints
**Learning:** Hardcoded Mac shortcuts (`⌘`) confuse Windows/Linux users and break muscle memory.
**Action:** Always detect the user's platform to show the correct modifier key (`Ctrl` vs `⌘`), and use semantic `<kbd>` tags for better accessibility and consistent styling.

## 2025-05-22 - Accessible Data Visualizations
**Learning:** Visual-only data components (like range sliders constructed from divs) completely exclude screen reader users from critical financial data.
**Action:** Always use `role="meter"` or `role="progressbar"` for visual indicators, and pair them with explicit `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` attributes. Adding a `Tooltip` provides precision for all users while maintaining a clean UI.
