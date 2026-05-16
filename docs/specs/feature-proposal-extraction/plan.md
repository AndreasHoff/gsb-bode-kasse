# Implementation Plan: Feature Proposals

> Reference spec: `spec.md` in this directory.

---

## Execution Environment

| Scope | Where to run |
|---|---|
| DB migrations + Prisma generate | Target server (or local if dev DB) |
| Backend route creation | Local (file edit), deploy to server |
| Frontend pages/hooks/services | Local development machine |

---

## Prerequisites

Before starting any task, confirm these are already in place in the target project:

- [ ] Express server with a working JWT auth middleware that populates `req.user`
- [ ] Prisma schema with a `User` model that has at least `id` (String) and `name` (String) fields
- [ ] `npm run migrate:dev` and `npm run generate:dev` scripts configured (or equivalent)
- [ ] A static file serving setup, or a plan for where to serve uploaded files from
- [ ] React + React Router v6 with protected routes wired up

---

## New Files to Create

### Backend

| File | Description |
|---|---|
| `backend/routes/featureProposals.js` | Full Express router — all endpoints, multer config, sharp preview generation, GitHub export helpers |

### Frontend

| File | Description |
|---|---|
| `src/pages/FeatureProposals.jsx` | List page — filter tabs, pagination, expand/collapse cards |
| `src/pages/FeatureProposals.styles.jsx` | Styled components for list page |
| `src/pages/FeatureProposalForm.jsx` | Create/edit form — handles both new and edit modes via React Router params |
| `src/pages/FeatureProposalForm.styles.jsx` | Styled components for form |
| `src/pages/FeatureProposalDetail.jsx` | Detail view — image gallery, approve button, admin status control |
| `src/pages/FeatureProposalDetail.styles.jsx` | Styled components for detail page |
| `src/hooks/useProposalNotifications.js` | Polling hook — polls `/notifications` every 6 hours |

---

## Files to Modify

| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | Add `FeatureProposal` and `FeatureProposalImage` models; add 3 named relations to `User` |
| `backend/server.js` | Mount featureProposals router at `/api/feature-proposals` (after auth middleware) |
| `src/services/api.js` | Add 9–10 API functions (see spec.md API section) |
| `src/App.jsx` | Add 4 protected routes |
| `src/components/Sidebar.jsx` (or nav component) | Add nav link + notification badge |

---

## Dependencies to Install

### Backend (`backend/package.json`)

```bash
npm install multer sharp
```

- `multer` — handles `multipart/form-data` file uploads, writes to temp disk before processing
- `sharp` — resizes and re-encodes images for preview generation

### Frontend

No new npm dependencies required. The feature uses only the native `fetch` API and existing React Router.

---

## Database Schema Changes

Add to `backend/prisma/schema.prisma`:

1. Three relations on the existing `User` model (named relations — Prisma requires names when there are multiple relations to the same model):

```prisma
proposals                FeatureProposal[]    @relation("ProposalCreator")
statusUpdatedProposals   FeatureProposal[]    @relation("ProposalStatusUpdater")
approvedProposals        FeatureProposal[]    @relation("ProposalApprover")
```

2. Two new models — copy the exact Prisma schema from `spec.md`.

### Migration approach

**Option A — Four incremental migrations** (matches the reference implementation, good if you want history):
1. `add_feature_proposals` — base tables
2. `add_priority_to_feature_proposal` — `priority Int?` column
3. `add_github_export_to_proposals` — `githubIssueNumber`, `githubIssueUrl`, `exportedToGithubAt`
4. `add_approval_to_proposals` — `approvedAt`, `approvedByCreatorUserId`

**Option B — Single migration** (simpler for a fresh project):
Add all fields at once and run one `npm run migrate:dev`.

> Always run `npm run generate:dev` after any migration to update the Prisma JS client.

---

## File Storage Structure

The `PROPOSALS_PATH` env var points to the root storage directory. The router creates subdirectories per proposal automatically.

```
{PROPOSALS_PATH}/
  {proposalId}/
    originals/
      {timestamp}-{random}.jpg
    previews/
      {timestamp}-{random}_preview.jpg
```

### Static file serving

In `server.js`, after setting up the router, serve the proposals directory under `/proposals`:

```js
import express from 'express';
app.use('/proposals', express.static(process.env.PROPOSALS_PATH));
```

This makes uploaded files accessible at `{BASE_MEDIA_URL}/proposals/{proposalId}/originals/{filename}`.

---

## Router Registration

In `backend/server.js`, mount the router **after** the auth middleware, so `req.user` is always populated:

```js
import featureProposalsRouter from './routes/featureProposals.js';

// Existing auth middleware already runs before this point
app.use('/api/feature-proposals', featureProposalsRouter);
```

The router itself does not apply auth middleware again — it relies on the global middleware already having run.

---

## Image Processing Logic

For each uploaded image:

1. multer writes it to a temp directory (`os.tmpdir()/your-app-proposals/`)
2. Move the temp file to `{PROPOSALS_PATH}/{proposalId}/originals/{imageId}{ext}` using `fs.rename` (with `fs.copyFile` + `fs.unlink` fallback for cross-device moves)
3. Run `sharp(originalPath).rotate()` (auto-orient from EXIF) then resize so the long edge is ≤ 2400px, encode as JPEG quality 85, write to `previews/`
4. Store relative paths in the DB (e.g. `/proposals/{proposalId}/originals/{filename}`)
5. `BASE_MEDIA_URL` is prepended to all `originalUrl` / `previewUrl` fields on every read response

If preview generation fails, log the error and fall back to `previewUrl = originalUrl`.

---

## Auth Integration Details

The router reads `req.user.id` (String) and `req.user.name` (String) from whatever your JWT middleware populates. Ensure your middleware sets these exact property names, or adjust the route handler accordingly.

Admin check:
```js
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Admin';
if (req.user.name !== ADMIN_USERNAME) {
  return res.status(403).json({ error: 'Only the admin can change proposal status' });
}
```

---

## Frontend API Layer

All API functions live in `src/services/api.js` (or your equivalent API module). They all:
- Read `localStorage.getItem('auth_token')` for the Bearer token
- Use `fetch` with `Authorization` header
- Throw on non-OK responses using a shared `buildApiError` helper

Functions to add (see spec.md for full signatures):
- `getProposalNotifications()`
- `getFeatureProposals()`
- `getFeatureProposal(id)`
- `createFeatureProposal(data)`
- `updateFeatureProposal(id, data)`
- `updateFeatureProposalStatus(id, status)`
- `approveFeatureProposal(id)`
- `uploadProposalImages(id, files)`
- `deleteProposalImage(proposalId, imageId)`
- `exportProposalToGithub(id)` *(optional)*

---

## Notification Hook

`useProposalNotifications(enabled: boolean)` returns `{ notificationCount: number, refresh: Function }`.

- Only polls when `enabled` is `true` (pass `!!token`)
- Polls on mount and every 6 hours via `setInterval`
- Silently ignores errors (badge is best-effort)
- Clears count and stops polling when `enabled` becomes `false`

---

## React Router Routes

Add to your routes configuration (all behind a `ProtectedRoute` wrapper):

```jsx
<Route path="/feature-proposals" element={<ProtectedRoute element={<FeatureProposals />} />} />
<Route path="/feature-proposals/new" element={<ProtectedRoute element={<FeatureProposalForm />} />} />
<Route path="/feature-proposals/:id" element={<ProtectedRoute element={<FeatureProposalDetail />} />} />
<Route path="/feature-proposals/:id/edit" element={<ProtectedRoute element={<FeatureProposalForm />} />} />
```

The `FeatureProposalForm` component uses `useParams()` to detect edit mode — if `params.id` exists, it fetches the existing proposal and pre-populates the form.

---

## Tradeoffs & Decisions

| Decision | Rationale |
|---|---|
| Local filesystem storage | Self-hosted target project — no object storage needed. Simple `express.static` serving. |
| Relative URLs in DB | Decouples storage location from DB — `BASE_MEDIA_URL` can change without a migration. |
| No soft-delete for proposals | Locked state (`done`/`implemented`/`abandoned`) prevents edits. Full delete is not supported in this version. |
| 6-hour notification polling | Simpler than WebSockets for a low-traffic self-hosted app. Battery-friendly on mobile. |
| GitHub export is best-effort | Project board assignment swallows errors — export failure never blocks the user. |
| Admin by username | Simple for a known two-person app. Not role-based — swap for a `role` field if multi-admin is needed. |
| Preview fallback to original | If `sharp` fails (e.g. unsupported format), the original URL is used as `previewUrl`. No broken images. |
