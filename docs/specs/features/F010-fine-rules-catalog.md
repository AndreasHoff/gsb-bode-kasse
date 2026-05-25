# F010 - Bødekatalog

## Problem

Holdmedlemmer har ingen oversigt over, hvilke bøder der eksisterer og hvad de koster. Admins har heller ingen selvbetjeningsvisning til at administrere bødetyperne.

## Goal

Alle teammedlemmer kan se en liste over holdets aktive bødetyper. Admins og superAdmins kan oprette, redigere og slette bødetyper direkte i appen.

## Actors

- Member (læseadgang)
- Admin (fuld CRUD-adgang)
- Super-admin (fuld CRUD-adgang)

## Preconditions

- Brugeren er logget ind og har et aktivt holdmedlemskab.
- Teamet eksisterer i Firestore.

## Flow

1. Brugeren trykker på "Bøder"-fanen i bundnavigationen.
2. Systemet henter alle aktive `FineRule`-dokumenter for teamet fra Firestore.
3. Systemet viser listen med emoji, titel og beløb for hver bødetype.
4. Hvis brugeren er admin eller super-admin, vises knapper til at oprette og redigere bødetyper.

**Opret ny bøde (admin/super-admin only):**

5. Admin eller super-admin trykker "+ Ny bøde".
6. Systemet viser en formular med felterne: Navn, Beløb, Emoji (valgfri), Beskrivelse (valgfri).
7. Admin eller super-admin udfylder formen og trykker "Gem".
8. Systemet gemmer den nye `FineRule` og en `rule.created` ActivityLog-entry atomisk i Firestore og viser den opdaterede liste.

**Rediger bøde (admin/super-admin only):**

5. Admin eller super-admin trykker "Rediger" på en eksisterende bødetype.
6. Systemet viser formularen med de eksisterende værdier.
7. Admin eller super-admin ændrer felterne og trykker "Gem ændringer".
8. Systemet opdaterer `FineRule`-dokumentet og skriver en `rule.updated` ActivityLog-entry atomisk og viser den opdaterede liste.

**Slet bøde (admin/super-admin only):**

5. Admin eller super-admin trykker "Rediger" på en aktiv bødetype.
6. Systemet viser redigeringsvisningen med en rød skraldespandsknap.
7. Admin eller super-admin trykker på skraldespandsknappen.
8. Systemet sætter `isActive = false` og skriver en `rule.deactivated` ActivityLog-entry atomisk.
9. Den slettede bødetype skjules fra listen.

## Edge Cases

- Ingen aktive bødetyper: viser en "tom tilstand" med opfordring til admin om at oprette den første bøde.
- Firestore-fejl ved indlæsning: viser en fejlbesked.
- Firestore-fejl ved gem: viser inline fejlbesked i formen.
- Brugeren er superAdmin uden holdmedlemskab: komponenten viser "Intet hold valgt".
- Tomme eller ugyldige formularfelter: gem-knappen er deaktiveret / server afviser.

## Acceptance Criteria

- Bundnavigationen viser "Bøder"-fanen i stedet for "Giv bøde".
- Alle teammedlemmer kan se listen over aktive bødetyper.
- Listen viser emoji (hvis angivet), navn og beløb (formateret med `formatAmount()`).
- Admins og super-admins ser "+ Ny bøde"-knap øverst og redigeringsikon på hver bøde.
- Ikke-admins ser ingen admin-kontrolelementer og kan ikke nå opret/rediger-formularen.
- Admin kan oprette en ny bøde med mindst navn og beløb; `rule.created` ActivityLog-entry oprettes atomisk.
- Admin kan redigere navn, beløb, emoji og beskrivelse på en eksisterende bøde; `rule.updated` ActivityLog-entry oprettes atomisk.
- Admin eller super-admin kan slette en bøde fra redigeringsvisningen; den fjernes fra listen umiddelbart efter; `rule.deactivated` ActivityLog-entry oprettes atomisk.
- Tomt stadie vises korrekt, når der ikke er aktive bøder.
- Fejltilstand (Firestore load/write) vises inline; fejl ryddes ved ny indlæsning.
- Ingen fejl ved TypeScript-kompilering.
