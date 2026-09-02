/**
 * Parse markdown content into structured release data
 * 
 * Expected format:
 * ## v1.2.3 — 2026-01-15
 * - Feature description
 * - Bug fix (#123)
 */

export interface Release {
  version: string;
  date: string;
  items: string[];
}

export function parsePatchNotes(markdown: string): Release[] {
  const releases: Release[] = [];
  const lines = markdown.split('\n');

  let currentRelease: Release | null = null;

  for (const line of lines) {
    // Match header: ## v1.2.3 — 2026-01-15 or ## 1.2.3 — 2026-01-15
    const headerMatch = line.match(/^##\s+v?(\d+\.\d+\.\d+)\s+—\s+(.+)/);
    if (headerMatch) {
      if (currentRelease && currentRelease.items.length > 0) {
        releases.push(currentRelease);
      }
      currentRelease = {
        version: headerMatch[1],
        date: headerMatch[2].trim(),
        items: [],
      };
      continue;
    }

    // Match list item: - Description
    const itemMatch = line.match(/^-\s+(.+)/);
    if (itemMatch && currentRelease) {
      currentRelease.items.push(itemMatch[1].trim());
    }
  }

  // Don't forget the last release
  if (currentRelease && currentRelease.items.length > 0) {
    releases.push(currentRelease);
  }

  return releases;
}
