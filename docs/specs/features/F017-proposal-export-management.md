# F017 - Proposal Export & Management

## Summary
Enable exporting proposals and vote snapshots for offline archiving and shared review. Add admin capabilities to archive/restore proposals and produce audit-friendly exports (CSV/PDF) including voter counts and timestamps.

## Problem
Club proposals (decisions and votes) need to be archived, shared with other stakeholders, and stored for compliance. Current UI provides listing but lacks export or archival actions.

## Goal
- Export proposals and vote data in CSV and PDF formats.
- Allow bulk-archive of older proposals and restore if needed.
- Provide a reproducible export (snapshot) that includes proposal content, author, timestamps, votes (counts and anonymized lists if required).

## Actors
- Admin / Super-admin
- Member (proposal author)

## Data model
- Use `proposals` collection documents; exports are generated on demand and do not change living proposal documents except for `archived` flag.

```
export: {
  id: string,
  teamId: string,
  createdBy: string,
  createdAt: timestamp,
  format: 'csv'|'pdf',
  fileUrl?: string,
  params: { includeVoterEmails?: boolean }
}
```

## UI / Screens
- Proposal list: bulk-select proposals → `Export`/`Archive` actions.
- Export modal: choose format, fields, include voter details toggle.

## Flows

Export flow
1. Admin selects one or more proposals and clicks `Export`.
2. Present export options (CSV/PDF, include voter emails true/false).
3. Generate export server-side or client-side (for small exports), store artifact in `storage` and create `export` record.
4. Provide download link and create `activityLog` entry.

Archive/Restore flow
1. Admin selects proposals and toggles `Archive`.
2. System sets `archived = true` with `archivedBy` and `archivedAt`.
3. Restore sets `archived = false` and writes `activityLog`.

## Security
- Only team admins or super-admins may export or archive proposals. Exports including voter emails should be restricted and logged for audit.

## Acceptance Criteria
- Exports generate correct CSV/PDF with chosen fields.
- Archive toggles update `proposals` documents and create `activityLog` entries.
- Playwright E2E: export flow completes and download link works; include screenshot of export modal and resulting export list.

## Implementation notes
- Prefer server-side generation for PDFs and large CSVs.
- Use GCP/Azure/AWS storage signed URLs for download artifacts.
