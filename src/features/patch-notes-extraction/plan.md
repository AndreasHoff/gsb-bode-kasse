# Plan: Patch Notes Component Extraction

**Feature ID:** `019-patch-notes-extraction`  
**Created:** 2026-09-01

---

## Technical Approach

### 1. Package Structure

Extract as a **standalone npm package** (private or public) with the following structure:

```
react-patch-notes/
├── package.json
├── README.md
├── LICENSE
├── src/
│   ├── index.js                    # Main exports
│   ├── components/
│   │   ├── PatchNotesView.jsx      # Main component
│   │   ├── PatchNotesView.styles.js
│   │   └── VersionBadge.jsx        # Navbar badge component
│   ├── utils/
│   │   ├── parseMarkdown.js        # Markdown → data parser
│   │   └── getVersion.js           # Extract version from package.json
│   └── hooks/
│       └── usePatchNotes.js        # Optional: client-side parsing hook
├── examples/
│   └── PATCH_NOTES.example.md
└── dist/                           # Build output (if bundled)
```

### 2. Core Components

#### **PatchNotesView Component**

```jsx
import { PatchNotesView } from 'react-patch-notes';

<PatchNotesView
  releases={releases}          // Array of release objects
  repoUrl="https://github.com/user/repo"
  itemsPerPage={5}             // Optional, default: 5
  currentVersion="1.2.3"       // Optional, for header display
/>
```

**Props API:**
- `releases`: `Array<{ version, date, items: string[] }>`
- `repoUrl`: `string` — GitHub repo base URL for issue links
- `itemsPerPage`: `number` — Releases per page (default: 5)
- `currentVersion`: `string` — Display current version in header (optional)
- `className`: `string` — Override container class (optional)

#### **VersionBadge Component**

```jsx
import { VersionBadge } from 'react-patch-notes';

<VersionBadge
  version="1.2.3"
  linkTo="/patch-notes"        // Optional React Router path
  onClick={handleClick}        // Optional click handler
  title="View patch notes"     // Optional tooltip
/>
```

### 3. Markdown Parser

**Input Format:**
```markdown
## v2.2.0 — 2026-05-24

- Feature one
- Feature two with issue reference (#132)
- Bug fix (#45)

## v2.1.0 — 2026-05-11

- Another feature
```

**Output Format:**
```javascript
[
  {
    version: '2.2.0',
    date: '2026-05-24',
    items: [
      'Feature one',
      'Feature two with issue reference (#132)',
      'Bug fix (#45)'
    ]
  },
  {
    version: '2.1.0',
    date: '2026-05-11',
    items: ['Another feature']
  }
]
```

**Parser Logic:**
```javascript
// src/utils/parseMarkdown.js
export function parsePatchNotes(markdown) {
  const releases = [];
  const lines = markdown.split('\n');
  
  let currentRelease = null;
  
  for (const line of lines) {
    // Match: ## v1.2.3 — 2026-01-15
    const headerMatch = line.match(/^##\s+v?(\S+)\s+—\s+(\S+)/);
    if (headerMatch) {
      if (currentRelease) releases.push(currentRelease);
      currentRelease = {
        version: headerMatch[1],
        date: headerMatch[2],
        items: []
      };
      continue;
    }
    
    // Match: - Item text
    const itemMatch = line.match(/^-\s+(.+)/);
    if (itemMatch && currentRelease) {
      currentRelease.items.push(itemMatch[1].trim());
    }
  }
  
  if (currentRelease) releases.push(currentRelease);
  
  return releases;
}
```

### 4. GitHub Issue Link Detection

Extract from current `PatchNotes.jsx`:

```javascript
// src/utils/renderWithIssueLinks.jsx
export function renderWithIssueLinks(text, repoUrl) {
  const parts = text.split(/(\(#\d+\))/);
  return parts.map((part, i) => {
    const match = part.match(/^\(#(\d+)\)$/);
    if (match) {
      const issueNum = match[1];
      return (
        <a
          key={`issue-${issueNum}-${i}`}
          href={`${repoUrl}/issues/${issueNum}`}
          target="_blank"
          rel="noopener noreferrer"
          className="issue-link"
        >
          #{issueNum}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
```

### 5. Styling Strategy

**CSS Custom Properties (Theme Variables):**

The package will **require** the consuming app to define these CSS variables:

```css
:root {
  --text-color: #1a1a1a;
  --text-muted: #666;
  --surface-color: #ffffff;
  --surface-hover: #f5f5f5;
  --border-color: #e0e0e0;
  --shadow-color: rgba(0, 0, 0, 0.1);
  --primary-color: #007bff;
  --on-primary: #ffffff;
}
```

**Styled Components Export:**

```javascript
// src/components/PatchNotesView.styles.js
import styled from 'styled-components';

export const Container = styled.main`
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 1rem 2rem;
  // ... rest of styles using var(--custom-properties)
`;

export const ReleaseCard = styled.article`
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  // ... etc
`;
```

### 6. Integration Path for Love Lens

**Step 1:** Create package locally (in `packages/react-patch-notes/`)

**Step 2:** Test in isolation with example app

**Step 3:** Replace Love Lens implementation:
```jsx
// Before:
import PatchNotes from './pages/PatchNotes';

// After:
import { PatchNotesView } from 'react-patch-notes';
import { parsePatchNotes } from 'react-patch-notes';
import patchNotesMarkdown from '../docs/PATCH_NOTES.md?raw';

const releases = parsePatchNotes(patchNotesMarkdown);

<PatchNotesView
  releases={releases}
  repoUrl="https://github.com/AndreasHoff/love-lens"
  currentVersion={version}
/>
```

**Step 4:** Remove old `src/pages/PatchNotes.jsx` and `PatchNotes.styles.jsx`

---

## Tradeoffs & Decisions

### Decision 1: Standalone Package vs. Monorepo Module

**Options:**
1. **Standalone npm package** (published to npm registry)
2. **Local package in monorepo** (private, not published)
3. **Copy-paste module** (no package, just importable utils)

**Choice:** Start with **local package in monorepo**, publish later if needed.

**Rationale:**
- Faster iteration during development
- No npm publish overhead initially
- Can still be extracted to public npm later
- Easier to test with Love Lens before wider use

### Decision 2: Client-Side vs. Build-Time Parsing

**Options:**
1. Parse markdown at **build time** (pre-compile to JSON)
2. Parse markdown at **runtime** (client-side parsing)

**Choice:** Support **both** — provide parser utility, let consumer decide.

**Rationale:**
- Build-time: Better performance, smaller bundle
- Runtime: More flexible, easier for quick prototypes
- Parser is <1KB, minimal overhead

### Decision 3: Peer Dependencies

**Required Peer Deps:**
```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "styled-components": "^5.0.0 || ^6.0.0"
  }
}
```

**No additional runtime deps** — keep bundle size minimal.

### Decision 4: TypeScript Support

**Choice:** JavaScript first, add TypeScript definitions later.

**Rationale:**
- Love Lens is JS-based (no TS in current stack)
- TS types can be added incrementally
- JSDoc comments provide some IDE support

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Styled-components version mismatch | High | Peer dep allows 5.x or 6.x, test both |
| CSS variables not defined in consuming app | High | Document required variables, provide example CSS |
| Markdown format variation | Medium | Parser is lenient, skip malformed entries |
| Breaking changes in Love Lens | Low | Maintain side-by-side until verified |
| React Router version differences | Low | Make navigation prop optional (support both Link and onClick) |

---

## Testing Strategy

1. **Unit Tests** (parser utility)
   - Valid markdown → correct data structure
   - Malformed markdown → graceful handling
   - Edge cases: missing dates, empty items

2. **Component Tests** (React Testing Library)
   - Pagination navigation works
   - GitHub links render correctly
   - Aria labels present
   - Page boundary states

3. **Integration Test** (Love Lens replacement)
   - Side-by-side comparison (old vs. new)
   - Visual regression testing
   - No console errors
   - All features functional

4. **Example App Test**
   - Fresh Vite project with package installed
   - Markdown file parsed correctly
   - UI renders as expected

---

## Rollout Plan

1. **Phase 1: Package Creation** (This task)
   - Create package structure
   - Extract components and utilities
   - Write documentation

2. **Phase 2: Testing**
   - Build example app
   - Test all features
   - Verify theme integration

3. **Phase 3: Love Lens Integration**
   - Install package in Love Lens
   - Replace current implementation
   - Side-by-side verification
   - Remove old code

4. **Phase 4: Publish** (Optional, future)
   - Publish to npm registry (public/private)
   - Add CI/CD for package
   - Versioning strategy

---

## Success Metrics

- ✅ Package builds without errors
- ✅ All components render in example app
- ✅ Love Lens replacement has zero visual differences
- ✅ Documentation complete with usage examples
- ✅ Other project successfully integrates package
