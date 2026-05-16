# Tasks: Feature Proposals Implementation

> Reference: `spec.md` (what to build) and `plan.md` (how to build it).
> Execute phases in order. Backend phases must complete before frontend phases.

---

## Phase 0 — Prerequisites

- [ ] Confirm Express + JWT auth middleware is working (`req.user.id` and `req.user.name` are populated)
- [ ] Confirm Prisma is set up with a `User` model containing `id` (String) and `name` (String)
- [ ] Confirm `npm run migrate:dev` and `npm run generate:dev` scripts exist (or equivalent)
- [ ] Create the `PROPOSALS_PATH` directory on disk and ensure it is writable by the server process
- [ ] Add environment variables to `.env` / `.env.development`:
  ```
  PROPOSALS_PATH=/absolute/path/to/proposals
  BASE_MEDIA_URL=http://localhost:PORT
  ADMIN_USERNAME=YourName
  ```

---

## Phase 1 — Database Schema

- [ ] Add three named relations to the `User` model in `backend/prisma/schema.prisma`:
  ```prisma
  proposals                FeatureProposal[]    @relation("ProposalCreator")
  statusUpdatedProposals   FeatureProposal[]    @relation("ProposalStatusUpdater")
  approvedProposals        FeatureProposal[]    @relation("ProposalApprover")
  ```
- [ ] Add the `FeatureProposal` model (copy from `spec.md`)
- [ ] Add the `FeatureProposalImage` model (copy from `spec.md`)
- [ ] Run migration: `npm run migrate:dev` (name it `add_feature_proposals`)
- [ ] Run `npm run generate:dev` to update the Prisma JS client
- [ ] Verify in Prisma Studio or a DB browser that both tables exist with correct columns

---

## Phase 2 — Backend Dependencies

- [ ] In `backend/`, run: `npm install multer sharp`
- [ ] Confirm `multer` and `sharp` appear in `backend/package.json` dependencies

---

## Phase 3 — Backend Route

Create `backend/routes/featureProposals.js`. Implement endpoints in this order:

- [ ] Set up file-level constants:
  - `ADMIN_USERNAME` from `process.env.ADMIN_USERNAME`
  - `MAX_IMAGE_SIZE = 50 * 1024 * 1024`
  - `MAX_PROPOSAL_TOTAL = 200 * 1024 * 1024`
  - `PREVIEW_LONG_EDGE = 2400`
  - `ALLOWED_STATUSES = ['new', 'triaged', 'planned', 'implemented', 'done', 'abandoned']`
  - `ALLOWED_PRIORITIES = [1, 2, 3, 4]`
  - `getProposalsPath()` reading `process.env.PROPOSALS_PATH`

- [ ] Configure `multer` with temp disk storage, 50 MB limit, image-only file filter

- [ ] Implement helper functions:
  - [ ] `generateProposalPreview(inputPath, outputPath)` — sharp auto-orient + resize + JPEG encode
  - [ ] `moveUploadedFile(sourcePath, destinationPath)` — `fs.rename` with cross-device fallback
  - [ ] `toAbsoluteUrl(base, url)` — prepend `BASE_MEDIA_URL`, skip if already absolute
  - [ ] `withImageUrls(proposal)` — map all image URLs through `toAbsoluteUrl`

- [ ] Implement `GET /` — list all proposals ordered by `createdAt` desc, include all relations
- [ ] Implement `GET /notifications` — count `implemented` proposals by current user with `approvedAt = null`
  > ⚠️ Must be registered **before** `GET /:id`
- [ ] Implement `GET /:id` — single proposal with relations, 404 if missing
- [ ] Implement `POST /` — create proposal, validate required fields and priority range
- [ ] Implement `PUT /:id` — edit proposal, check locked status, partial update
- [ ] Implement `PATCH /:id/status` — admin only, validate status value, clear approval fields on rollback
- [ ] Implement `POST /:id/images` — multer upload, size enforcement, preview generation, DB insert
- [ ] Implement `DELETE /:id/images/:imageId` — DB delete first, then best-effort file delete
- [ ] Implement `PATCH /:id/approve` — creator only, check `status === 'implemented'`, set `approvedAt`
- [ ] (Optional) Implement `POST /:id/export-to-github` — create GitHub issue, add label, add to project

- [ ] Export the router as default

---

## Phase 4 — Mount Router in Server

- [ ] In `backend/server.js`, import `featureProposalsRouter`
- [ ] Mount it: `app.use('/api/feature-proposals', featureProposalsRouter)`
  - Ensure this line comes **after** your auth middleware so `req.user` is populated
- [ ] Add static file serving: `app.use('/proposals', express.static(process.env.PROPOSALS_PATH))`
- [ ] Restart the server and confirm `GET /api/feature-proposals` returns `[]` (not a 404)

---

## Phase 5 — Frontend API Service Layer

In `src/services/api.js` (or your API module), add the following functions. Each reads `localStorage.getItem('auth_token')` for the Bearer token.

- [ ] `getProposalNotifications()` — `GET /api/feature-proposals/notifications`
- [ ] `getFeatureProposals()` — `GET /api/feature-proposals`
- [ ] `getFeatureProposal(id)` — `GET /api/feature-proposals/:id`
- [ ] `createFeatureProposal(data)` — `POST /api/feature-proposals` with JSON body
- [ ] `updateFeatureProposal(id, data)` — `PUT /api/feature-proposals/:id` with JSON body
- [ ] `updateFeatureProposalStatus(id, status)` — `PATCH /api/feature-proposals/:id/status`
- [ ] `approveFeatureProposal(id)` — `PATCH /api/feature-proposals/:id/approve`
- [ ] `uploadProposalImages(id, files)` — `POST /api/feature-proposals/:id/images` with `FormData`
- [ ] `deleteProposalImage(proposalId, imageId)` — `DELETE /api/feature-proposals/:id/images/:imageId`
- [ ] (Optional) `exportProposalToGithub(id)` — `POST /api/feature-proposals/:id/export-to-github`

---

## Phase 6 — Notification Hook

Create `src/hooks/useProposalNotifications.js`:

- [ ] Accept `enabled: boolean` param
- [ ] On mount (and every 6 hours): call `getProposalNotifications()`, set `notificationCount`
- [ ] When `enabled` is false: set `notificationCount` to 0 and skip polling
- [ ] Silently swallow errors (badge is best-effort)
- [ ] Return `{ notificationCount, refresh }`

---

## Phase 7 — Frontend Pages

### FeatureProposals (list)

Create `src/pages/FeatureProposals.jsx` and `.styles.jsx`:

- [ ] On mount: fetch all proposals via `getFeatureProposals()`
- [ ] Filter tabs: `new | triaged | planned | implemented | done | abandoned | all`
- [ ] Pagination: 6 proposals per page, reset to page 1 on filter change
- [ ] Cards: title, status badge, priority badge, creator name, formatted date
- [ ] Expand/collapse per card to show `problem` and `desiredOutcome`
- [ ] "New idea" button navigates to `/feature-proposals/new`
- [ ] Card/title click navigates to `/feature-proposals/:id`

### FeatureProposalForm (create + edit)

Create `src/pages/FeatureProposalForm.jsx` and `.styles.jsx`:

- [ ] Detect edit mode: if `useParams().id` exists, fetch proposal and pre-populate form
- [ ] Fields: title (required), problem (required), desiredOutcome (required), whereInApp (optional), priority selector (optional, values 1–4 or none)
- [ ] On create submit: call `createFeatureProposal()`, redirect to `/feature-proposals/:newId`
- [ ] On edit submit: call `updateFeatureProposal()`, redirect to `/feature-proposals/:id`
- [ ] In edit mode: also render image management (upload new images, delete existing ones)
- [ ] Image upload: multi-file input, call `uploadProposalImages()`, refresh images list
- [ ] Image delete: call `deleteProposalImage()`, remove from local state

### FeatureProposalDetail (detail)

Create `src/pages/FeatureProposalDetail.jsx` and `.styles.jsx`:

- [ ] Fetch proposal by ID on mount via `getFeatureProposal(id)`
- [ ] Display all fields: title, problem, desiredOutcome, whereInApp, priority, status, dates, user names
- [ ] Image gallery: show preview images; click to open original in lightbox/fullscreen
- [ ] **Edit button**: visible if not locked AND (current user is creator OR admin)
- [ ] **Approve button**: visible only when `status === 'implemented'` AND current user is creator — calls `approveFeatureProposal(id)` and refreshes
- [ ] **Status control**: visible only to admin — allows selecting any valid status
- [ ] **Export to GitHub button** (optional): visible to admin if `githubIssueUrl` is null
- [ ] Image upload area (if not locked): multi-file input, calls `uploadProposalImages()`
- [ ] Delete button per image (if not locked): calls `deleteProposalImage()`

---

## Phase 8 — Routing

- [ ] In `src/App.jsx`, import the three page components
- [ ] Add 4 protected routes (inside your existing auth-protected route group):
  ```jsx
  <Route path="/feature-proposals" element={<ProtectedRoute element={<FeatureProposals />} />} />
  <Route path="/feature-proposals/new" element={<ProtectedRoute element={<FeatureProposalForm />} />} />
  <Route path="/feature-proposals/:id" element={<ProtectedRoute element={<FeatureProposalDetail />} />} />
  <Route path="/feature-proposals/:id/edit" element={<ProtectedRoute element={<FeatureProposalForm />} />} />
  ```

---

## Phase 9 — Navigation Integration

- [ ] In your sidebar/nav component, import `useProposalNotifications`
- [ ] Call `useProposalNotifications(!!token)` to get `notificationCount`
- [ ] Add a nav link to `/feature-proposals`
- [ ] When `notificationCount > 0`, show a badge (e.g. a red circle with the count) on the nav link

---

## Phase 10 — Verification

Run through these scenarios manually (or write tests if your project has a test suite):

- [ ] **Create** — Submit a new proposal, confirm it appears in the list under "new" tab
- [ ] **Edit** — Edit the proposal title, confirm change persists
- [ ] **Upload images** — Attach 2 images, confirm previews appear and files exist on disk
- [ ] **Delete image** — Remove one image, confirm it disappears from UI and disk
- [ ] **Admin status change** — Change status to `triaged`, then `planned`, then `implemented`
- [ ] **Notification badge** — After status reaches `implemented`, reload as the creator and confirm badge shows count = 1
- [ ] **Approve** — Click approve as creator, confirm status moves to `done` and badge clears
- [ ] **Locked state** — With status `done`, confirm edit button is hidden and PUT/image endpoints return 403
- [ ] **Non-admin status change** — Confirm non-admin user gets 403 from PATCH status endpoint
- [ ] **Non-creator approve** — Confirm another user gets 403 from PATCH approve endpoint
- [ ] **Notifications endpoint order** — Confirm `/notifications` is not accidentally matched as `/:id`
- [ ] (Optional) **GitHub export** — If configured, export a proposal and confirm issue is created on GitHub
