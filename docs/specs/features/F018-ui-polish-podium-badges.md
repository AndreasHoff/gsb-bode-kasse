# F018 - UI Polish: Podium, Badges & Team Overview Enhancements

## Summary
Polish the Team Overview by adding a small podium for top contributors, member badges, and an admin banner for outstanding actions. Improve contrast, accessibility, and mobile-first layout.

## Problem
The Team Overview currently lists members and stats but lacks visual cues that surface top contributors and important admin actions at-a-glance.

## Goal
- Add a podium component showing the top-3 members per selected season (by net contributions or fines paid depending on metric).
- Add member badges (e.g., `Top Contributor`, `Largest Debtor`, `New Member`) with policy-driven rules.
- Add an admin-mode banner showing outstanding items (pending approvals, disputed payments count).

## Actors
- Any user (podium visible to all), Admin (sees admin banner and controls)

## Data / Computation
- Computed `seasonStats` for each member per season containing: `totalIssued`, `totalPaid`, `netBalance`, `finesCount`.
- Podium ranking: primary sort by `totalPaid` (desc), tie-breaker `totalIssued` (desc), final tie-break by `memberId` lexicographic.

## UI / Components
- `Podium` small component (top, center of team overview) with rank 1,2,3 avatars, name, and metric.
- `Badge` small pill with tooltip explaining the reason.
- `AdminBanner` collapsible at top showing actionable items and shortcuts.

## Flows
- On Team Overview load:
  - Fetch `seasonStats` for the selected season (compute client-side from `fines`/`payments` or read cached `seasonStats` document if performance optimization applied).
  - Render Podium and badges with accessible labels.

## Accessibility & Responsiveness
- All visual badges and podiums must have text equivalents for screen readers.
- Color contrast must meet WCAG AA; provide `--badge-bg` and `--badge-text` tokens in CSS.
- On narrow viewports (430px) the podium should stack vertically and remain legible.

## Acceptance Criteria
- Podium displays correct top-3 members for the selected season.
- Badges are calculated with clear deterministic rules and display tooltips.
- AdminBanner appears only to admins and lists counts of `pending` payments and `disputed` items with links to the relevant screens.
- Unit tests for `getSeasonStats()` logic; component tests for `Podium` and `Badge` rendering.

## Implementation notes
- For performance, compute `seasonStats` server-side or cache a denormalized `seasonStats/{seasonId}` document that contains top-N members.
- Avoid heavy client-side aggregation on large teams — fallback to server aggregation or Cloud Function.
