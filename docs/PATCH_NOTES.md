# Patch Notes — GSB Bødekasse

Developer-facing changelog. Update this file and bump `package.json` version as part of every ship.  
The in-app `RELEASES` array in `src/features/patch-notes/PatchNotes.tsx` must also be updated.

---

## v0.1.0 — 2026-05-09

**Initial scaffold**

- Vite 5 + React + TypeScript + TailwindCSS v4 project structure
- Domain types (`src/types/domain.ts`) — all core entities defined
- Permission helpers (`src/lib/permissions.ts`) — role-based access functions
- Utility functions (`src/lib/utils.ts`) — MobilePay deep-link, DKK formatter, relative timestamps
- App shell with mobile-first bottom tab navigation (4 tabs)
- Feature placeholder components for all 4 screens
- Feature specs F001–F007 covering all planned functionality
- Domain entity spec and flow diagrams
- GitHub Copilot agents: spec-writer, feature-implementer, review, firebase-scaffolder
- GitHub Copilot instructions: domain-types, feature-development, spec-writing
- In-app patch notes system (this file + version badge in app header)
