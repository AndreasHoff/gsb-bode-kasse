# Patchnoter — GSB Bødekasse

Udviklerfokuseret ændringslog. Opdater denne fil og bump versionen i `package.json` som del af ethvert ship.

---

## v0.5.2 — 2026-05-17

**Fix: Login-flow og Firestore opsætning**

- Firestore-regler forenklet til "alle autentificerede brugere" (tightes før produktion)
- Super-admin kan nu logge ind uden holdmedlemskab og tilgå Idéforslag-sektionen
- Visningsnavn i header hentes nu fra Firestore-profilen (ikke Firebase Auth)
- Racecondition i registreringsflow rettet: navn gemmes korrekt via `pendingNameRef`
- Firestore composite index tilføjet for membership-collectionGroup-forespørgsel
- Dev-server port sat til 3000

---

## v0.5.1 — 2026-05-16

**Fix: Infrastruktur og login-oprydning**

- Fjernet Google-login — appen bruger udelukkende e-mail/adgangskode
- Dev-server kører nu på port 3000
- Tilføjet `firestore.indexes.json` med composite index for membership-forespørgsler (rettede generisk login-fejl for nye brugere)
- `firebase.json` opdateret til at referere index-filen

---

## v0.5.0 — 2026-05-16

**Feature: Idéforslag — opret GitHub-issues direkte fra appen**

- Ny sektion „Idéforslag“ i navigationen (kun synlig for super-admin)
- Super-admin kan oprette, redigere og følge forslag gennem livscyklus: Ny → Under vurdering → Planlagt → Implementeret → Færdig
- Manuelt „Eksporten til GitHub“-knap opretter et GitHub-issue via Firebase Cloud Function (PAT opbevares som Firebase Secret)
- Forslag med status `done`, `implemented` eller `abandoned` er låst for redigering
- Godkend-knap tilgængelig når status er `implemented`
- Tilføjet `isSuperAdmin?: boolean` til `User`-domænetypen og Firestore-konverter
- Tilføjet `canManageProposals()` til `permissions.ts`
- Firestore-regler låser `featureProposals`-kollektionen til kun super-admin
- Oprettet `firebase.json` og `functions/` med TypeScript Cloud Function til GitHub API-kald
- Opdateret `.github/ISSUE_TEMPLATE/copilot-feature-request.md` til Firebase-arkitektur

---

## v0.4.2 — 2026-05-14

**Fix: Firebase konfiguration på GitHub Pages**

- Opdateret `.github/workflows/deploy.yml` så Firebase `VITE_`-variabler injiceres fra GitHub Secrets under build
- Tilføjet valideringsstep i deploy-workflow, der fejler tydeligt hvis en nødvendig Firebase-variabel mangler
- Tilføjet runtime-validering i `src/lib/firebase.ts` med en klar fejlbesked ved manglende konfiguration
- Opdateret `README.md` med krav til `.env.local` samt nødvendige GitHub Secrets for Pages deploy

---

## v0.4.1 — 2026-05-14

**Refaktorering: generel Firestore-sikkerhedsmodel (admin-write baseline)**

- Opdateret `firestore.rules` til en mere generel model: holdmedlemmer har læseadgang, mens skrivning er begrænset til admins
- Fjernet detaljerede rolle-specifikke skriveregler i Firestore (captain/treasurer carve-outs) for at holde reglerne enklere i v1
- Beholdt `activityLog` som append-only (`create` tilladt for admin, `update/delete` blokeret)
- Opdateret `src/lib/permissions.ts`, så alle muterende handlinger følger admin-only baseline
- Opdateret `README.md` med tydelig note om nuværende implementeringspolitik samt justeret rolle-matrix
- Opdateret `.github/copilot-instructions.md`, så agent-instruktioner matcher den nye baseline

---

## v0.4.0 — 2026-05-14

**Automatisk deployment til GitHub Pages**

- Tilføjet GitHub Actions workflow til automatisk build og deploy til GitHub Pages ved push til `main`
- Workflow bruger eksisterende build-flow via `npm run build` og publicerer `dist` som Pages artifact
- Opdateret `vite.config.ts` med dynamisk `base` til GitHub Pages (`/<repo>/`) under Actions, så assets loader korrekt i produktion
- Bevarer lokal udvikling uændret med `base: /` udenfor GitHub Actions

---

## v0.3.2 — 2026-05-10

**UI-forbedring: globale semantiske stilklasser**

- Tilføjet globale UI-klasser i `src/index.css` for app-shell, sider, kort, formularfelter, knapper og bundnavigation
- Refaktoreret `src/App.tsx` til at bruge de nye semantiske stilklasser i stedet for spredte farve-utility-klasser
- Refaktoreret `src/features/auth/WelcomeAuth.tsx` til fælles styling for segmentknapper, felter og primære/sekundære handlinger
- Opdateret placeholder-skærme i `overview`, `personal`, `activity` og `fines` til at bruge fælles titel-, subtitle- og empty-state-klasser
- Gør fremtidige feature-skærme hurtigere at bygge med konsistent mobil-first styling og knapadfærd

---

## v0.3.1 — 2026-05-10

**UI-forbedring: fælles farveskema og læsbare knapper**

- Erstattet Vite-standard CSS med et fælles farvesystem via CSS-variabler i `src/index.css`
- Fjernet globale sort-på-sort knapstile og indført tilgængelige standard-knapper med tydelig kontrast
- Opdateret app-shell (`src/App.tsx`) til den nye palette for header, bundnavigation og status-skærme
- Justeret placeholder-skærme i `overview`, `personal` og `activity` til konsistente tekst- og overfladefarver
- Tilføjet mere harmonisk baggrund med subtile gradientflader til mobiloplevelsen

---

## v0.3.0 — 2026-05-10

**F008: Velkomstside + register/login for holdmedlemmer**

- Tilføjet ny feature-spec: `docs/specs/features/F008-member-welcome-auth.md`
- Tilføjet mobil-first velkomstskærm med login/registrering i `src/features/auth/WelcomeAuth.tsx`
- Implementeret e-mail/adgangskode-login og registrering i `src/lib/auth.ts`
- Beholdt Google-login som alternativ login-metode
- Tilføjet Firestore-hjælper til automatisk oprettelse af brugerprofil (`users/{uid}`)
- Tilføjet opslag af aktive medlemskaber for bruger via collection group query
- Opdateret `src/App.tsx` med auth-gate, no-membership-tilstand og logout
- Forstærket app-shell med maks bredde på 430px i auth- og hovedflow

---

## v0.2.1 — 2026-05-10

**Instruktionsopdatering: mobil-first krav gjort eksplicit**

- Opdateret `.github/copilot-instructions.md` med et eksplicit krav om mobil-first UI
- Fastlagt krav om design og verifikation ved maks viewport-bredde på 430px
- Tilføjet regel om at primært app-indhold skal forblive begrænset til mobilbredde på større skærme, medmindre en feature-spec siger andet
- Opdateret `.github/instructions/feature-development.instructions.md` med en dedikeret sektion for mobil-first implementering

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
