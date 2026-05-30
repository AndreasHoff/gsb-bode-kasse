---
status: implemented
implemented_date: 2026-05-30
implemented_by: Team
note: "Moved to docs/specs/done/ to mark as implemented."
---

# F014 - Admin Payment Approval

## Problem
Admins need to review and approve payments that members initiated via MobilePay.

## Goal
Provide an admin interface to review pending payments and approve or dispute them.

## Acceptance Criteria
- Pending payments listed with member, amount, and reference
- Approve/dispute actions available
- Approvals move payments to `approved` and create ActivityLog entries
