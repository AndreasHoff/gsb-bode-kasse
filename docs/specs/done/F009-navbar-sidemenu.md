---
status: implemented
implemented_date: 2026-05-30
implemented_by: Team
note: "Moved to docs/specs/done/ to mark as implemented."
---

# F009 - Navbar / Sidemenu

## Problem
App navigation must be accessible and follow mobile-first design.

## Goal
Implement a bottom navbar for primary navigation and a sidemenu for secondary actions.

## Actors
- Member, Admin

## Flow

1. Bottom navbar with tabs: Home, Team, Personal, Proposals, Profile
2. Sidemenu accessed via avatar or menu button includes settings, help, logout
3. On small screens, keep primary navigation at bottom; sidemenu overlays from left

## Accessibility
- All interactive elements must be keyboard accessible and have aria labels

## Acceptance Criteria
- Navigation works across main routes
- Sidemenu shows correct items for admin vs member
- Mobile-first layout verified at 430px width
