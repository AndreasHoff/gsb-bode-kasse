# Patchnoter — GSB Bødekasse

Udviklerfokuseret ændringslog. Opdater denne fil og bump versionen i `package.json` som del af ethvert ship.

---

## v0.1.0 — 2026-05-09

**Indledende projektstruktur**

- Vite 5 + React + TypeScript + TailwindCSS v4 projektopsætning
- Domænetyper (`src/types/domain.ts`) — alle centrale entiteter defineret
- Tilladelseshjælpere (`src/lib/permissions.ts`) — rollebaserede adgangsfunktioner
- Hjælpefunktioner (`src/lib/utils.ts`) — MobilePay deep-link, DKK-formattering, relative tidsstempler
- App-skal med mobil-first bundnavigation (4 faner)
- Placeholder-komponenter for alle 4 skærme
- Feature-specifikationer F001–F007 for al planlagt funktionalitet
- Domæneentitetspec og flowdiagrammer
- GitHub Copilot-agenter: spec-writer, feature-implementer, review, firebase-scaffolder
- GitHub Copilot-instruktioner: domain-types, feature-development, spec-writing
- Patchnote-proces oprettet (denne fil)
