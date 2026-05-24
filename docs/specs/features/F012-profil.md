# F012 - Brugerprofil

## Problem

En bruger har ingen steder at se sine egne oplysninger, sit samlede bødebeløb eller sine udestående betalinger. Der er heller ingen måde at opdatere sit brugernavn uden at kontakte en admin.

## Goal

Give brugeren en profilside, der viser personlige oplysninger, en finansiel oversigt over bøder og en hurtig vej til at betale udestående via MobilePay.

## Actors

- Medlem (alle indloggede brugere)

## Preconditions

- Brugeren er indlogget og har et aktivt holdmedlemskab.

## Flow

1. Bruger trykker på hamburger-menuen (☰) i øverste venstre hjørne.
2. Systemet åbner venstre sidemenu med menupunkterne.
3. Bruger vælger "Profil" i menuen.
4. Systemet navigerer til profilvisningen og henter brugerens data:
   - Brugernavn (fra Firestore user-dokument)
   - E-mail (fra Firestore user-dokument)
   - Betalingsoversigt (godkendte og udestående beløb) fra payments-kollektionen
5. Systemet viser profilvisningen med:
   - E-mail (skrivebeskyttet felt)
   - Brugernavn (redigerbart tekstfelt med gem-knap)
   - Kort med totalt godkendt beløb ("Indbetalt i alt")
   - Kort med udestående beløb ("Udestående")
   - "Betal nu"-knap (åbner MobilePay med udestående beløb)
6. Bruger kan redigere brugernavnet og trykke "Gem" for at gemme ændringen.
7. Systemet opdaterer brugerprofilen i Firestore og viser en bekræftelse.
8. Bruger kan trykke "Betal nu" for at åbne MobilePay med det samlede udestående beløb.

## Edge Cases

- Brugeren har ingen bøder: Vis 0 kr. i begge kort, deaktiver "Betal nu".
- Brugeren har ingen udestående: Vis 0 kr. for udestående, deaktiver "Betal nu".
- Holdet har ingen MobilePay-modtager konfigureret: Deaktiver "Betal nu" og vis forklaringstekst.
- Fejl ved gemning af brugernavn: Vis en fejlmeddelelse under navnefeltet.
- Fejl ved hentning af data: Vis fejlbesked og mulighed for at prøve igen.
- Tom navne-input: Tillad ikke gemning med tomt navn.

## Acceptance Criteria

- "Profil" er synligt i venstre sidemenu for alle indloggede brugere med aktivt holdmedlemskab.
- E-mail-feltet er disabled og kan ikke redigeres.
- Brugernavn er redigerbart og gemmes ved tryk på "Gem"-knap.
- Siden viser korrekt indbetalt og udestående beløb baseret på brugerens betalinger.
- "Betal nu"-knap åbner MobilePay deep link med korrekt beløb og modtager, og bruger web-fallback i samme fane hvis appen ikke åbner.
- "Betal nu"-knap er deaktiveret når udestående beløb er 0.
- "Betal nu"-knap er deaktiveret når holdets MobilePay-modtager mangler, og brugeren ser en forklaring.
- Siden er fuldt funktionel på 430px viewport-bredde.
- Siden benytter appens eksisterende farvetema (grøn/violet).
