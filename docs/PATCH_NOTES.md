# Patchnoter — GSB Bødekasse

Udviklerfokuseret ændringslog. Opdater denne fil og bump versionen i `package.json` som del af ethvert ship.

---

## v0.12.2 — 2026-05-24

**Feature: Evangeliet (F010)**

- Fanen "Bøder" er omdøbt til "Evangeliet" i bundnavigationen og sidemenuen
- Evangeliet-siden har fået en skriftrulle-inspireret læsevisning med fulde forklaringer for hver bøde
- Admins og super-admins kan fortsat oprette, redigere og slette opslag direkte fra Evangeliet
- Formulartekster er opdateret, så redigering af bøderegler passer til Evangeliet-oplevelsen

---

## v0.12.1 — 2026-05-24

**Fix: Profil-flow robusthed og performance (F012)**

- Profilsiden henter nu kun bøder tildelt den aktive bruger via dedikeret Firestore-query i stedet for hele holdets bødeliste
- Ved fejl i betalingsoversigt nulstilles visningen til 0 kr. og der vises nu en "Prøv igen"-knap til genindlæsning
- "Betal nu" er nu eksplicit deaktiveret når holdets MobilePay-modtager mangler, med forklarende fejltekst til brugeren
- MobilePay fallback er gjort mere robust: web-fallback åbnes kun hvis appen ikke åbner, og sker i samme fane
- Profil-opdatering er gjort robust mod manglende bruger-dokument ved merge-write i Firestore

---

## v0.12.0 — 2026-05-24

**Feature: Brugerprofil (F012)**

- Nyt menupunkt "Profil" (🪪) er tilføjet i venstre sidemenu for alle indloggede brugere
- Profilsiden viser en personlig oversigt med avatar-initialer, brugernavn og e-mail
- E-mail-feltet er skrivebeskyttet (disabled) og kan ikke ændres
- Brugernavn er et redigerbart tekstfelt; ændringer gemmes direkte til Firestore ved tryk på "Gem"
- Finansiel oversigt med to kort: "Indbetalt i alt" (godkendte betalinger) og "Udestående" (ubetalte/afventende betalinger)
- "Betal nu"-knap åbner MobilePay deep link med samlet udestående beløb; deaktiveret ved 0 kr. udestående
- Siden følger appens grøn/violet farvetema og er fuldt responsiv på 430px

---

## v0.11.4 — 2026-05-24

**UI: Historik-layout med faner**

- Fanen "Aktivitet" er omdøbt til "Historik" i navigationen
- Historik-siden har nu tre filtre under top-navbaren: "Alle", "Bøder" og "Betalinger"
- Aktivt filter markeres med tema-farvet underline/outline for tydelig visuel status
- Tom-tilstandstekst skifter nu efter valgt historikfilter

---

## v0.11.3 — 2026-05-24

**Fix: superAdmin adgang til bøder + automatisk holdtilknytning til GSB**

- Rettighedstjek for bøder er justeret, så både `admin` og `isSuperAdmin` kan oprette, redigere og slette bøder
- SuperAdmin uden eksplicit teamrolle får nu stadig adgang via null-sikre permissions i bødeflowet
- Ved login oprettes medlemskab automatisk på holdet `GSB` for brugere uden aktivt medlemskab (single-team model)
- Eksisterende brugere er backfill'et til `GSB`, så bøde-fanen ikke længere rammer tilstanden "Intet hold valgt"
- Agent-instruktioner er opdateret med obligatorisk `git pull origin main` før implementering og Playwright screenshot-evidens ved visuelle ændringer

---

## v0.11.2 — 2026-05-23

**Fix: CRUD-flow for bøder matcher admin/superAdmin behov**

- Admins og superAdmins kan nu redigere bøder via redigeringsikonet i fanen "Bøder"
- Redigeringsvisningen har nu en tydelig rød skraldespandsknap til at slette (deaktivere) en bøde
- Formularen bruger nu feltnavnet "Navn" for bøden, mens "Beløb" fortsat er et påkrævet numerisk felt
- F010-spec er opdateret, så flowet beskriver sletning fra redigeringsvisningen og adgang for superAdmins

---

## v0.11.1 — 2026-05-23

**Fix: Cloud Functions deploy bygger ikke dobbelt lokalt**

- `deploy:functions:safe` genbruger nu det eksisterende deploy-flow i stedet for at bygge functions lokalt to gange
- Bevarer Firebase `predeploy`-builden som eneste lokale build-trin før upload
- Reducerer unødvendig lokal ventetid ved deploy af Cloud Functions

---

## v0.11.0 — 2026-05-23

**Refaktor: forenklet rollemodel + dokumentation i sync**

- Kanonisk team-rollemodel er forenklet til `member` og `admin`
- `isSuperAdmin` fastholdes som separat bruger-flag til scoped globale funktioner (idéforslag)
- Domænetyper, specs og agent-instruktioner er opdateret, så rollebeskrivelser er konsistente på tværs af repoet
- Tilføjet migrerings-callable i Cloud Functions til normalisering af legacy medlemsroller (`player/captain/treasurer` -> `member`)
- Firestore-regler er midlertidigt beholdt i den eksisterende, mindre stramme model indtil næste sikkerhedsiteration

---

## v0.10.2 — 2026-05-23

**UX Fix: Idéforslag starter på filteret "Ny"**

- I forslagsoverblikket er standardfilteret ændret fra `Alle` til `Ny`
- Gør det lettere at se nyligt oprettede idéer med det samme ved åbning af fanen

---

## v0.10.1 — 2026-05-23

**Feature: Mine som startfane + GitHub Project automation + deploy scripts**

- Appen starter nu i fanen "Mine" ved login, så brugeren lander direkte på personlig visning
- Ved eksport af idéforslag til GitHub tilføjes issue automatisk til GitHub Project `AndreasHoff/projects/5`
- Nyoprettede issue-items sættes automatisk til status `Todo` i project-feltet `Status`
- Tilføjet root scripts til Cloud Functions-workflow:
	- `build:functions`
	- `deploy:functions`
	- `deploy:functions:safe` (byg først, deploy derefter)

---

## v0.10.0 — 2026-05-23

**Feature: Hold-fane viser alle medlemmer + opdateret bundnavigation**

- Hold-fanen henter nu alle brugere fra Firebase (`users`) og viser dem som medlemmer i en sorteret liste
- Tilføjet loading-, fejl- og tom tilstand i Hold-visningen for mere robust datahåndtering
- Firestore data layer udvidet med `getUsers()` og eksporteret via `src/lib/firestore/index.ts`
- Bundnavigationen er udtrukket til en separat komponent: `BottomNavbar`
- CSS-navngivning opdateret fra `app-nav` til `bottom-navbar` for tydeligere struktur
- Bundnavigationen er gjort fuld bredde uden kantlinje og uden border radius

---

## v0.9.2 — 2026-05-22

**UI Fix: Tydelig låst tilstand på forslagshandlinger**

- Forbedret disabled-styling globalt for knapper (mindre saturation, tydeligere gråtoning, ingen aktiv klik-effekt)
- Eksport-knappen i forslagdetaljer er nu tydeligere låst visuelt ved manglende adgang
- Status-kortet i forslagdetaljer tones tydeligere ned ved manglende adgang
- Tilføjet "Låst" badge ved statusfeltet, når brugeren ikke har rettighed til at ændre status

---

## v0.9.1 — 2026-05-22

**Fix: Login-fejl pga. Firestore-regler**

- Tilføjet eksplicit Firestore-regel for `members` collection group, så session sync kan læse aktive medlemskaber ved login
- Login-fejl vises nu med mere konkret Firebase-fejltekst i frontend og logges også i konsollen under fejlsøgning
- Firestore-regler deployet igen efter rettelsen

---

## v0.9.0 — 2026-05-22

**Feature + Sikkerhed: Stram adgang på idéforslag + visning af forslagsopretter**

- Statusændringer og godkendelse af idéforslag flyttet til Firebase Cloud Functions med server-side adgangstjek
- GitHub-eksport låst til den specifikke bruger `mchoffn@hotmail.com` (både i UI og backend)
- Firestore-regler opdateret, så beskyttede proposal-felter ikke kan ændres uden korrekt adgang
- Tilføjet nye functions: `updateProposalStatus` og `approveProposal`
- Tilføjet `creatorId` og `creatorName` på `FeatureProposal`
- Ved oprettelse af forslag hentes skaberens navn fra brugerprofil (`users.name`) og gemmes på forslaget
- Opretternavn vises nu i forslagets kort i listevisning samt i detaljevisning ved siden af oprettelsestidspunkt
- Domænedokumentation for `FeatureProposal` tilføjet i `docs/specs/domain/entities.md`

---

## v0.8.0 — 2026-05-21

**Feature: Skift farvetema i hele appen**

- Tilføjet temaknap (`🎨`) i navbaren, så brugeren kan skifte mellem grønt og violet tema
- Farveskiftet påvirker hele appen via globale CSS-variabler (`:root[data-theme="violet"]`)
- Valgt tema gemmes i browserens localStorage og bevares ved genindlæsning

---

## v0.7.0 — 2026-05-21

**Feature: Bødekatalog — ny "Bøder"-fane i bundnavigationen**

- Fanen "Giv bøde" er erstattet af "Bøder" i bundnavigationen
- Alle holdmedlemmer kan se en liste over holdets aktive bødetyper med emoji, navn og beløb
- Admins kan oprette nye bødetyper (titel, beløb, emoji, beskrivelse)
- Admins kan redigere eksisterende bødetyper
- Admins kan deaktivere bødetyper (de fjernes fra listen)
- `App.tsx` udvides med `teamId`, `userRole` og `userId`-state, som populeres fra brugerens holdmedlemskab
- Ny spec: `docs/specs/features/F010-fine-rules-catalog.md`

---

## v0.6.2 — 2026-05-21

**Fix: Eksplicit flex-layout i bundnavigation**

- Tilføjet eksplicit `display: flex` på `.app-nav__button`, så emoji + label altid stables korrekt i kolonne-layout
- Ingen funktionsændring i navigation; justeringen gør layout-intentionen tydelig og robust i CSS

---

## v0.6.1 — 2026-05-21

**Fix: Bundnavigation tilbage sammen med sidemenu**

- Gendannet de 4 faste tabs i bunden (Hold, Mine, Giv bøde, Aktivitet), så de vises samtidig med venstre sidemenu
- Justeret bundnavigationen, så den ligger en smule over nederste kant på mobil
- Tilføjet sideafstand i bundnavigationen, så yderste tabs ikke ligger helt op ad skærmkanterne

---

## v0.6.0 — 2026-05-20

**Feature: Navbar med venstre sidemenu**

- Topsektionen er lavet om til en navbar med burger-menu til venstre, app-navn i midten og bruger + logout til højre
- Tilføjet foldbar venstre sidemenu med overlay, der kan åbnes/lukkes via burger-knappen
- Primær navigation er flyttet ind i sidemenuen med adminpunkter for super-admin (Idéforslag + Indstillinger)
- Versionslabel i navbaren læses nu automatisk fra nyeste versionslinje i `docs/PATCH_NOTES.md`

---

## v0.5.5 — 2026-05-21

**Fix: Header-knapper afstand**

- Tilføjet dedikeret CSS-layout klasse `.app-header__actions` med eksplicit gap for sikret spacing mellem Idéforslag og Log ud-knapper
- Samme mønster som filter-pills: utility-only gap erstattet med konkret CSS-regel

---

## v0.5.4 — 2026-05-20

**UI: Refinement af Idéforslag-layout**

- Øget vertikal afstand mellem elementer i forslags-hero-området for mindre klammert udseende
- Redesignet status-kontrolelement med horisontalt layout (label på venstre side, dropdown på højre)
- Optimeret typografi og kortkomplethed i oversigten: mindre font-size og tightere paddings
- Øget spacing mellem filter-pills med dedikeret CSS-layout klasse for garanteret synlighed
- Refineret padding/margin på kort-komponenter for bedre andel

---

## v0.5.3 — 2026-05-19

**Fix: Stabil GitHub-eksport fra Idéforslag**

- Rettet `GITHUB_REPO`-secret til korrekt repository-slug, så eksport ikke længere fejler med GitHub API 404
- Eksport-flow valideret end-to-end fra app til Cloud Function i `europe-west1`
- GitHub-metadata (inkl. `githubIssueNumber`) bevares i `featureProposals` efter succesfuld eksport for bedre sporbarhed

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
