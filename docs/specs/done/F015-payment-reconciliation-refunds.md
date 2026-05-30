---
status: implemented
implemented_date: 2026-05-30
implemented_by: Team
note: "Moved to docs/specs/done/ to mark as implemented."
---

# F015 - Payment Reconciliation & Refunds

## Problem
Payments may need reconciliation or refunds after disputes or errors.

## Goal
Allow admins to mark payments as reconciled or issue refunds (manual), with audit trail.

## Acceptance Criteria
- Reconciliation workflow available to admins
- Refunds create `payment.refunded` activity entries
- Financial records updated appropriately
