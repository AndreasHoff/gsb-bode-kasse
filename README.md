# GSB Bødekasse 🏸

A modern, mobile-first **bødekasse** (fine pool) platform for Danish sports clubs.  
Built for badminton teams — social-first, not finance-first.

---

## What is this?

A club culture platform where members receive humorous/social fines during the season.  
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
| F010 | Bødekatalog              | Spec complete |
| F011 | Skift farvetema          | Spec complete |
| F012 | Profil                   | Spec complete |
| F013 | Evangeliet               | Spec complete |
| F020 | Brand Visual Identity    | Spec complete |
| F023 | Pay Fine (MobilePay Box) | Spec complete |
| F024 | Balance Tracking Per Season | Spec complete |
| F025 | PWA Install Prompt       | Spec complete |
| F026 | Member Fine Rule Proposal | Spec complete |

---

## Development Philosophy

- **Spec-driven**: all features documented before implementation
- **Mobile-first**: designed for thumbs, not desktop
- **Social-first**: culture software, not accounting software
- **AI-friendly**: structured for GitHub Copilot, Claude, Cursor agents

---

## Documentation Hierarchy

To avoid rule drift, follow this precedence:

1. `constitution.md` (authoritative non-negotiable rules)
2. `.github/copilot-instructions.md` (global agent behavior)
3. `.github/instructions/*.instructions.md` (scoped implementation rules)
4. `docs/specs/**` (feature and domain specs)
5. `README.md` (onboarding and navigation)

If documents conflict, the higher-priority source wins.

---

## Documentation Guide

Use these docs by intent:

- `constitution.md`: Authoritative business logic, non-negotiable invariants, and developer workflow rules.
- `.github/copilot-instructions.md`: Global agent behavior and implementation policy.
- `.github/instructions/*.instructions.md`: Scoped implementation rules for specific paths.
- `docs/specs/**`: Domain and feature specs used to implement concrete features.

README is intentionally brief and onboarding-focused.
