# Patch Notes Component Extraction

**Feature ID:** `019-patch-notes-extraction`  
**Status:** Draft  
**Created:** 2026-09-01

---

## Overview

This feature extracts Love Lens's polished patch notes UI into a standalone, reusable React package. The package provides:

- **Markdown parsing** — Convert markdown files to structured release data
- **Paginated UI component** — Display releases with automatic pagination
- **GitHub issue linking** — Detect `(#123)` and render as clickable links
- **Theme integration** — CSS custom properties for easy theming
- **Version badge** — Navbar component for displaying current version

---

## Project Artifacts

| Artifact | Purpose |
|----------|---------|
| [`spec.md`](./spec.md) | What we're building and why (requirements, acceptance criteria) |
| [`plan.md`](./plan.md) | Technical approach, architecture, and tradeoffs |
| [`tasks.md`](./tasks.md) | Ordered execution checklist with verification steps |
| `output/` | Extracted package source code (created during implementation) |

---

## Quick Start (After Extraction)

### Installation

```bash
# From local file path (during development)
npm install file:./specs/patch-notes-extraction/output/patch-notes

# Or from npm (future, if published)
npm install patch-notes
```

### Basic Usage

```jsx
import { PatchNotesView, parsePatchNotes } from 'patch-notes';
import patchNotesMarkdown from './PATCH_NOTES.md?raw';

const releases = parsePatchNotes(patchNotesMarkdown);

function PatchNotesPage() {
  return (
    <PatchNotesView
      releases={releases}
      repoUrl="https://github.com/your-user/your-repo"
      currentVersion="1.2.3"
    />
  );
}
```

### Required CSS Variables

```css
:root {
  --text-color: #1a1a1a;
  --text-muted: #666666;
  --surface-color: #ffffff;
  --surface-hover: #f5f5f5;
  --border-color: #e0e0e0;
  --shadow-color: rgba(0, 0, 0, 0.1);
  --primary-color: #007bff;
  --on-primary: #ffffff;
}
```

---

## Markdown Format

The parser expects markdown in this format:

```markdown
## v2.2.0 — 2026-05-24

- Feature description one
- Feature description two with issue reference (#132)
- Bug fix for something (#45)

## v2.1.0 — 2026-05-11

- Another feature
- Another bug fix
```

**Rules:**
- Headers: `## v{version} — {YYYY-MM-DD}`
- Items: Bullet points with `- ` prefix
- GitHub refs: `(#123)` anywhere in item text (auto-linked)
- Empty lines between sections are ignored

---

## Component API

### `<PatchNotesView />`

Main component for rendering patch notes with pagination.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `releases` | `Array<Release>` | Yes | — | Parsed release data |
| `repoUrl` | `string` | Yes | — | GitHub repo base URL (e.g. `https://github.com/user/repo`) |
| `itemsPerPage` | `number` | No | `5` | Number of releases per page |
| `currentVersion` | `string` | No | — | Current app version to display in header |
| `className` | `string` | No | — | Override container class name |

**Release Object:**
```typescript
{
  version: string;    // e.g. "2.2.0"
  date: string;       // e.g. "2026-05-24"
  items: string[];    // List of feature/fix descriptions
}
```

### `<VersionBadge />`

Small component for displaying version in navbar.

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `version` | `string` | Yes | — | Version number (e.g. "1.2.3") |
| `linkTo` | `string` | No | — | React Router path (renders as `<Link>`) |
| `href` | `string` | No | — | Plain anchor href (renders as `<a>`) |
| `onClick` | `function` | No | — | Click handler (renders as `<button>`) |
| `title` | `string` | No | — | Tooltip text |

### Utility Functions

#### `parsePatchNotes(markdown: string): Release[]`

Parses markdown string into array of release objects.

```javascript
import { parsePatchNotes } from 'patch-notes';

const markdown = `
## v1.2.0 — 2026-01-15
- New feature
- Bug fix (#45)
`;

const releases = parsePatchNotes(markdown);
// => [{ version: '1.2.0', date: '2026-01-15', items: [...] }]
```

#### `renderWithIssueLinks(text: string, repoUrl: string): JSX`

Converts text with `(#123)` into JSX with clickable links (used internally by `PatchNotesView`).

---

## Integration with Love Lens

After extraction, Love Lens will replace its current implementation:

**Before:**
```jsx
// src/pages/PatchNotes.jsx
const RELEASES = [ /* hardcoded array */ ];
```

**After:**
```jsx
import { PatchNotesView, parsePatchNotes } from 'patch-notes';
import patchNotesMarkdown from '../../docs/PATCH_NOTES.md?raw';

const releases = parsePatchNotes(patchNotesMarkdown);

function PatchNotesPage({ themeMode, effectiveTheme, onThemeChange }) {
  return (
    <>
      <Navbar themeMode={themeMode} effectiveTheme={effectiveTheme} onThemeChange={onThemeChange} />
      <PatchNotesView
        releases={releases}
        repoUrl="https://github.com/AndreasHoff/love-lens"
        currentVersion={version}
      />
    </>
  );
}
```

---

## Development Workflow

### Phase 1: Extract Package
1. Create package structure under `specs/patch-notes-extraction/output/`
2. Extract components from `src/pages/PatchNotes.jsx` and `.styles.jsx`
3. Build parser utilities
4. Write documentation

### Phase 2: Test in Isolation
1. Create example Vite app in `examples/test-app/`
2. Install package (local file path)
3. Test all features: parsing, rendering, pagination, issue links

### Phase 3: Integrate Back into Love Lens
1. Install package in Love Lens
2. Create new page component using package
3. Compare side-by-side with original
4. Replace original implementation
5. Remove old files

---

## Future Enhancements

- [ ] Publish to npm registry (public or private)
- [ ] Add TypeScript type definitions
- [ ] Support alternative date formats
- [ ] Add search/filter functionality
- [ ] Internationalization support
- [ ] Dark/light theme presets
- [ ] Animated transitions between pages

---

## References

- Original implementation: [`src/pages/PatchNotes.jsx`](../../src/pages/PatchNotes.jsx)
- Original styles: [`src/pages/PatchNotes.styles.jsx`](../../src/pages/PatchNotes.styles.jsx)
- Markdown source: [`docs/PATCH_NOTES.md`](../../docs/PATCH_NOTES.md)
- Spec Kit Workflow: [`docs/SPEC_KIT_ADOPTION.md`](../../docs/SPEC_KIT_ADOPTION.md)

---

## Questions or Issues?

For questions about the extraction process or package usage, see:
- [`spec.md`](./spec.md) — Full requirements and acceptance criteria
- [`plan.md`](./plan.md) — Technical decisions and tradeoffs
- [`tasks.md`](./tasks.md) — Step-by-step implementation guide
