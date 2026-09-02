# Tasks: Patch Notes Component Extraction

**Feature ID:** `019-patch-notes-extraction`  
**Created:** 2026-09-01

---

## Execution Environment

**Classification:** `frontend-only`

All work happens in the `specs/019-patch-notes-extraction/output/` directory (package creation) and `src/` (Love Lens integration testing). No backend/server/database changes required.

**Execution:** Can be performed on Windows development machine.

---

## Ordered Task Checklist

### Phase 1: Package Structure Setup

- [ ] **Task 1.1:** Create package directory structure
  - [ ] Create `specs/019-patch-notes-extraction/output/react-patch-notes/`
  - [ ] Create subdirectories: `src/`, `src/components/`, `src/utils/`, `src/hooks/`, `examples/`
  - [ ] Initialize `package.json` with metadata and peer dependencies
  - [ ] Create `LICENSE` file (match Love Lens license)
  - [ ] Create `.gitignore` for package

- [ ] **Task 1.2:** Set up build configuration (optional)
  - [ ] Decide: pre-bundle or use source directly?
  - [ ] If bundling: add Rollup/Vite lib mode config
  - [ ] If source-only: document import strategy

### Phase 2: Core Utilities

- [ ] **Task 2.1:** Implement markdown parser
  - [ ] Create `src/utils/parseMarkdown.js`
  - [ ] Write parser function: markdown string → releases array
  - [ ] Handle edge cases: missing dates, empty items, malformed headers
  - [ ] Add inline code examples in comments

- [ ] **Task 2.2:** Implement GitHub issue link renderer
  - [ ] Create `src/utils/renderWithIssueLinks.jsx`
  - [ ] Extract logic from `PatchNotes.jsx`
  - [ ] Parameterize repo URL
  - [ ] Handle multiple issue refs per line
  - [ ] Ensure unique keys for React rendering

- [ ] **Task 2.3:** Implement version utility
  - [ ] Create `src/utils/getVersion.js`
  - [ ] Function to extract version from package.json
  - [ ] Handle import strategies (ESM vs. CommonJS)
  - [ ] Fallback for missing version

### Phase 3: React Components

- [ ] **Task 3.1:** Create `PatchNotesView` component
  - [ ] Create `src/components/PatchNotesView.jsx`
  - [ ] Extract JSX from `PatchNotes.jsx` (remove Navbar)
  - [ ] Convert `RELEASES` constant to `releases` prop
  - [ ] Add prop types/validation
  - [ ] Add prop: `repoUrl`, `itemsPerPage`, `currentVersion`
  - [ ] Pagination logic from current implementation
  - [ ] Issue link rendering integration

- [ ] **Task 3.2:** Create styled-components file
  - [ ] Create `src/components/PatchNotesView.styles.js`
  - [ ] Extract styles from `PatchNotes.styles.jsx`
  - [ ] Replace hardcoded colors with CSS custom properties
  - [ ] Export all styled components
  - [ ] Add comments documenting required CSS variables

- [ ] **Task 3.3:** Create `VersionBadge` component
  - [ ] Create `src/components/VersionBadge.jsx`
  - [ ] Extract version display logic from Navbar
  - [ ] Support both `to` (React Router Link) and `onClick` props
  - [ ] Support `href` for plain anchor tags
  - [ ] Minimal styling (let consumer override)

### Phase 4: Hooks (Optional)

- [ ] **Task 4.1:** Create `usePatchNotes` hook
  - [ ] Create `src/hooks/usePatchNotes.js`
  - [ ] Accept markdown string as input
  - [ ] Return parsed releases array
  - [ ] Memoize result to avoid re-parsing
  - [ ] Handle parsing errors gracefully

### Phase 5: Package Exports

- [ ] **Task 5.1:** Create main entry point
  - [ ] Create `src/index.js`
  - [ ] Export all components: `PatchNotesView`, `VersionBadge`
  - [ ] Export all utils: `parsePatchNotes`, `renderWithIssueLinks`, `getVersion`
  - [ ] Export hooks: `usePatchNotes`
  - [ ] Named exports only (no default exports)

- [ ] **Task 5.2:** Verify package.json exports
  - [ ] Set `main` field to `src/index.js` (or `dist/index.js` if bundled)
  - [ ] Set `module` field for ESM (if bundled)
  - [ ] Add `exports` field for modern Node.js
  - [ ] Verify peer dependencies are correct

### Phase 6: Documentation

- [ ] **Task 6.1:** Write main README
  - [ ] Installation instructions
  - [ ] Quick start example
  - [ ] Component API reference
  - [ ] Props documentation with types
  - [ ] CSS custom properties reference
  - [ ] Example markdown format
  - [ ] Troubleshooting section

- [ ] **Task 6.2:** Create example markdown file
  - [ ] Create `examples/PATCH_NOTES.example.md`
  - [ ] Copy Love Lens format with 3-5 releases
  - [ ] Include GitHub issue reference examples
  - [ ] Add comments explaining format

- [ ] **Task 6.3:** Create example CSS variables file
  - [ ] Create `examples/theme-variables.css`
  - [ ] Define all required CSS custom properties
  - [ ] Include light and dark theme examples
  - [ ] Add comments for each variable's purpose

### Phase 7: Testing & Validation

- [ ] **Task 7.1:** Create minimal test app
  - [ ] Create `examples/test-app/` with Vite
  - [ ] Install React, styled-components
  - [ ] Import package (local file path)
  - [ ] Create sample markdown file
  - [ ] Render `PatchNotesView`
  - [ ] Verify all features work

- [ ] **Task 7.2:** Test edge cases
  - [ ] Empty markdown file
  - [ ] Single release
  - [ ] 20+ releases (pagination)
  - [ ] Multiple issue refs: `(#1) and (#2)`
  - [ ] No issue refs
  - [ ] Missing date in header
  - [ ] Malformed header format

- [ ] **Task 7.3:** Verify theme integration
  - [ ] Light theme CSS variables applied
  - [ ] Dark theme CSS variables applied
  - [ ] No hardcoded colors visible
  - [ ] Smooth transitions between themes

### Phase 8: Love Lens Integration (Verification)

- [ ] **Task 8.1:** Install package in Love Lens
  - [ ] Add `react-patch-notes` to dependencies (file path)
  - [ ] Run `npm install`
  - [ ] Verify no peer dep warnings

- [ ] **Task 8.2:** Import markdown file as raw string
  - [ ] Add Vite plugin if needed: `vite-plugin-raw`
  - [ ] Import `PATCH_NOTES.md?raw`
  - [ ] Parse with `parsePatchNotes()`

- [ ] **Task 8.3:** Create new PatchNotes page using package
  - [ ] Create `src/pages/PatchNotesNew.jsx`
  - [ ] Import `PatchNotesView` from package
  - [ ] Pass parsed releases
  - [ ] Add Navbar wrapper (keep current layout)
  - [ ] Route to `/patch-notes-new` (temporary)

- [ ] **Task 8.4:** Side-by-side comparison
  - [ ] Open `/patch-notes` (old) and `/patch-notes-new` (new)
  - [ ] Compare layout, spacing, colors
  - [ ] Test pagination on both
  - [ ] Test issue links on both
  - [ ] Check mobile responsive on both
  - [ ] Verify no visual regressions

- [ ] **Task 8.5:** Replace old implementation
  - [ ] Update route: `/patch-notes` → new component
  - [ ] Remove `src/pages/PatchNotes.jsx`
  - [ ] Remove `src/pages/PatchNotes.styles.jsx`
  - [ ] Update imports in `App.jsx`
  - [ ] Test in production build

### Phase 9: Final Polish

- [ ] **Task 9.1:** Update package README
  - [ ] Add link to Love Lens as "Powered by" example
  - [ ] Add screenshots of rendered UI
  - [ ] Clarify installation for local vs. npm

- [ ] **Task 9.2:** Add CHANGELOG to package
  - [ ] Create `CHANGELOG.md`
  - [ ] Document initial v1.0.0 release
  - [ ] List all features

- [ ] **Task 9.3:** Add package to Love Lens spec docs
  - [ ] Update `specs/019-patch-notes-extraction/README.md` (this folder)
  - [ ] Document extraction process
  - [ ] Link to package location
  - [ ] Note for future projects

---

## Verification Checklist

### Functional Verification

- [ ] Markdown parser correctly extracts all releases
- [ ] Pagination shows 5 releases per page (default)
- [ ] Pagination arrows disable at boundaries
- [ ] Page numbers highlight active page
- [ ] GitHub issue refs render as clickable links
- [ ] Issue links open in new tab
- [ ] Current version displays in header (if provided)
- [ ] Responsive layout works on mobile (<= 430px)
- [ ] Empty state handles gracefully (no releases)

### Integration Verification

- [ ] Love Lens patch notes page identical to original
- [ ] No console errors or warnings
- [ ] Production build compiles successfully
- [ ] Bundle size acceptable (check with `npm run build`)
- [ ] Old files removed completely (no dead code)

### Documentation Verification

- [ ] README has all required sections
- [ ] Code examples are valid and runnable
- [ ] CSS variables documented with purpose
- [ ] Example markdown file is clear
- [ ] Installation steps tested from scratch

---

## Rollback Plan

If extraction fails or causes issues:

1. Revert `App.jsx` route change
2. Restore `src/pages/PatchNotes.jsx` and `.styles.jsx` from git
3. Remove package dependency from `package.json`
4. Run `npm install` to clean up

---

## Notes

- **No backend changes required** — this is purely frontend extraction
- **No database migrations** — no data model changes
- **Package stays in specs folder** — not published to npm yet
- **Can iterate in place** — package is local, easy to modify
- **Future: Publish to npm** — once stable and tested across projects
