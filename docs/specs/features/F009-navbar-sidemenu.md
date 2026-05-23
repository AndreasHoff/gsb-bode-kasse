# F009 - Navbar med venstre sidemenu

## Problem
Brugere mangler et tydeligt sted at finde appens sektioner, og super-admin mangler et sted at finde globale funktioner og fremtidige indstillinger. Den nuværende topsektion giver ikke plads til en udvidbar menu.

## Goal
Give brugeren en foldbar venstrestillet sidemenu via burger-menu samt en tydelig navbar med app-navn/version og brugerhandlinger.

## Actors
Member, Admin, Super-admin.

## Preconditions
- Brugeren er logget ind.
- Appen er i status `ready`.

## Flow
1. Systemet viser en navbar med burger-knap til venstre, app-navn og versionsnummer i midten og brugerinfo med logout til højre.
2. Brugeren trykker på burger-knappen.
3. Systemet åbner sidemenuen fra venstre side.
4. Brugeren vælger en menuhandling.
5. Systemet navigerer til valgt skærm og lukker sidemenuen.
6. Hvis brugeren er super-admin, viser systemet ekstra punkter for idéforslag og indstillinger i menuen.

## Edge Cases
- Hvis brugeren trykker udenfor menuen, lukkes sidemenuen.
- Hvis app-version ikke kan læses fra patch notes, vises fallback-version.
- Hvis en bruger ikke er super-admin, må punkterne for idéforslag og indstillinger ikke vises i menuen.
- Hvis netværk er ustabilt, skal menuens åbne/lukke-adfærd stadig virke lokalt.

## Acceptance Criteria
- Viser burger-knap i venstre side af navbaren.
- Åbner en venstre sidemenu ved klik på burger-knappen.
- Lukker sidemenuen ved klik på overlay eller valg af menupunkt.
- Viser `GSB Bødekasse` og den nyeste `vX.Y.Z` fra `docs/PATCH_NOTES.md` i navbarens midte.
- Viser indlogget brugers navn og `Log ud`-knap i højre side af navbaren.
- Viser super-admin-specifikke menupunkter kun for super-admin-brugere.
