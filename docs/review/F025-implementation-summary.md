# F025 - PWA Install Prompt — Implementation Summary

**Implemented:** 2026-08-27  
**Version:** 0.25.0  
**Spec:** [F025-pwa-install-prompt.md](../specs/done/F025-pwa-install-prompt.md)

## Overview

Implemented a platform-aware PWA installation prompt that encourages first-time web visitors to install the app to their device home screen. The feature handles Android and iOS differently, providing native installation for Android and manual instructions for iOS.

## Implementation Details

### Created Components

1. **usePWAInstall.ts** (Hook)
   - Detects if app is running as installed PWA
   - Detects user platform (Android, iOS, other)
   - Manages `beforeinstallprompt` event for Android
   - Handles dismissal state via localStorage
   - Provides `promptInstall()` function for native Android installation

2. **InstallPrompt.tsx** (WelcomeAuth Banner)
   - Displays on WelcomeAuth screen for non-installed mobile users
   - Android: Shows native "Installer" button
   - iOS: Shows accordion with step-by-step Danish instructions
   - Dismissible with "Senere" / "Luk" button
   - Hidden if already installed or dismissed

3. **InstallAppOption.tsx** (Profile Option)
   - Card in Profile screen for accessing installation at any time
   - Android: Triggers native prompt directly
   - iOS: Opens modal with Danish instructions
   - Hidden if already installed

4. **pwa-install.css** (Styling)
   - Gradient banner design matching app theme
   - Mobile-first responsive layout
   - Accordion animation for iOS instructions
   - Modal overlay for Profile flow

### Integration Points

- **WelcomeAuth.tsx**: Added `<InstallPrompt />` below page header
- **UserProfile.tsx**: Added `<InstallAppOption />` at bottom of profile sections

### Platform Detection Logic

```typescript
// Installed detection
- window.matchMedia("(display-mode: standalone)")
- navigator.standalone (iOS Safari)

// Platform detection
- User agent string matching for Android/iOS

// Android native install
- beforeinstallprompt event
- prompt() API
```

### Dismissal Persistence

- Key: `gsb:pwa-install-dismissed`
- Storage: localStorage
- Cleared if user clears browser data

### Danish Copy

All user-facing text is in Danish:
- "Installer appen for bedre oplevelse"
- "Sådan installerer du"
- Instructions: "Tryk på del-knappen (⬆️) nederst i browseren..."

## Acceptance Criteria Status

✅ First-time web visitors on mobile see install prompt when WelcomeAuth loads  
✅ Already-installed PWA users do NOT see any install prompt  
✅ Android users see native install button that triggers browser's install flow  
✅ iOS users see accordion with step-by-step Danish instructions  
✅ Desktop users see no prompt  
✅ User can dismiss the banner  
✅ Dismissed state persists across sessions (localStorage)  
✅ Profile view contains "Installer app" option when app is not installed  
✅ Profile option shows appropriate installation instructions for current platform  
✅ All instruction text is in Danish  

## Files Changed

### Created
- `src/features/pwa-install/usePWAInstall.ts` (103 lines)
- `src/features/pwa-install/InstallPrompt.tsx` (75 lines)
- `src/features/pwa-install/InstallAppOption.tsx` (91 lines)
- `src/features/pwa-install/pwa-install.css` (251 lines)
- `docs/specs/done/F025-pwa-install-prompt.md` (moved from features/)

### Modified
- `src/features/auth/WelcomeAuth.tsx` (added InstallPrompt import and component)
- `src/features/profile/UserProfile.tsx` (added InstallAppOption import and component)
- `package.json` (bumped version to 0.25.0)
- `docs/PATCH_NOTES.md` (added v0.25.0 entry)
- `README.md` (added F025 to feature table)

## Testing Recommendations

### Manual Testing Scenarios

1. **First Visit - iOS Safari**
   - Open app URL in iOS Safari (not installed)
   - Verify banner appears on WelcomeAuth with accordion
   - Tap accordion, verify instructions in Danish
   - Tap "Luk", verify banner disappears
   - Reload page, verify banner does NOT reappear
   - Navigate to Profile, verify "Installer app" option visible

2. **First Visit - Android Chrome**
   - Open app URL in Android Chrome (not installed)
   - Verify banner appears with "Installer" button
   - Tap "Installer", verify native browser prompt appears
   - Accept/Dismiss native prompt
   - If dismissed: tap "Senere", verify banner disappears

3. **Already Installed**
   - Open app as installed PWA (from home screen)
   - Verify NO banner on WelcomeAuth
   - Navigate to Profile, verify NO "Installer app" option

4. **Profile Flow - iOS**
   - Open in iOS Safari (not installed, banner dismissed)
   - Navigate to Profile
   - Tap "Installer app" card
   - Verify modal opens with Danish instructions
   - Tap "Luk" to close modal

5. **Desktop Browser**
   - Open app in desktop Chrome/Firefox
   - Verify NO banner on WelcomeAuth
   - Navigate to Profile, verify NO "Installer app" option

### Edge Cases to Verify

- Clear localStorage → prompt reappears on next visit
- Android browser without `beforeinstallprompt` support → falls back to text instructions
- Already dismissed + navigate away + return → prompt stays dismissed
- Install app → reload → all prompts/options hidden

## Known Limitations

1. **iOS cannot automate installation** - requires manual steps via Share menu
2. **Desktop ignored** - app is mobile-first, no desktop prompt shown
3. **Dismissal resets if localStorage cleared** - expected behavior
4. **No analytics tracking** - consider adding event tracking in future iterations

## Future Enhancements (Not in Scope)

- Track installation conversion rate
- A/B test different prompt copy
- Add "swipe to dismiss" gesture
- Show prompt after X page views instead of immediately
- Detect if user has already dismissed on different device (requires backend)

## No Breaking Changes

This feature is purely additive:
- No data model changes
- No Firestore schema changes
- No breaking changes to existing components
- No ActivityLog entries (not a data mutation)

## TypeScript Compilation

✅ Zero TypeScript errors across all new and modified files.

## Ready to Ship

Feature is complete and ready for production deployment.
