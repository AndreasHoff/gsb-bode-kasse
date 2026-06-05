# F020 - Brand Visual Identity

## Problem
The app currently uses generic colors and styling that don't reflect Greve Badminton's brand identity, making the platform feel disconnected from the club's visual presence.

## Goal
Apply a consistent, professional color scheme aligned with Greve Badminton's brand colors across all UI elements while maintaining accessibility and the existing dark mode functionality.

## Actors
- **Member** — sees the updated visual identity in all features they access
- **Admin** — sees the updated visual identity in all features, including admin panels

## Preconditions
- App is running with existing light/dark theme toggle (F011)
- All current features are functional

## Flow
1. Developer defines CSS custom properties for brand color palette in `src/index.css`
2. Developer updates each feature's CSS to use custom properties instead of hardcoded colors
3. Developer updates shared components (`BottomNavbar`, `BulkOperationProgress`) to use new palette
4. Developer updates global styles (`App.css`, `index.css`) for consistent backgrounds and surfaces
5. System preserves dark mode theme as-is (no changes to dark mode colors in this iteration)
6. User opens the app and sees Greve Badminton brand colors in light mode
7. User toggles to dark mode and sees the existing dark theme unchanged

## Edge Cases
- **Contrast compliance** — all text/interactive elements must meet WCAG AA standards with new colors
- **Inconsistent styling** — some features may have inline styles or Tailwind classes that override CSS properties
- **Button variants** — primary, secondary, and danger buttons must remain visually distinct
- **Status colors** — success/warning/error states must remain clearly distinguishable from brand colors
- **Existing dark mode** — theme toggle must continue working without visual regressions
- **Mobile navigation** — bottom navbar active states must be clearly visible with new accent colors
- **Card shadows** — ensure card elevation remains visible on new background color

## Acceptance Criteria
- CSS custom properties defined in `src/index.css` for all brand colors (Primary Blue #005AA9, Secondary Blue #0077CC, Accent Gold #F2B705, Accent Gold Light #FFD447)
- CSS custom properties defined for neutral palette (Background #F8FAFC, Surface #FFFFFF, Text Primary #1F2937, Text Secondary #6B7280, Border #E5E7EB)
- All feature CSS files updated to use custom properties instead of hardcoded hex values
- Primary buttons use #005AA9 background with #FFFFFF text
- Secondary buttons use transparent background with #005AA9 border and text
- Navigation bar uses #005AA9 background with #FFFFFF text
- Active navigation items use #F2B705 accent color
- Cards use #FFFFFF background with #E5E7EB borders and 12px border radius
- Status indicators maintain distinct colors (success #22C55E, warning #F59E0B, error #EF4444, info #0077CC)
- All text elements meet WCAG AA contrast requirements (4.5:1 for normal text, 3:1 for large text)
- Dark mode toggle continues to function without visual regressions
- BottomNavbar reflects new brand colors with clear active state
- Team overview cards use new surface color and border styling
- Fine assignment buttons use primary brand color
- Payment approval interface reflects admin-appropriate brand styling
- No breaking visual changes on mobile viewports (430px width validation)
- Visual regression testing confirms all major screens render correctly with new palette
