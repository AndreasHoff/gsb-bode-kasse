# F025 - PWA Install Prompt

## Problem
Users visiting the web app for the first time don't know they can install it as a standalone PWA, missing out on a native-like experience with quick home screen access.

## Goal
Encourage first-time web visitors to install the application to their device home screen, with platform-appropriate installation flows.

## Actors
- Visitor (unauthenticated)
- Member (authenticated)

## Preconditions
- User is accessing the application via a web browser (not already installed as PWA)
- Application is loaded and ready

## Flow

### First Visit - Welcome Screen
1. User opens the application URL in a mobile browser
2. WelcomeAuth component loads
3. System detects whether app is running as installed PWA
4. If NOT installed: System checks platform (Android vs iOS/other)
5. **Android path**: System displays a dismissible banner with native install button
6. **iOS/other path**: System displays a dismissible banner with accordion containing installation instructions in Danish
7. User taps install button (Android) OR follows manual instructions (iOS)
8. User dismisses the banner
9. System stores dismissal preference locally
10. Banner does not appear again for that user/device

### Profile Access
1. User navigates to Profile view
2. System detects app installation status
3. If NOT installed: User sees "Installer app" option in Profile
4. User taps option
5. System displays installation instructions appropriate for platform
6. User follows instructions or closes dialog

## Edge Cases
- App already running as installed PWA → no prompt shown
- User dismisses banner on first visit → accessible later from Profile
- Android browser without BeforeInstallPrompt support → fallback to text instructions
- Desktop browser → no prompt (app designed for mobile)
- User clears browser data → dismissal preference lost, prompt may reappear
- Multiple visits without dismissing → prompt appears each time until dismissed or installed

## Acceptance Criteria
- First-time web visitors on mobile see install prompt when WelcomeAuth loads
- Already-installed PWA users do NOT see any install prompt
- Android users see native install button that triggers browser's install flow
- iOS users see accordion with step-by-step Danish instructions (3 dots → Del → Føj til hjemmeskærm)
- Desktop users see no prompt
- User can dismiss the banner
- Dismissed state persists across sessions (localStorage)
- Profile view contains "Installer app" option when app is not installed
- Profile option shows appropriate installation instructions for current platform
- All instruction text is in Danish
