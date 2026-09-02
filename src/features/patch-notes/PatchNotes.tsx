import { useMemo } from 'react';
import { PatchNotesView, parsePatchNotes } from 'patch-notes';
import patchNotesMarkdown from '../../../docs/PATCH_NOTES.md?raw';
import './PatchNotes.css';

interface PatchNotesPageProps {
  colorTheme?: 'green' | 'violet';
}

export default function PatchNotesPage({ colorTheme = 'green' }: PatchNotesPageProps) {
  const releases = useMemo(() => parsePatchNotes(patchNotesMarkdown), []);

  // Extract current version from latest release
  const currentVersion = releases.length > 0 ? releases[0].version : 'unknown';

  return (
    <div className="patch-notes-page">
      <PatchNotesView
        releases={releases}
        repoUrl="https://github.com/AndreasHoff/gsb-bode-kasse"
        currentVersion={currentVersion}
        itemsPerPage={5}
      />
    </div>
  );
}
