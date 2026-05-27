# F013 - Evangeliet

## Problem

Holdmedlemmer mangler et samlet, læsevenligt sted i appen, hvor de kan bladre igennem holdets bøderegler og forklaringer uden at skulle ind i administrations­visningen.

## Goal

Alle holdmedlemmer kan læse holdets aktive bøderegler og forklaringer i en skriftrulle-inspireret "Evangeliet"-visning.

## Actors

- Member (læseadgang)
- Admin (læseadgang — redigering sker i "Bøder"-fanen)

## Preconditions

- Brugeren er logget ind og har et aktivt holdmedlemskab.
- Teamet eksisterer i Firestore.

## Flow

1. Brugeren trykker på "Evangeliet"-fanen i bundnavigationen.
2. Systemet henter alle aktive `FineRule`-dokumenter for teamet fra Firestore.
3. Systemet viser en skriftrulle-inspireret visning med § nummer, emoji, titel, beløb og fuld forklaring for hver bødetype.

## Edge Cases

- Ingen aktive bødetyper: Systemet viser et tomt-tilstand-budskab med besked om at bødetyper oprettes under "Bøder"-fanen.
- Firestore-fejl: Systemet viser en fejlbesked.
- Intet hold valgt: Systemet viser en tom tilstand med besked om at intet hold er valgt.

## Acceptance Criteria

- Bundnavigationen viser fanen "Evangeliet" (📜) separat fra "Bøder"-fanen.
- Alle teammedlemmer kan se listen over aktive bødetyper i skriftrulle-visningen.
- Hvert opslag viser § nummer, emoji (hvis angivet), titel, beløb og fuld forklaring.
- Ingen admin-kontrolelementer (opret/rediger-knapper) er synlige — visningen er udelukkende til læsning.
- Eksisterende "Bøder"-fane med fuld CRUD er uberørt.
