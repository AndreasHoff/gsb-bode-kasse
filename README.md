# GSB Bødekasse 🏸

A modern, mobile-first **bødekasse** (fine pool) platform for Danish sports clubs.  
Built for badminton teams — social-first, not finance-first.

---

## What is this?

A club culture platform where players receive humorous/social fines during the season.  
The collected money funds team dinners, parties, and events.

Inspired by Teambox and PayTheHippo — but faster, more transparent, and better UX.

---

## Tech Stack

| Layer        | Technology                              |
|--------------|-----------------------------------------|
| Frontend     | React + TypeScript (Vite 5)             |
| Styling      | TailwindCSS v4                          |
| Backend      | Firebase (Firestore)                    |
| Mobile       | Capacitor *(future App Store wrapping)* |
| Payments     | MobilePay deep-link (no fintech infra)  |

---

## Getting Started

```bash
npm install
npm run dev
```

Create `.env.local` with the Firebase Vite variables:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

For GitHub Pages deployments, add the same values as repository secrets:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

---

## Project Structure

```
src/
  features/
    overview/       # F004 – Team shared debt view
    personal/       # F005 – Personal debt overview
    fines/          # F001, F002 – Assign fine (single + bulk)
    activity/       # F007 – Activity log / audit trail
  lib/
    permissions.ts  # Role-based permission helpers
    utils.ts        # MobilePay deep-link, formatting
  types/
    domain.ts       # All domain entity types

docs/
  specs/
    domain/         # Entity definitions + business rules
    features/       # Per-feature specs (F001–F007+)
    flows/          # End-to-end flow diagrams
```

---

## Feature Specs

| ID   | Feature                  | Status        |
|------|--------------------------|---------------|
| F001 | Assign Fine (single)     | Spec complete |
| F002 | Bulk Fine Assignment     | Spec complete |
| F003 | Pay Fine (MobilePay)     | Spec complete |
| F004 | Team Overview            | Spec complete |
| F005 | Personal Debt Overview   | Spec complete |
| F006 | Delete / Undo Fine       | Spec complete |
| F007 | Activity Log             | Spec complete |
| F008 | Member Welcome & Auth    | Spec complete |
| F009 | Navbar med venstre sidemenu | Spec complete |

---

## Development Readiness (Scaffolding Phase)

You can start building now.

Current documentation already covers:
- Core domain entities and non-negotiable business rules (`docs/specs/domain/entities.md`)
- Core user/system flows (`docs/specs/flows/flows.md`)
- Initial feature-level specs F001–F009 (`docs/specs/features/`)

Before implementing each new feature, still add/confirm:
- A dedicated F00N feature spec with flow, edge cases, and acceptance criteria
- Any missing role/permission constraints
- Any backend data/index/security rule implications

Use this checklist to decide if a feature is ready for implementation:
- [ ] User pain/problem is explicit
- [ ] Goal and actors are explicit
- [ ] Preconditions and flow are concrete
- [ ] Edge cases include empty state, permission failure, network failure, duplicate actions
- [ ] Acceptance criteria are testable
- [ ] Firestore entity updates are mapped (`docs/specs/domain/entities.md`)
- [ ] ActivityLog mutation impact is defined

For backend data modeling during scaffolding, treat the current domain model as **v1 baseline** and evolve it feature-by-feature (instead of attempting full upfront modeling).

---

## Roles & Permissions

Current implementation policy (v1): Firestore writes are restricted to admins.
Feature-specific exceptions for non-admin writes can be introduced later as explicit, scoped changes.

| Action                | Player | Captain | Treasurer | Admin |
|-----------------------|--------|---------|-----------|-------|
| View team overview    | ✓      | ✓       | ✓         | ✓     |
| Assign fine           |        |         |           | ✓     |
| Bulk assign fine      |        |         |           | ✓     |
| Delete fine           |        |         |           | ✓     |
| Approve payment       |        |         |           | ✓     |
| Manage members        |        |         |           | ✓     |
| Manage seasons        |        |         |           | ✓     |

---

## Payment Flow

Payments use **MobilePay deep-linking** — no fintech infrastructure required:

1. Player taps "Pay"
2. App opens MobilePay with prefilled amount + recipient
3. Player transfers manually
4. Admin/Treasurer confirms receipt in the app

---

## Development Philosophy

- **Spec-driven**: all features documented before implementation
- **Mobile-first**: designed for thumbs, not desktop
- **Social-first**: culture software, not accounting software
- **AI-friendly**: structured for GitHub Copilot, Claude, Cursor agents

---

## Shipping Rule (Versioning + Patch Notes)

When shipping a feature or fix, always update both:

1. `package.json` version (semver: patch for fixes, minor for features)
2. `docs/PATCH_NOTES.md` with a new entry (version, date, bullet points in Danish)
