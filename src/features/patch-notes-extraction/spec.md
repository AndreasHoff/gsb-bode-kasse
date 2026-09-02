# Spec: Patch Notes Component Extraction

**Feature ID:** `019-patch-notes-extraction`  
**Created:** 2026-09-01  
**Status:** Draft

---

## What

Extract Love Lens's patch notes visual presentation layer into a standalone, reusable React package that:
- Parses markdown files into a structured release format
- Provides a polished, paginated UI component
- Automatically detects and linkifies GitHub issue references `(#123)`
- Integrates seamlessly with React + Vite projects
- Supports theme customization via CSS custom properties

## Why

**Problem:**
Other projects using similar React + Vite stacks maintain patch notes as markdown files but lack the visual polish and UX features that Love Lens has built:
- Manual markdown rendering lacks pagination
- GitHub issue numbers aren't automatically linkified
- No consistent release card layout
- Missing version badge integration
- Theme integration requires custom styling

**Solution:**
Create a standalone npm package (or importable module) that bridges the gap between markdown-based patch notes and the polished UI that Love Lens currently offers.

**Value:**
- Reusable across multiple projects
- Consistent UX for patch notes presentation
- Reduced duplication of UI logic
- Easy maintenance (update package, not every project)

---

## Scope

**In Scope:**
- Markdown parser that converts Love Lens-style `PATCH_NOTES.md` → release data structure
- React component (`PatchNotesView`) with pagination
- Styled-components definitions (theme-agnostic)
- GitHub issue link detection and rendering
- Version badge helper component
- Package.json version extraction utility
- Documentation and usage examples

**Out of Scope:**
- Backend API for patch notes (remains frontend-only)
- Automated markdown generation from commits
- Multi-language support (stays Danish/English as-is)
- CMS/editing interface for patch notes
- Alternative styling frameworks (stays styled-components only)

---

## Acceptance Criteria

### Functional Requirements

1. **Markdown Parsing**
   - Parse markdown files following Love Lens format:
     ```markdown
     ## v1.2.3 — 2026-01-15
     - Feature description
     - Bug fix (#123)
     ```
   - Extract version, date, and item list per release
   - Handle missing/malformed entries gracefully

2. **Component API**
   - `<PatchNotesView releases={data} repoUrl={url} itemsPerPage={5} />`
   - Accept parsed release data as prop
   - Support configurable GitHub repo URL
   - Support configurable items per page (default: 5)

3. **GitHub Issue Links**
   - Detect `(#123)` pattern in release items
   - Render as clickable link: `[#123](repoUrl/issues/123)`
   - Support inline detection (mid-sentence)
   - Open in new tab with `rel="noopener noreferrer"`

4. **Pagination**
   - Show N releases per page (configurable)
   - Arrow navigation (previous/next)
   - Numbered page buttons
   - Scroll to top on page change
   - Disable arrows at boundaries
   - Aria labels for accessibility

5. **Theme Integration**
   - Use CSS custom properties for all colors
   - No hardcoded hex/rgb values
   - Work with light/dark themes out of the box
   - Provide CSS variable reference in docs

6. **Version Badge**
   - `<VersionBadge version={version} linkTo="/patch-notes" />`
   - Extract version from package.json
   - Optional click handler or link target

### Non-Functional Requirements

1. **Zero Breaking Changes**
   - Extraction must not alter Love Lens's existing patch notes functionality
   - Current component remains untouched until package is verified
   - Side-by-side testing before replacement

2. **Documentation**
   - README with installation, usage, and API reference
   - Example markdown file format
   - CSS custom property reference
   - Migration guide (how to replace current Love Lens component)

3. **Package Structure**
   - Follows standard npm package conventions
   - Tree-shakeable exports
   - Named exports for all components/utilities
   - TypeScript type definitions (optional but nice-to-have)

---

## Verification Steps

1. Create example React + Vite project with markdown file
2. Install/import the extracted package
3. Render `PatchNotesView` with parsed data
4. Verify pagination works (5 releases per page)
5. Verify GitHub issue links render and open correctly
6. Verify theme CSS variables apply correctly
7. Test version badge integration in navbar
8. Compare side-by-side with Love Lens original
9. Confirm no visual regressions in Love Lens after package replacement

---

## Open Questions

- [ ] Should the package include a `usePatchNotes()` hook to handle markdown parsing client-side?
- [ ] Should version badge auto-fetch from package.json or require explicit prop?
- [ ] Export as standalone npm package or as importable module within monorepo?
- [ ] Support alternative date formats or stay ISO 8601?

---

## Constraints

- Must work with React 18+
- Must work with Vite 4+
- Styled-components 5.x or 6.x
- Zero additional runtime dependencies (beyond peer deps)
- Browser support: Modern evergreen (ES2020+)
