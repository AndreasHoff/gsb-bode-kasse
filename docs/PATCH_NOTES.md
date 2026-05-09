# Patchnoter — GSB Bødekasse

Udviklerfokuseret ændringslog. Opdater denne fil og bump versionen i `package.json` som del af ethvert ship.

---

## v0.2.1 — 2026-05-09

**Scaffolding-klarhed for næste udviklingsskridt**

- Tilføjet sektion i `README.md` med tydeligt svar på “kan vi bygge nu?”
- Dokumenteret hvad der allerede er på plads (domæne, flows, F001–F007)
- Tilføjet konkret readiness-checkliste for nye features (spec, edge cases, acceptance criteria, datamodel- og ActivityLog-afklaring)
- Dokumenteret anbefaling for backend-datamodel i scaffolding-fasen: brug nuværende model som v1-baseline og udvid feature-for-feature

---

## v0.2.0 — 2026-05-09

**Firebase-integration (scaffolding)**

- Installeret Firebase SDK (`firebase ^10.14.1`)
- Tilføjet `.env.local` med `VITE_`-prefixede konfigurationsvariabler
- Oprettet `src/lib/firebase.ts` — initialiserer Firebase app, eksporterer `db` og `auth`
- Oprettet `src/lib/auth.ts` — Google Sign-In, sign-out og auth state listener
- Oprettet `src/lib/firestore/converters.ts` — fuldt typede Firestore-konvertere for alle domæneentiteter (Timestamp ↔ ISO 8601)
- Oprettet `src/lib/firestore/refs.ts` — typede collection- og document-referencer
- Oprettet `src/lib/firestore/activityLog.ts` — `logActivity` hjælpefunktion
- Oprettet `src/lib/firestore/teams.ts`, `members.ts`, `seasons.ts`, `fineRules.ts`, `fines.ts`, `payments.ts` — dataadgangslag med atomare batch-skrivninger og ActivityLog-indgange for alle mutationer
- Oprettet `src/lib/firestore/index.ts` — re-eksporterer hele det offentlige API
- Oprettet `firestore.rules` — sikkerhedsregler der afspejler `src/lib/permissions.ts` præcist
- Membership-dokumenter bruger `userId` som Firestore-dokument-ID (muliggør `get()`-baseret rolleopslag i security rules)

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
