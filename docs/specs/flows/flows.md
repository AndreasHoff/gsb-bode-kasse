# Flow: Fine Assignment

This document describes the complete lifecycle of a fine assignment, from creation to payment approval.

```
┌─────────────────────────────────────────────────────────────────┐
│                     FINE ASSIGNMENT FLOW                        │
└─────────────────────────────────────────────────────────────────┘

  Admin
       │
       ▼
  [Select FineRule]
       │
       ▼
  [Select User(s)]   ←── Single user → F001
       │             ←── Multiple users → F002
       ▼
  [Add Note (optional)]
       │
       ▼
  [Confirm]
       │
       ▼
  ┌────────────────────────────────────────────────┐
  │  System creates:                               │
  │  - Fine record (per user)                      │
  │  - Payment record (status: unpaid)             │
  │  - ActivityLog entry (fine.assigned)           │
  └────────────────────────────────────────────────┘
       │
       ▼
  [Team Overview updates]
  [Member's personal view updates]
       │
       ▼
  [Optional: Undo toast for ~8 seconds → F006]
```

---

# Flow: Payment

```
┌─────────────────────────────────────────────────────────────────┐
│                       PAYMENT FLOW                              │
└─────────────────────────────────────────────────────────────────┘

  Member
    │
    ▼
  [View Personal Debt → F005]
    │
    ▼
  [Tap "Pay" or "Pay All"]
    │
    ▼
  [System constructs MobilePay deep-link]
  [Payment status → "pending"]
  [ActivityLog: payment.initiated]
    │
    ▼
  [MobilePay opens] ──── Member transfers money ──── [Member returns to app]
    │
    ▼
  [App shows: "Afventer godkendelse ⏳"]

        ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

  Admin
    │
    ▼
  [Sees pending payment in overview]
    │
    ▼
  [Taps "Godkend" / Approve]
    │
    ▼
  [Payment status → "approved"]
  [ActivityLog: payment.approved]
    │
    ▼
  [Fine removed from member's debt view]
  [Team overview debt total decreases]
```

---

# Flow: Season Lifecycle

```
  Admin
    │
    ▼
  [Create Season] → Season.isActive = true
    │
    ▼
  [Assign fines, manage payments throughout season]
    │
    ▼
  [Close Season] → Season.endDate = today, isActive = false
    │
    ▼
  [Historical data preserved]
  [New season can be created]
```

---

# Flow: Member Onboarding

```
  Admin
    │
    ▼
  [Invite user by email OR share team link]
    │
    ▼
  [User registers / logs in]
    │
    ▼
  [Membership created with role: Member]
  [ActivityLog: member.added]
    │
    ▼
  [Admin can upgrade role if needed]
  [ActivityLog: member.role_changed]
```
