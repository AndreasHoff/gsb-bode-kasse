# F028 - Searchable Fine Rule Selection

## Problem

When a team has many active fine rules (e.g., "Kom for sent", "Manglede sportsudstyr", "Ikke mødt op", "Upassende sprog"), admins struggle to find the right one from a flat dropdown list. Scrolling through 20+ rules is tedious and error-prone, especially on mobile where dropdown rendering is limited.

## Goal

Provide a fast, intuitive way for admins to filter and find the correct fine rule when assigning fines to members.

## Actors

- Admin (assigns fines to members)

## Preconditions

- Admin is on the "Giv bøde" screen
- At least one active fine rule exists in the team
- Enough screen space to display a search input and filtered results

## Flow

1. Admin navigates to "Giv bøde" screen
2. System displays the fine rule selection field (search-enabled dropdown or similar)
3. Admin sees a search input field labeled "Søg i bødetyper" (or similar) with placeholder text
4. Admin types one or more characters (e.g., "kom", "seng") into the search field
5. System filters the rules in real-time, showing only rules where:
   - Title contains the search term (case-insensitive, Danish character handling)
   - Description contains the search term (case-insensitive)
   - Amount matches if search is a number (e.g., "50" finds all 50 DKK rules)
6. System displays the filtered list below the search field
7. Admin clicks/taps a rule to select it
8. If search clears (admin deletes text), system shows all rules again
9. If search matches zero rules, system shows "Ingen regler fundet" message
10. When a rule is selected, search field clears and displays the selected rule

## Edge Cases

- **No active rules match**: Display empty state with "Ingen regler fundet" — allow admin to clear search and retry
- **Search term is empty**: Show all active rules (default state)
- **Partial amount match**: Searching "5" should find "50 kr" and "150 kr" rules
- **Special characters in title**: Rules with emoji or special characters (e.g., "🚫 Elektronik i hal") should be searchable by title without emoji
- **Duplicate rule titles**: If two rules have identical titles but different amounts, both appear; admin selects the correct one by amount
- **Long rule descriptions**: Descriptions longer than ~60 characters should truncate in the filtered list to avoid layout shift
- **Rapid typing**: Debounce is not strictly required (filtering is fast on <100 rules), but consider if performance becomes an issue
- **Accessibility**: Search field must be keyboard-navigable and support screen readers

## Acceptance Criteria

- Admins can type into a search field to filter fine rules by title, description, or amount
- Filtering is case-insensitive and handles Danish characters (æ, ø, å)
- Results update in real-time as the admin types
- "Ingen regler fundet" appears when zero rules match the search
- Selecting a rule from the filtered list sets the selection and clears the search field
- Clearing the search field (or typing empty string) shows all active rules again
- The search field is accessible via keyboard Tab navigation
- Mobile layout (≤430px) does not break; dropdown/filtered list is readable and tappable
- Search respects the existing permission check: only admins see the fine assignment form at all
