---
status: implemented
implemented_date: 2026-05-30
implemented_by: Team
note: "Moved to docs/specs/done/ to mark as implemented."
---

# F008 - Member Welcome & Auth

## Problem
New members need a clear onboarding flow and secure authentication.

## Goal
Provide a welcome authentication flow that signs users in and presents onboarding steps.

## Actors
- Member (new/existing)

## Flow

1. New user receives invite link and taps it
2. App opens Welcome flow with club intro and sign-in options
3. User signs in with email link or OAuth
4. On first sign-in, show onboarding checklist (accept rules, set display name)
5. After onboarding, navigate to Team Overview

## Edge Cases
- Email invite expired → show request-new-invite path
- Existing user opens invite → accept without duplicating accounts

## Acceptance Criteria
- Invite link signs-in the user and completes onboarding
- Onboarding required only once per user
- Users can change display name later in profile
