# Feature Spec: In-App Feature Proposals

## Overview

Allow authenticated users to submit feature ideas ("proposals"), attach screenshot evidence, track their progress through a lifecycle, and receive a notification when their idea is implemented and awaiting their approval.

An admin (identified by a configurable username) controls the status lifecycle. The original creator must explicitly approve a proposal once the admin marks it as implemented before it can be closed as done.

This spec is written as a **portable, self-contained implementation guide**. It assumes the same stack as the source project (see [Stack](#stack)) and is intended to be dropped into a fresh project for an agent to implement.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| ORM | Prisma (SQLite, but any relational DB works) |
| Auth | JWT — `Authorization: Bearer <token>`, stored in `localStorage` |
| File upload | `multer` (disk storage) |
| Image processing | `sharp` |
| Frontend | React + Vite |
| Routing | React Router v6 |
| HTTP client | `fetch` (native) |

---

## Data Models

### FeatureProposal

```prisma
model FeatureProposal {
  id                      String    @id @default(uuid())
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  createdByUserId         String
  title                   String
  problem                 String
  desiredOutcome          String
  whereInApp              String?
  priority                Int?
  status                  String    @default("new")
  statusUpdatedAt         DateTime?
  statusUpdatedByUserId   String?
  githubIssueNumber       Int?
  githubIssueUrl          String?
  exportedToGithubAt      DateTime?
  approvedAt              DateTime?
  approvedByCreatorUserId String?

  createdBy             User      @relation("ProposalCreator", fields: [createdByUserId], references: [id], onDelete: Cascade)
  statusUpdatedBy       User?     @relation("ProposalStatusUpdater", fields: [statusUpdatedByUserId], references: [id], onDelete: SetNull)
  approvedByCreator     User?     @relation("ProposalApprover", fields: [approvedByCreatorUserId], references: [id], onDelete: SetNull)
  images                FeatureProposalImage[]

  @@index([createdByUserId])
  @@index([status])
  @@index([createdAt])
  @@index([approvedByCreatorUserId])
}
```

### FeatureProposalImage

```prisma
model FeatureProposalImage {
  id                String   @id @default(uuid())
  proposalId        String
  originalUrl       String
  previewUrl        String
  originalSizeBytes Int
  previewSizeBytes  Int?
  mimeType          String
  createdAt         DateTime @default(now())

  proposal          FeatureProposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)

  @@index([proposalId])
}
```

### User model additions

Add these three relations to your existing `User` model:

```prisma
proposals                FeatureProposal[]    @relation("ProposalCreator")
statusUpdatedProposals   FeatureProposal[]    @relation("ProposalStatusUpdater")
approvedProposals        FeatureProposal[]    @relation("ProposalApprover")
```

---

## Business Rules

### Status Lifecycle

```
new → triaged → planned → implemented → done
                                       ↗ (requires creator approval)
              ↘ abandoned (admin can abandon from any state)
```

| Status | Meaning |
|---|---|
| `new` | Default. Proposal has been submitted. |
| `triaged` | Admin has reviewed and queued it for consideration. |
| `planned` | Work has started. |
| `implemented` | Admin marks as completed. Creator must now approve. |
| `done` | Creator has approved the implementation. Final state. |
| `abandoned` | Admin has decided not to pursue it. Final state. |

Valid status values: `['new', 'triaged', 'planned', 'implemented', 'done', 'abandoned']`

### Locking

Proposals in `done`, `implemented`, or `abandoned` status are **locked**. Locked proposals cannot:
- Be edited (PUT returns 403)
- Have images added or removed (POST/DELETE images returns 403)

### Admin Restriction

Only the user whose `name` field matches the `ADMIN_USERNAME` environment variable can call `PATCH /:id/status`.

### Creator Approval

Only the user who created a proposal (`createdByUserId === req.user.id`) can call `PATCH /:id/approve`. This moves status from `implemented` → `done` and sets `approvedAt` + `approvedByCreatorUserId`.

If the admin changes status away from `done` (e.g. rolling back), clear `approvedAt` and `approvedByCreatorUserId`.

### Notification Badge

The `GET /notifications` endpoint returns `{ count: N }` — the count of proposals where:
- `createdByUserId = req.user.id`
- `status = 'implemented'`
- `approvedAt IS NULL`

The frontend polls this every 6 hours when the user is logged in and shows a badge on the nav item.

### Image Limits

- Max **50 MB per image** (enforced by multer `limits.fileSize`)
- Max **200 MB total originals per proposal** (enforced in route handler by summing `originalSizeBytes`)
- Only `image/*` MIME types accepted
- For each uploaded image: original stored as-is, preview generated at JPEG quality 85, long edge ≤ 2400px

### Image URL Storage

Store **relative paths** in the database (e.g. `/proposals/{proposalId}/originals/{filename}`). Prepend `BASE_MEDIA_URL` env var at read time. This allows the base URL to change without a DB migration.

Legacy absolute URLs (starting with `http://` or `https://`) must be returned unchanged to avoid double-prepending.

### Priority

Optional integer field. Valid values: `1` (low), `2` (moderate), `3` (high), `4` (critical). Can be null.

---

## API Endpoints

All endpoints require a valid JWT (`Authorization: Bearer <token>`). Mount the router behind your existing auth middleware.

### `GET /api/feature-proposals`

List all proposals, ordered by `createdAt` descending.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "title": "string",
    "problem": "string",
    "desiredOutcome": "string",
    "whereInApp": "string | null",
    "priority": "1 | 2 | 3 | 4 | null",
    "status": "new",
    "createdAt": "ISO8601",
    "createdBy": { "id": "uuid", "name": "string" },
    "statusUpdatedBy": { "id": "uuid", "name": "string" } | null,
    "approvedByCreator": { "id": "uuid", "name": "string" } | null,
    "images": [ { "id": "uuid", "originalUrl": "string", "previewUrl": "string", ... } ]
  }
]
```

---

### `POST /api/feature-proposals`

Create a new proposal.

**Request body:**
```json
{
  "title": "string (required)",
  "problem": "string (required)",
  "desiredOutcome": "string (required)",
  "whereInApp": "string (optional)",
  "priority": "1 | 2 | 3 | 4 (optional)"
}
```

**Response `201`:** Created proposal object (same shape as list item).

**Errors:** `400` if required fields missing or priority invalid.

---

### `GET /api/feature-proposals/notifications`

> ⚠️ This route **must be registered before** `GET /:id` to avoid Express matching `/notifications` as an ID.

**Response `200`:**
```json
{ "count": 2 }
```

---

### `GET /api/feature-proposals/:id`

Get a single proposal with all relations and images.

**Response `200`:** Proposal object. **`404`** if not found.

---

### `PUT /api/feature-proposals/:id`

Edit a proposal. Locked proposals (`done`, `implemented`, `abandoned`) return `403`.

**Request body:** Partial — include only fields to update.
```json
{
  "title": "string",
  "problem": "string",
  "desiredOutcome": "string",
  "whereInApp": "string | null",
  "priority": "1 | 2 | 3 | 4 | null"
}
```

**Response `200`:** Updated proposal object.

---

### `PATCH /api/feature-proposals/:id/status`

Admin-only. Change proposal status.

**Request body:**
```json
{ "status": "triaged" }
```

**Response `200`:** Updated proposal object. Sets `statusUpdatedAt` and `statusUpdatedByUserId`. Clears `approvedAt` / `approvedByCreatorUserId` when status is not `done`.

**Errors:** `403` if not admin, `400` if invalid status.

---

### `POST /api/feature-proposals/:id/images`

Upload 1–20 images to a proposal. Uses `multipart/form-data`, field name `images`.

**Response `201`:**
```json
{
  "images": [ { "id": "uuid", "originalUrl": "...", "previewUrl": "...", ... } ],
  "failedFiles": [ "filename.jpg" ]
}
```

**Errors:** `404` not found, `403` locked, `413` size limit exceeded.

---

### `DELETE /api/feature-proposals/:id/images/:imageId`

Delete an image. Deletes DB record first, then best-effort deletes files from disk (errors swallowed).

**Response `200`:** `{ "success": true }`

---

### `PATCH /api/feature-proposals/:id/approve`

Creator-only. Moves status from `implemented` → `done`. Sets `approvedAt` and `approvedByCreatorUserId`.

**Response `200`:** Updated proposal object.

**Errors:** `403` if not creator or if status is not `implemented`.

---

### `POST /api/feature-proposals/:id/export-to-github` *(optional)*

Creates a GitHub issue from the proposal. Requires `GITHUB_PAT` and `GITHUB_REPO` env vars. Sets `githubIssueNumber`, `githubIssueUrl`, `exportedToGithubAt` on the proposal. Best-effort adds to a GitHub Project if `GITHUB_PROJECT_NUMBER` is set.

**Response `200`:** Updated proposal object with GitHub fields populated.

**Errors:** `400` if already exported, `503` if GitHub API call fails.

---

## Frontend Pages

### `/feature-proposals` — List

- Filter tabs: `new | triaged | planned | implemented | done | abandoned | all`
- Paginated (6 proposals per page)
- Cards showing: title, status badge, priority badge, creator name, date
- Expand/collapse per card to reveal `problem` and `desiredOutcome`
- "New idea" button → navigates to `/feature-proposals/new`
- Card click → navigates to `/feature-proposals/:id`

### `/feature-proposals/new` and `/feature-proposals/:id/edit` — Form

- Fields: title (required), problem (required), desiredOutcome (required), whereInApp (optional), priority selector (optional, 1–4)
- On create: submits form, then redirects to detail page
- On edit: pre-populates from existing proposal
- In edit mode: also shows image management (upload / delete)

### `/feature-proposals/:id` — Detail

- Displays all fields
- Image gallery with lightbox (click to fullscreen)
- **Edit button** — visible if proposal is not locked AND current user is creator or admin
- **Approve button** — visible only to creator when `status === 'implemented'`
- **Status change control** — visible only to admin (dropdown or buttons for each allowed status)
- **Export to GitHub button** — visible to admin if not yet exported (optional feature)
- Image upload area (if not locked)
- Delete image button per image (if not locked)

---

## Navigation Integration

- Add a nav link to `/feature-proposals` in your sidebar/navigation component
- Use `useProposalNotifications(!!token)` hook to get `notificationCount`
- Show a badge (e.g. red circle with number) on the nav link when `notificationCount > 0`

---

## Environment Variables

```env
# Required
PROPOSALS_PATH=/path/to/your/proposals/storage
BASE_MEDIA_URL=https://your-domain.com
ADMIN_USERNAME=YourAdminName

# Optional — GitHub export
GITHUB_PAT=ghp_...
GITHUB_REPO=owner/repo-name
GITHUB_PROJECT_NUMBER=1
```

---

## Acceptance Criteria

1. Any authenticated user can create a proposal with title, problem, and desiredOutcome.
2. Priority (1–4) and whereInApp are optional and can be set on create or edit.
3. Images can be attached after creation (max 50 MB each, 200 MB total per proposal). JPEG previews are auto-generated.
4. Only the admin (`ADMIN_USERNAME`) can change proposal status.
5. A notification badge appears on the nav link when the current user has proposals in `implemented` status awaiting their approval.
6. Only the proposal creator can approve an `implemented` proposal, moving it to `done`.
7. Locked proposals (`done`, `implemented`, `abandoned`) cannot be edited and cannot have images added or removed.
8. Image URLs are stored as relative paths in the DB; `BASE_MEDIA_URL` is prepended on every read response.
9. GitHub export is optional — only enabled when `GITHUB_PAT` and `GITHUB_REPO` are set. Must be idempotent (no double-export).
10. The `/notifications` route is registered before `/:id` to prevent routing conflicts.
