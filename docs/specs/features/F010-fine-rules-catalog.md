# F010 - Evangeliet

## Problem

Holdmedlemmer mangler et samlet sted i appen, hvor de kan læse holdets bøderegler og forklaringer i en behagelig, læsbar form. Admins mangler samtidig en enkel måde at vedligeholde indholdet direkte i appen.

## Goal

Alle teammedlemmer kan læse holdets aktive bøderegler og forklaringer i “Evangeliet”. Admins og super-admins kan oprette, redigere og slette opslag direkte i appen.

## Actors

- Member (læseadgang)
- Admin (fuld CRUD-adgang)
- Super-admin (fuld CRUD-adgang)

## Preconditions

- Brugeren er logget ind og har et aktivt holdmedlemskab.
- Teamet eksisterer i Firestore.

## Flow

1. Brugeren trykker på "Evangeliet"-fanen i bundnavigationen.
2. Systemet henter alle aktive `FineRule`-dokumenter for teamet fra Firestore.
3. Systemet viser en læsevenlig skriftrullevisning med titel, beløb og fuld forklaring for hver bødetype.
4. Hvis brugeren er admin eller super-admin, vises knapper til at oprette og redigere opslag i Evangeliet.

**Opret ny bøde (admin/super-admin only):**

5. Admin eller super-admin trykker "+ Nyt opslag".
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

- Bundnavigationen viser fanen "Evangeliet".
- Alle teammedlemmer kan se listen over aktive bødetyper.
- Listen viser emoji (hvis angivet), navn, beløb (formateret med `formatAmount()`) og fuld forklaring uden afkortning.
- Admins og super-admins ser "+ Nyt opslag"-knap øverst og redigeringsikon på hver bøde.
- Ikke-admins ser ingen admin-kontrolelementer og kan ikke nå opret/rediger-formularen.
- Admin kan oprette en ny bøde med mindst navn og beløb; `rule.created` ActivityLog-entry oprettes atomisk.
- Admin kan redigere navn, beløb, emoji og beskrivelse på en eksisterende bøde; `rule.updated` ActivityLog-entry oprettes atomisk.
- Admin eller super-admin kan slette en bøde fra redigeringsvisningen; den fjernes fra listen umiddelbart efter; `rule.deactivated` ActivityLog-entry oprettes atomisk.
- Tomt stadie vises korrekt, når der ikke er aktive bøder.
- Fejltilstand (Firestore load/write) vises inline; fejl ryddes ved ny indlæsning.
- Ingen fejl ved TypeScript-kompilering.
