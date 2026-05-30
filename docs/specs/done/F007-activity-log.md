---
status: implemented
implemented_date: 2026-05-30
implemented_by: Team
note: "Moved to docs/specs/done/ to mark as implemented."
---

# F007 - Activity Log

## Problem
Admins and members need an auditable timeline of important actions for transparency and troubleshooting.

## Goal
Provide a read-only activity feed of system events (fine assigned, payment initiated/approved, fine deleted/restored, member added, etc.).

## Actors
- Member, Admin

## Flow

1. User opens Activity Log screen (Admin link and Member recent items)
2. App queries `activityLog` collection ordered by timestamp
3. Shows event type, actor (name), target (member/fine id), timestamp, and optional details
4. Admin can filter by event type and member
5. Clicking an entry opens contextual view (member profile or fine)

## Event Types
- `fine.assigned`
- `payment.initiated`
- `payment.approved`
- `fine.deleted`
- `fine.restored`
- `member.joined`
- `season.created`

## Edge Cases
- Long-running lists should be paginated (infinite scroll)
- Sensitive events should mask personal data for non-admins

## Acceptance Criteria
- Activity log displays latest 50 events by default
- Filters for event type and member work
- Clicking an event navigates to appropriate context
- Non-admins cannot view admin-only events
