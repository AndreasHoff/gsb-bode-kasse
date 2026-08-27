# Domain Entities

This document defines the core domain entities of the GSB Bødekasse platform.

---

## User

Represents a registered user of the platform.

| Field                  | Type     | Description                                |
|------------------------|----------|--------------------------------------------|
| id                     | string   | Unique identifier                          |
| name                   | string   | Display name                               |
| email                  | string   | Authentication email                       |
| avatarUrl              | string?  | Optional profile image                     |
| createdAt              | datetime | Account creation timestamp                 |
| outstandingFineBalance | number?  | **Deprecated** - migrating to per-season tracking |
| totalPaidAmount        | number?  | **Deprecated** - migrating to per-season tracking |

**Business Rules:**
- Email must be unique across the system
- A user can be a member of multiple teams
- User permissions are determined by their role within each team (member or admin)
- Deleting a user does not delete historical records (soft delete)
- Balance fields are deprecated in favor of UserSeasonBalance entity (F024)

---

## Team

Represents a sports club or group using the bødekasse platform.

| Field        | Type     | Description                                |
|--------------|----------|--------------------------------------------|
| id           | string   | Unique identifier                          |
| name         | string   | Team display name                          |
| slug         | string   | URL-friendly identifier                    |
| logoUrl      | string?  | Optional team logo                         |
| createdAt    | datetime | Creation timestamp                         |

**Business Rules:**
- Slug must be unique
- A team must have at least one Admin

---

## Membership

Join entity between User and Team.

| Field        | Type     | Description                                |
|--------------|----------|--------------------------------------------|
| id           | string   | Unique identifier                          |
| name         | string   | Member name copied for team-local display  |
| userId       | string   | Reference to User                          |
| teamId       | string   | Reference to Team                          |
| role         | Role     | User's role within the team                |
| joinedAt     | datetime | When the user joined the team              |
| isActive     | boolean  | Whether membership is active               |

**Business Rules:**
- A user can only have one active membership per team
- Membership name is a denormalized copy and must stay aligned with the user profile name when updated
- Role must be one of: Member, Admin
- Only Admins can deactivate memberships

---

## Season

Represents a time-bounded competitive/social period for a team.

| Field                | Type     | Description                                     |
|----------------------|----------|-------------------------------------------------|
| id                   | string   | Unique identifier                               |
| teamId               | string   | Reference to Team                               |
| name                 | string   | Season label (e.g. "Efterår 2025")              |
| startDate            | date     | Season start                                    |
| endDate              | date?    | Season end (null = active)                      |
| isActive             | boolean  | Whether this is the current season              |
| totalApprovedBalance | number?  | Total DKK from approved payments (denormalized) |
| totalPendingBalance  | number?  | Total DKK from pending payments (denormalized)  |
| totalOutstanding     | number?  | Total DKK from unpaid fines (denormalized)      |

**Business Rules:**
- Only one season per team can be active at a time
- Fines are always scoped to a season
- Closing a season does not delete its data
- Balance fields are updated atomically when payments change status (F024)

---

## FineRule

A reusable template defining a fine type.

| Field        | Type     | Description                                        |
|--------------|----------|----------------------------------------------------|
| id           | string   | Unique identifier                                  |
| teamId       | string   | Reference to Team                                  |
| title        | string   | Short name (e.g. "Kom for sent")                   |
| description  | string?  | Optional explanation                               |
| amount       | number   | Default fine amount in DKK                         |
| emoji        | string?  | Optional emoji for social flair                    |
| isActive     | boolean  | Whether rule is still in use                       |
| createdBy    | string   | Reference to User (creator)                        |
| createdAt    | datetime | Creation timestamp                                 |

**Business Rules:**
- Amount must be > 0
- Rules belong to a team and cannot be shared across teams
- Deactivating a rule does not affect existing assigned fines

---

## Fine

A fine assigned to one or more users.

| Field        | Type          | Description                                 |
|--------------|---------------|---------------------------------------------|
| id           | string        | Unique identifier                           |
| teamId       | string        | Reference to Team                           |
| seasonId     | string        | Reference to Season                         |
| fineRuleId   | string?       | Optional reference to FineRule template     |
| title        | string        | Fine label (copied from rule or custom)     |
| amount       | number        | Fine amount in DKK                          |
| assignedTo   | string[]      | List of User IDs fined                      |
| assignedBy   | string        | Reference to User (admin who assigned)      |
| note         | string?       | Optional note/comment                       |
| isShared     | boolean       | Whether it's a shared team-wide fine        |
| createdAt    | datetime      | When fine was created                       |
| deletedAt    | datetime?     | Soft delete timestamp                       |

**Business Rules:**
- A fine must belong to an active season
- assignedTo must contain at least one user
- Only Admins can assign fines
- Deleted fines are soft-deleted, not removed from DB
- Shared fines are shown collectively but tracked individually

---one or more fines assigned to a specific user.

| Field        | Type           | Description                                  |
|--------------|----------------|----------------------------------------------|
| id           | string         | Unique identifier                            |
| fineId       | string?        | **Deprecated** - Legacy reference to single Fine |
| fineIds      | string[]?      | References to Fines (supports combined payments) |
| userId       | string         | Reference to User (the person paying)        |
| amount       | number         | Amount to pay (sum of all fines)             |
| status       | PaymentStatus  | Current payment state                        |
| initiatedAt  | datetime?      | When user tapped "Pay"                       |
| approvedAt   | datetime?      | When admin approved                          |
| approvedBy   | string?        | Reference to User (approving admin)          |

**PaymentStatus values:**
- `unpaid` — default state
- `pending` — user has initiated MobilePay transfer
- `approved` — admin has confirmed receipt
- `disputed` — payment flagged for review

**Business Rules:**
- New payments use `fineIds[]` to support combined payments (F023)
- Legacy payments may have only `fineId` - code must handle both
- Only Admins can approve payments
- Approved payments can be refunded via F015 (creates audit log entry)
**Business Rules:**
- Each (fineId, userId) pair has exactly one Payment record
- Only Admins can approve payments
- Approved payments cannot be reversed without creating an audit log entry

---

## ActivityLog

Immutable audit trail of all significant actions.

| Field        | Type     | Description                                |
|--------------|----------|--------------------------------------------|
| id           | string   | Unique identifier                          |
| teamId       | string   | Reference to Team                          |
| actorId      | string   | Reference to User who performed the action |
| action       | string   | Action type (see below)                    |
| entityType   | string   | Entity type affected                       |
| entityId     | string   | ID of the affected entity                  |
| metadata     | object?  | Optional additional context                |
| createdAt    | datetime | When the action occurred                   |

**Action types:**, `payment.refunded`, `payment.reconciled`
- `member.added`, `member.removed`, `member.role_changed`
- `season.created`, `season.closed`
- `rule.created`, `rule.deactivated`
- `balance.updated` (F024)

**Business Rules:**
- ActivityLog entries are never deleted
- All mutations to Fine, Payment, Membership must create a log entry

---

## UserSeasonBalance

Tracks a user's financial state within a specific team and season.

| Field             | Type     | Description                                      |
|-------------------|----------|--------------------------------------------------|
| id                | string   | Unique identifier                                |
| userId            | string   | Reference to User                                |
| teamId            | string   | Reference to Team                                |
| seasonId          | string   | Reference to Season                              |
| outstandingBalance| number   | Total unpaid fines (DKK)                         |
| pendingBalance    | number   | Total pending payments awaiting approval (DKK)   |
| approvedBalance   | number   | Total approved payments (DKK)                    |
| updatedAt         | datetime | Last balance update timestamp                    |

**Business Rules:**
- Each (userId, teamId, seasonId) tuple has exactly one UserSeasonBalance record
- Balances are updated atomically when fines are assigned/deleted or payments change status
- Balance updates write a `balance.updated` ActivityLog entry
- Only balances for the active season are actively maintained
- When a season is closed, its balances are frozen
- ActivityLog entries are never deleted
- All mutations to Fine, Payment, Membership must create a log entry

---

## FeatureProposal

Feature proposal from super-admin users for product improvements.

| Field              | Type     | Description                                 |
|--------------------|----------|---------------------------------------------|
| id                 | string   | Unique identifier                           |
| title              | string   | Proposal title                              |
| problem            | string   | Current pain/problem statement              |
| desiredOutcome     | string   | Desired behavior/outcome                    |
| creatorId          | string   | Reference to User (proposal creator)        |
| creatorName        | string   | Snapshot of creator display name            |
| whereInApp         | string?  | Optional area/screen reference              |
| priority           | 1-4?     | Optional urgency (low to critical)          |
| status             | enum     | Lifecycle status (new -> done/abandoned)   |
| statusUpdatedAt    | datetime?| Timestamp for latest status change          |
| approvedAt         | datetime?| Timestamp when marked done                  |
| githubIssueId      | string?  | Exported GitHub issue id                    |
| githubIssueNumber  | number?  | Exported GitHub issue number                |
| githubIssueUrl     | string?  | Exported GitHub issue URL                   |
| githubIssueRepo    | string?  | GitHub repository used for export           |
| exportedToGithubAt | datetime?| Timestamp for GitHub export                 |
| createdAt          | datetime | Creation timestamp                          |
| updatedAt          | datetime | Last write timestamp                        |

**Business Rules:**
- Only super-admins can create/edit proposal content.
- Only `mchoffn@hotmail.com` can change proposal status, approve proposal completion, and export proposals to GitHub.
- `creatorName` is a snapshot for UI context and may differ from the current User name later.

---

## Role (Enum)

```ts
enum Role {
  Member = "member",
  Admin  = "admin",
}
```

The role field determines all permissions within a team. A user's role is specific to each team they join.

**Permission matrix:**

| Action                    | Member | Admin |
|---------------------------|--------|-------|
| View team overview        | ✓      | ✓     |
| View personal debt        | ✓      | ✓     |
| Initiate payment          | ✓      | ✓     |
| Assign fine               |        | ✓     |
| Bulk assign fine          |        | ✓     |
| Delete/restore fine       |        | ✓     |
| Approve payment           |        | ✓     |
| Manage fine rules         |        | ✓     |
| Manage members            |        | ✓     |
| Manage seasons            |        | ✓     |
| View activity log         |        | ✓     |
