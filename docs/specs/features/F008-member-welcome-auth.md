# F008 - Member Welcome, Register & Login

## Problem
Nye og eksisterende spillere mangler en tydelig indgang til appen, og der er ingen samlet login/register-oplevelse før de møder bødeskærmene.

## Goal
Give medlemmer en mobil-first velkomstside med login og registrering, så de kan få adgang til appen via Firebase Auth.

## Actors
- Player
- Captain
- Treasurer
- Admin

## Preconditions
- Firebase Auth er konfigureret i miljøet.
- Brugeren har internetforbindelse.
- Brugeren kan logge ind via e-mail/adgangskode eller Google.

## Flow
1. System viser en velkomstside på mobil med valg mellem "Log ind" og "Opret konto".
2. Player vælger login-metode (e-mail/adgangskode eller Google).
3. System autentificerer brugeren via Firebase Auth.
4. System opretter en `users/{uid}` profil hvis den ikke findes.
5. System slår brugerens aktive medlemskaber op.
6. Hvis brugeren har et aktivt medlemskab, åbner systemet hovedappen.
7. Hvis brugeren ikke har et aktivt medlemskab, viser systemet en forklaring og beder brugeren kontakte en admin.

## Edge Cases
- Forkert e-mail eller adgangskode ved login.
- E-mail allerede i brug ved registrering.
- Svag adgangskode ved registrering.
- Login-popup lukkes før gennemførsel.
- Netværksfejl ved autentificering eller Firestore-opslag.
- Bruger er autentificeret men har ingen aktive medlemskaber.

## Acceptance Criteria
- Viser en dedikeret velkomstside før hovednavigationen for ikke-autentificerede brugere.
- Understøtter login med e-mail/adgangskode.
- Understøtter registrering med navn, e-mail og adgangskode.
- Understøtter login med Google.
- Opretter `User`-profil i Firestore ved første succesfulde login.
- Viser en tydelig besked hvis brugeren mangler aktivt holdmedlemskab.
- Bevarer mobil-first layout med maksimal appbredde på 430px.