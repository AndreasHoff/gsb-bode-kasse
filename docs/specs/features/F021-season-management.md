# F021 - Season Management

## Problem
Admins have no way to create or close a season from within the app. The app shows "Ingen aktiv sæson — En admin skal oprette en sæson" but provides no UI to act on that, making fine assignment impossible for new clubs or after a season ends.

## Goal
Give admins full control over the season lifecycle: create a new season and end it when the year is done.

## Actors
- Admin (and Super-admin)

## Preconditions
- User is authenticated with admin role in the team.

## Flow

**Creating a season (no active season):**
1. Admin navigates to Indstillinger → Sæson.
2. System shows empty state: "Ingen aktiv sæson" with a season name input.
3. Admin enters a season name (e.g. "2026/2027") and clicks "Opret sæson".
4. System creates the season in Firestore with `isActive: true` and writes a `season.created` ActivityLog entry atomically.
5. System displays the active season card with name and start date.

**Ending a season (active season exists):**
1. Admin navigates to Indstillinger → Sæson.
2. System shows the active season info card (name, start date).
3. Admin clicks "Afslut sæson".
4. System shows an inline confirmation: "Er du sikker? Sæsonen kan ikke genåbnes bagefter."
5. Admin confirms by clicking "Ja, afslut sæson".
6. System sets `isActive: false` and `endDate: now`, writes a `season.closed` ActivityLog entry atomically.
7. System returns to empty state.

## Edge Cases
- Attempting to create a season when one already exists → the create form is not shown.
- Season name is blank → submit button is disabled.
- Network failure during create or close → error message shown, state unchanged.
- Non-admin accessing the settings tab → section not rendered (tab not visible in nav).

## Acceptance Criteria
- Admin can create a season with a non-empty name.
- Created season has `isActive: true` in Firestore.
- `season.created` ActivityLog entry is written atomically with the season document.
- Active season name and start date are displayed after creation.
- "Afslut sæson" button only visible when a season is active.
- Ending a season requires inline confirmation before Firestore is updated.
- Ended season has `isActive: false` and `endDate` set in Firestore.
- `season.closed` ActivityLog entry is written atomically.
- Submit button is disabled while a request is in flight.
- Fine assignment is unblocked once a season is active.
