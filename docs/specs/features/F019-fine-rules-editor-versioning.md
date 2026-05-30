# F019 - Fine Rules Editor & Versioning

## Summary
A complete editor for `FineRule` entities with versioning, drafts, and the ability to publish a ruleset per season. The editor enables safe edits, previewing, and rollback to previous versions.

## Problem
Currently fine rules live as simple records. As rules change between seasons, admins need a way to edit them safely, keep history, and publish the set of rules that apply to a particular season.

## Goal
- Provide an editor UI to create, edit, and preview fine rules.
- Keep version history with metadata (author, timestamp, description).
- Allow publishing a ruleset to a season and rollback to prior versions.

## Domain model changes
- `fineRules` collection: maintain `versions` subcollection or a `versions` array with full rule snapshots.

Example shape:

```
fineRule: {
  id: string,
  teamId: string,
  currentVersionId: string,
  draft?: { title, amount, description, createdBy, createdAt }
}

fineRuleVersion: {
  id: string,
  fineRuleId: string,
  title: string,
  amount: number,
  description: string,
  createdBy: string,
  createdAt: timestamp,
  publishedForSeason?: string
}
```

## UI / Screens
- Fine Rules list with `Edit` and `View history` actions.
- Editor screen with Draft save, Preview, Publish to Season, and `Rollback` actions in History view.

## Flows

Edit & save draft
1. Admin opens a rule and edits fields.
2. Clicking `Save draft` writes a `draft` object to the `fineRule` doc.

Publish to season
1. Admin clicks `Publish` and selects a target season.
2. System creates a `fineRuleVersion` snapshot, sets `currentVersionId` and sets `publishedForSeason` on the version.
3. Optionally run a migration script to re-evaluate affected pending fines (usually not changed retroactively).

Rollback
1. From history, admin selects a prior version and clicks `Rollback`.
2. System creates a new version identical to the selected older version and sets it as `currentVersionId`.
3. Record `activityLog` entry and reason.

## Security
- Only admins may publish or rollback rules.

## Acceptance Criteria
- Drafts are saved without affecting `currentVersionId`.
- Publishing creates a new immutable `fineRuleVersion` and updates `currentVersionId`.
- History view shows versions with author and timestamp and allows rollback.
- Tests include unit tests for version creation and integration tests for publish/rollback.

## Implementation notes
- Use a `fineRuleVersions` subcollection for scalable history rather than unbounded arrays on the parent doc.
- Use server-side timestamps and include `publishedForSeason` so the UI can filter versions by season.
