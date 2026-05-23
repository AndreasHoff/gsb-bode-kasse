# F007 - Activity Log / Audit Trail

## Problem
Teams need a transparent history of all actions: who assigned what fine, who paid, who approved, and when. This builds trust and allows dispute resolution.

## Goal
Display a chronological, filterable audit trail of all team events for the active season.

## Actors
- Admin (full view)
- Member (own events only — future scope)

## Flow

1. Admin opens "Activity" tab
2. App loads ActivityLog entries for active season (paginated, newest first)
3. Each entry shows:
   - Icon representing action type
   - Human-readable description (e.g. "Andreas tildelte en bøde til Mikkel – Kom for sent – 50 kr")
   - Timestamp (relative: "3 minutter siden")
   - Actor avatar
4. Infinite scroll or "Load more" pagination
5. Filter options: by action type, by member, by date range

## Entry Rendering Examples
| Action               | Display text                                            |
|----------------------|---------------------------------------------------------|
| fine.assigned        | "🎯 Jonas tildelte en bøde til Mikkel – Kom for sent"  |
| fine.deleted         | "🗑️ Jonas slettede en bøde for Mikkel"                 |
| payment.approved     | "✅ Kasper godkendte Mikkels betaling – 50 kr"         |
| payment.initiated    | "💸 Mikkel har sendt betaling via MobilePay"           |
| member.added         | "➕ Andreas tilføjede Lasse som medlem"                |
| season.created       | "📅 Ny sæson oprettet: Efterår 2025"                   |

## Edge Cases
- No log entries → show empty state
- Very large teams with many events → virtualized list required
- Deleted fine log entries → still visible in log (never purged)

## Acceptance Criteria
- All ActivityLog entry types render with distinct icons and copy
- Timestamps are relative (< 1 hour) then absolute
- Log loads in < 1.5s for 100 entries
- Filter by action type works correctly
- Entries are never deleted or hidden (immutable)
- Paginated: at least 20 entries per page
