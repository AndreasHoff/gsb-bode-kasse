# Patch Notes Feature

Displays the app's changelog/patch notes to users with pagination, GitHub issue linking, and theme integration.

## Components

- **PatchNotesPage** — Main page component that parses `docs/PATCH_NOTES.md` and renders the patch notes view
- Uses the reusable `PatchNotesView` component from the `patch-notes` package

## CSS

Styles are defined in `PatchNotes.css` and use CSS custom properties for theming:

- `--text-color`
- `--text-muted`
- `--surface-color`
- `--surface-hover`
- `--border-color`
- `--primary-color`
- `--on-primary`

These are defined in the app's root theme and automatically applied.

## Integration

The patch notes page is accessed via `/patch-notes` route and integrated into the sidebar menu and version badge link in the navbar.
