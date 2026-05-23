# F011 - Skift farvetema

## Problem
Appens visuelle identitet er låst til ét grønt tema. Brugeren kan derfor ikke vælge en alternativ farvestemning, selv om appen bruges socialt og personligt.

## Goal
Giv brugeren mulighed for at skifte farvetema direkte i navbaren, så hele appens farver opdateres med det samme.

## Actors
Member, Admin, Super-admin.

## Preconditions
- Brugeren er logget ind og ser app-skallen med navbar.

## Flow
1. Systemet viser en temaknap i navbaren.
2. Brugeren trykker på temaknappen.
3. Systemet skifter til det alternative farvetema i hele appen.
4. Systemet gemmer valgt tema lokalt i browseren.
5. Ved næste indlæsning bruger systemet det sidst valgte tema.

## Edge Cases
- Hvis browseren ikke har et gemt tema, bruges standardtemaet (grønt).
- Hvis lagret temaværdi er ugyldig, falder systemet tilbage til standardtemaet.
- Hvis brugeren ikke er logget ind, vises ingen navbar-knap, men global styling må stadig forblive stabil.
- Hvis brugeren trykker hurtigt flere gange, skal temaet stadig toggles deterministisk uden fejl.

## Acceptance Criteria
- Viser en temaknap i navbaren.
- Skifter mellem mindst to harmoniske farvetemaer ved klik på knappen.
- Opdaterer farver globalt i appen (header, baggrund, kort, knapper og navigation) uden reload.
- Gemmer valgt tema i localStorage.
- Genindlæser appen med det sidst valgte tema.
