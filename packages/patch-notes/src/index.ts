// Main entry point for the patch-notes package
export { PatchNotesView } from './components/PatchNotesView';
export { VersionBadge } from './components/VersionBadge';
export { parsePatchNotes, type Release } from './utils/parseMarkdown';
export { renderWithIssueLinks } from './utils/renderWithIssueLinks';
export { getVersion } from './utils/getVersion';
export { usePatchNotes } from './hooks/usePatchNotes';
