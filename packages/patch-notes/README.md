# Patch Notes Component Package

A reusable React component package for displaying structured patch notes with pagination, GitHub issue linking, and theme integration.

## Features

- **Markdown Parsing** — Convert markdown files to structured release data
- **Paginated UI Component** — Display releases with automatic pagination
- **GitHub Issue Linking** — Detect `(#123)` and render as clickable links
- **Theme Integration** — CSS custom properties for easy theming
- **Version Badge** — Navbar component for displaying current version

## Installation

```bash
npm install patch-notes
```

Or from local file path (during development):

```bash
npm install file:./packages/patch-notes
```

## Usage

### Basic Example

```jsx
import { PatchNotesView, parsePatchNotes } from 'patch-notes';
import patchNotesMarkdown from './PATCH_NOTES.md?raw';

const releases = parsePatchNotes(patchNotesMarkdown);

function PatchNotesPage() {
  return (
    <PatchNotesView
      releases={releases}
      repoUrl="https://github.com/AndreasHoff/gsb-bode-kasse"
      currentVersion="1.2.3"
      itemsPerPage={5}
    />
  );
}
```

### Version Badge

```jsx
import { VersionBadge } from 'patch-notes';

function AppHeader() {
  return (
    <VersionBadge
      version="1.2.3"
      onClick={() => navigate('/patch-notes')}
      title="View patch notes"
    />
  );
}
```

## API Reference

### `PatchNotesView`

Main component for rendering patch notes with pagination.

**Props:**

- `releases` — `Release[]` — Array of parsed release objects
- `repoUrl` — `string` — GitHub repository URL for issue links
- `currentVersion` — `string` (optional) — Current app version to display in header
- `itemsPerPage` — `number` (optional, default: 5) — Releases per page
- `className` — `string` (optional) — Additional CSS class for container

**Release Object:**

```ts
interface Release {
  version: string;      // e.g., "1.2.3"
  date: string;         // e.g., "2026-01-15"
  items: string[];      // Array of feature/fix descriptions
}
```

### `VersionBadge`

Small badge component for displaying version in header/navbar.

**Props:**

- `version` — `string` — Version number (e.g., "1.2.3")
- `onClick` — `(e: React.MouseEvent) => void` (optional) — Click handler
- `href` — `string` (optional) — Href for anchor tag
- `title` — `string` (optional) — Tooltip text
- `className` — `string` (optional) — Additional CSS class

### `parsePatchNotes(markdown: string): Release[]`

Parses markdown content into an array of release objects.

**Input Format:**

```markdown
## v1.2.3 — 2026-01-15

- Feature description
- Bug fix with issue reference (#123)

## v1.2.2 — 2026-01-10

- Another feature
```

**Output:**

```ts
[
  {
    version: "1.2.3",
    date: "2026-01-15",
    items: [
      "Feature description",
      "Bug fix with issue reference (#123)"
    ]
  },
  // ... more releases
]
```

## CSS Custom Properties

The component uses CSS custom properties for theming. Define these in your app's CSS:

```css
:root {
  /* Text colors */
  --text-color: #1a1a1a;
  --text-muted: #666666;

  /* Surface colors */
  --surface-color: #ffffff;
  --surface-hover: #f5f5f5;

  /* Borders and shadows */
  --border-color: #e0e0e0;
  --shadow-color: rgba(0, 0, 0, 0.1);

  /* Primary theme color */
  --primary-color: #007bff;
  --on-primary: #ffffff;
}
```

## Markdown Format Requirements

Headers must follow this format:

```
## v{version} — {YYYY-MM-DD}
```

Items must start with `- `:

```
- Your feature or fix description
```

GitHub issue references are auto-linked when wrapped in parentheses:

```
- Fixed critical bug (#123)  → renders as "Fixed critical bug [#123](...)"
```

## Hooks

### `usePatchNotes(markdown: string): Release[]`

Hook for parsing patch notes markdown client-side with memoization.

```jsx
import { usePatchNotes } from 'patch-notes';
import patchNotesMarkdown from './PATCH_NOTES.md?raw';

function MyComponent() {
  const releases = usePatchNotes(patchNotesMarkdown);
  return <PatchNotesView releases={releases} repoUrl="..." />;
}
```

## License

MIT
