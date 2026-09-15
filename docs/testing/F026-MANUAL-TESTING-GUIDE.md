# F026: Manual Testing Guide — Member Fine Rule Proposals

**Feature:** Member Fine Rule Proposals (F026)  
**Testing Date:** 2026-09-03  
**Tester:** [Your Name]  
**Environment:** Local dev (`npm run dev` on http://localhost:5173)

---

## Setup Instructions

### Prerequisites
1. **Dev server running:** `npm run dev` (http://localhost:5173)
2. **Firebase configured:** App connects to Firebase project
3. **Test accounts available:**
   - Member account: `copilot.test.20260519.1@example.com` (non-admin role)
   - Admin account: (different admin account in same team OR same account with dual roles)
4. **Browser DevTools open** for mobile testing at 430px width
5. **Firestore Console** open (optional, to verify database changes)

### Quick Environment Check
- [ ] Dev server running and no console errors
- [ ] App loads without 404s
- [ ] Firebase authentication works (can log in)
- [ ] Can navigate to "Bøder" (Fine Rules) tab

---

## Test Scenarios

### **SCENARIO 1: Member Creates First Proposal** ✍️

**Objective:** Verify member can submit a new fine rule proposal and see confirmation

**Steps:**
1. Login as **member** (non-admin)
2. Navigate to **"Bøder"** tab (fine rules section)
3. Look for **"Ny forslag"** button (should be visible for members)
4. Click **"Ny forslag"** button
5. Fill the proposal form:
   - **Titel:** `For sent til træning` (or any descriptive title)
   - **Beløb:** `50` (DKK)
   - **Emoji:** `⏰` (or any emoji, optional)
   - **Beskrivelse:** `Straf for at være mere end 5 minutter sen` (optional)
6. Click **"Opret forslag"** button

**Expected Results:**
- [ ] Form validation: Button disabled if title or amount is empty
- [ ] Toast notification appears: **"Dit forslag er modtaget ✓"**
- [ ] Toast auto-dismisses after ~3 seconds
- [ ] Screen redirects to **"Mine forslag"** list
- [ ] New proposal appears in list with:
  - Title: `For sent til træning`
  - Amount: `50 DKK`
  - Status badge: **"Afventer"** (yellow/gray color)
  - Relative timestamp: `lige nu` (just now)

**Acceptance Criteria:**
- ✅ Proposal successfully created in Firestore (`teams/{teamId}/fineRuleProposals/`)
- ✅ ActivityLog entry created: `rule.proposal_created` action
- ✅ Toast feedback is clear and timely
- ✅ Redirect is automatic and smooth
- ✅ List shows proposal immediately (real-time update)

**Screenshot Evidence Required:** ✓ MyProposals list showing new proposal with "Afventer" badge

---

### **SCENARIO 2: Member Views Proposal Details** 👁️

**Objective:** Verify member can click and view full proposal details

**Steps:**
1. From **"Mine forslag"** list (after Scenario 1)
2. Click on the proposal you just created
3. Verify all details are displayed
4. Check available action buttons

**Expected Results:**
- [ ] **ProposalDetail** page opens
- [ ] All proposal data displayed:
  - Title
  - Amount (formatted: "50 DKK")
  - Emoji (if entered)
  - Description (if entered)
  - Status badge: **"Afventer"** (yellow)
  - Relative timestamp: `lige nu`
  - Proposer info: Your name
- [ ] Two action buttons visible:
  - "Rediger forslag" (Edit button, blue)
  - "Traek forslag tilbage" (Retract button, red/danger)
- [ ] Back button ("← Tilbage") available at top

**Acceptance Criteria:**
- ✅ All proposal fields displayed correctly
- ✅ Formatting matches spec (DKK currency, relative timestamps)
- ✅ Action buttons are contextual (only available when status=pending)
- ✅ Navigation works (can go back to list)

---

### **SCENARIO 3: Member Edits Pending Proposal** ✏️

**Objective:** Verify member can modify a pending proposal

**Steps:**
1. From **ProposalDetail** (Scenario 2)
2. Click **"Rediger forslag"** button
3. Modify at least two fields:
   - Change **Titel** to: `Meget sent til træning` 
   - Change **Beløb** to: `75`
4. Keep other fields unchanged (or modify them too)
5. Click **"Gem ændringer"** button

**Expected Results:**
- [ ] Form opens with current values pre-filled
- [ ] Can edit all fields: title, amount, description, emoji
- [ ] Submit button shows: "Gem ændringer"
- [ ] Toast confirmation: **"Forslaget er opdateret ✓"** appears
- [ ] Redirects back to **"Mine forslag"** list
- [ ] List shows updated values:
  - Title changed to `Meget sent til træning`
  - Amount changed to `75 DKK`
  - Status still "Afventer"

**Acceptance Criteria:**
- ✅ Form pre-population works correctly
- ✅ Changes saved to Firestore
- ✅ Real-time list update shows new values
- ✅ No ActivityLog entry created for edits (per spec)
- ✅ Status remains "pending" after edit

**Screenshot Evidence Required:** ✓ Updated proposal in MyProposals list

---

### **SCENARIO 4: Member Retracts (Deletes) Proposal** 🗑️

**Objective:** Verify member can remove a proposal they created

**Steps:**
1. From **"Mine forslag"** list, select any **"Afventer"** status proposal
2. Open **ProposalDetail**
3. Click **"Traek forslag tilbage"** button
4. Confirmation dialog appears: **"Er du sikker på, at du vil trække forslaget tilbage?"**
5. Click **"Ja, slet det"** button (or **"Nej, luk"** to cancel)

**Expected Results (if confirming):**
- [ ] Dialog closes
- [ ] Toast: **"Forslaget blev fjernet ✓"** appears
- [ ] Proposal disappears from **"Mine forslag"** list
- [ ] If all proposals deleted, list shows: "0 forslag"

**Expected Results (if canceling):**
- [ ] Dialog closes
- [ ] Proposal remains in list
- [ ] No deletion occurs

**Acceptance Criteria:**
- ✅ Confirmation dialog prevents accidental deletion
- ✅ Proposal hard-deleted from Firestore (no soft delete)
- ✅ Real-time list update shows removal
- ✅ No ActivityLog entry for retraction (per spec)
- ✅ User can only retract their own proposals (pending status only)

---

### **SCENARIO 5: Admin Sees Pending Proposal Count Badge** 📊

**Objective:** Verify admin sees proposal count badge on button

**Steps:**
1. **Logout** current member session
2. **Login as admin** (different account or role toggle)
3. Navigate to **"Bøder"** tab
4. Look at top-right button area

**Expected Results:**
- [ ] Button visible: **"📋 Nye forslag"** 
- [ ] Red circular badge appears on button showing count (e.g., **"1"**)
- [ ] Badge shows correct number (should match pending proposals in system)
- [ ] Button is **enabled** (clickable) because count > 0
- [ ] If no pending proposals, badge disappears and button is **disabled** (grayed out)

**Badge Styling Requirements:**
- [ ] Badge is red background
- [ ] White text, bold font
- [ ] Circular shape (border-radius: 50%)
- [ ] Positioned top-right of button
- [ ] Size: 20px × 20px (approximately)

**Acceptance Criteria:**
- ✅ Badge appears/disappears based on proposal count
- ✅ Badge count updates in real-time when proposals are added/removed
- ✅ Button disabled state when count = 0
- ✅ Admin-only (not shown to members)
- ✅ Correct proposal count reflected

---

### **SCENARIO 6: Admin Reviews Pending Proposals List** 📋

**Objective:** Verify admin can view all pending member proposals

**Steps:**
1. As **admin**, click **"📋 Nye forslag"** button (or "📋 Nye forslag {X}" if count > 0)
2. **AdminProposalList** opens
3. Verify list contents and sorting

**Expected Results:**
- [ ] Page title: **"Nye bødefinansieringsforslag"**
- [ ] Subtitle shows count: e.g., "1 forslag i ventetilstand"
- [ ] Back button ("← Tilbage") available
- [ ] List shows **all pending proposals** sorted by:
  - [ ] **Created date ascending** (oldest first, FIFO order)
  - [ ] Each proposal card shows:
    - Proposer name prominently (bold text)
    - Title
    - Amount (formatted: "50 DKK")
    - Relative timestamp: e.g., "2 minutter siden"
    - Status badge: "Afventer"
- [ ] Can click any proposal to open **AdminProposalDetail**

**Example Proposal Card Display:**
```
┌─────────────────────────────────┐
│ Jane Doe (proposer name)        │
│ For sent til træning            │
│ 50 DKK                          │
│ 2 minutter siden                │
│ [Afventer status badge]         │
└─────────────────────────────────┘
```

**Acceptance Criteria:**
- ✅ Only pending proposals displayed
- ✅ FIFO order (oldest created first)
- ✅ Proposer name is prominent
- ✅ All fields formatted correctly
- ✅ Real-time updates (new proposals appear immediately)
- ✅ Real-time removal (denied/approved proposals disappear)

**Screenshot Evidence Required:** ✓ AdminProposalList with 1+ proposals

---

### **SCENARIO 7: Admin Approves Proposal** ✅

**Objective:** Verify admin can approve a proposal, converting it to a FineRule

**Steps:**
1. From **AdminProposalList**, click any proposal
2. **AdminProposalDetail** opens showing:
   - Proposal details
   - Two buttons: **"Godkend"** (green) and **"Afvis"** (red)
3. Click **"Godkend"** button
4. Confirmation dialog appears: **"Er du sikker på, at du vil godkende dette forslag?"**
5. Click **"Ja, godkend"** button to confirm

**Expected Results (After Approval):**
- [ ] Dialog closes
- [ ] Toast: **"Forslaget blev godkendt ✓"** appears
- [ ] Screen redirects to **AdminProposalList**
- [ ] Approved proposal **disappears from list** (no longer pending)
- [ ] Badge count **decrements by 1**
- [ ] If was last proposal, button becomes **disabled**

**Firestore Verification:**
- [ ] Original proposal document **deleted** from `teams/{teamId}/fineRuleProposals/{proposalId}`
- [ ] New **FineRule created** in `teams/{teamId}/fineRules/{newRuleId}` with:
  - Title (from proposal)
  - Amount (from proposal)
  - Emoji (from proposal)
  - Description (from proposal)
  - `isActive: true`
  - `createdBy: {adminId}`
  - `createdAt: {timestamp}`
- [ ] **ActivityLog entry created** with:
  - `action: "rule.proposal_approved"`
  - `entityType: "fine_rule_proposal"`
  - `entityId: {proposalId}`
  - `metadata: { proposedByName, ruleId: {newRuleId} }`

**Acceptance Criteria:**
- ✅ Proposal converted to active FineRule
- ✅ FineRule appears in Bøder catalog
- ✅ Proposal removed from admin review list
- ✅ Badge updates in real-time
- ✅ ActivityLog audit trail created
- ✅ Confirmation dialog prevents accidental approval

**Verification Steps:**
1. Go back to **"Bøder"** list
2. New rule should appear in the list with:
   - [ ] Title from proposal
   - [ ] Amount from proposal
   - [ ] Emoji from proposal

**Screenshot Evidence Required:** ✓ Approved proposal disappears from admin list + appears in Bøder catalog

---

### **SCENARIO 8: Admin Denies Proposal** ❌

**Objective:** Verify admin can reject a proposal

**Steps:**
1. From **AdminProposalList**, click any proposal
2. **AdminProposalDetail** opens
3. Click **"Afvis"** button (red)
4. Confirmation dialog appears: **"Er du sikker på, at du vil afvise dette forslag?"**
5. Click **"Ja, afvis"** button to confirm

**Expected Results (After Denial):**
- [ ] Dialog closes
- [ ] Toast: **"Forslaget blev afvist ✓"** appears
- [ ] Screen redirects to **AdminProposalList**
- [ ] Denied proposal **disappears from list**
- [ ] Badge count **decrements by 1**
- [ ] Proposal does **NOT** appear in Bøder catalog

**Firestore Verification:**
- [ ] Original proposal document **deleted** from `teams/{teamId}/fineRuleProposals/{proposalId}`
- [ ] **NO FineRule created** (only on approval)
- [ ] **ActivityLog entry created** with:
  - `action: "rule.proposal_denied"`
  - `entityType: "fine_rule_proposal"`
  - `entityId: {proposalId}`
  - `metadata: { proposedByName }`

**Acceptance Criteria:**
- ✅ Proposal deleted (not converted to rule)
- ✅ Proposal removed from admin review list
- ✅ Badge updates correctly
- ✅ ActivityLog entry created for audit trail
- ✅ Confirmation dialog prevents accidental denial
- ✅ No new FineRule created

**Screenshot Evidence Required:** ✓ Denied proposal disappears from admin list

---

### **SCENARIO 9: Real-Time Badge Updates** ⚡

**Objective:** Verify badge count updates in real-time as proposals are processed

**Setup:**
- Open app in **two browser windows/tabs:**
  - Tab A: **Member** logged in, can create proposals
  - Tab B: **Admin** logged in, showing **AdminProposalList** with badge

**Steps:**
1. In **Tab A (Member):** Click "Ny forslag" → Create new proposal → Submit
2. Observe **Tab B (Admin):** Watch the badge count in real-time
3. In **Tab B (Admin):** Approve the proposal
4. Observe **Tab A (Member):** Check if proposal disappears from MyProposals (optional cross-check)

**Expected Results:**
- [ ] Tab B badge increments immediately when proposal created in Tab A (within ~1 second)
- [ ] Badge shows new count
- [ ] Tab B button changes from **disabled** → **enabled** if count went from 0→1
- [ ] Tab B badge decrements when proposal is approved/denied in Tab B (within ~1 second)
- [ ] Tab B button changes from **enabled** → **disabled** if count went from 1→0

**Acceptance Criteria:**
- ✅ Real-time listener fires correctly
- ✅ Badge updates instantaneously (< 2 seconds)
- ✅ No page refresh needed
- ✅ Multiple rapid operations don't cause glitches

---

### **SCENARIO 10: Mobile Responsive Design** 📱

**Objective:** Verify all screens work correctly at mobile viewport (430px width)

**Setup:**
1. Open DevTools (F12)
2. Toggle Device Toolbar or Responsive Design Mode
3. Set width to **430px** (mobile max width per project spec)
4. Set device type to **iPhone** (or generic mobile)

**Test Screens at 430px:**

#### ProposalForm (Create Proposal)
- [ ] Form title centered and readable
- [ ] Input fields stack vertically
- [ ] Labels clearly visible
- [ ] Buttons (Opret forslag, Luk) are full-width or adequate width
- [ ] Touch targets ≥ 44px (buttons, inputs)
- [ ] Form fits within viewport without horizontal scroll
- [ ] Toast message visible at top without blocking form

#### MyProposals List
- [ ] Proposal cards stack vertically
- [ ] Card content readable (no text overflow)
- [ ] Status badge visible and readable
- [ ] Timestamp visible (relative time)
- [ ] Cards are tappable (adequate touch targets)
- [ ] "Tilbage" button easily accessible

#### ProposalDetail
- [ ] All proposal data readable
- [ ] Action buttons (Rediger, Traek tilbage) stack vertically or side-by-side with good spacing
- [ ] Buttons are tappable (≥ 44px)
- [ ] Confirmation dialogs fit viewport

#### AdminProposalList
- [ ] Proposal cards readable at 430px
- [ ] Proposer name, title, amount all visible
- [ ] No horizontal scroll needed
- [ ] Badge on button visible and readable

#### AdminProposalDetail
- [ ] Proposal details visible
- [ ] Approve/Deny buttons properly positioned
- [ ] Confirmation dialogs readable and tappable

**Acceptance Criteria:**
- ✅ All text readable (no overflow or truncation)
- ✅ No horizontal scrolling required
- ✅ Touch targets ≥ 44px for all interactive elements
- ✅ Forms submit successfully
- ✅ Buttons and links tappable without zooming
- ✅ Layout responsive using TailwindCSS

**Screenshot Evidence Required:** ✓ Each screen at 430px width showing readable, tappable UI

---

### **SCENARIO 11: Error Handling & Edge Cases** ⚠️

**Objective:** Verify system handles errors gracefully

#### 11A: Empty Form Submission
**Steps:**
1. Open **ProposalForm**
2. Leave **Titel** and **Beløb** fields empty
3. Try to click **"Opret forslag"** button

**Expected:**
- [ ] Button is **disabled** (grayed out)
- [ ] Cannot submit
- [ ] Form validation prevents submission

#### 11B: Invalid Amount
**Steps:**
1. Open **ProposalForm**
2. Enter **Titel:** `Test`
3. Enter **Beløb:** `0` or negative value
4. Try to submit

**Expected:**
- [ ] Button is **disabled**
- [ ] Error message: "Beløbet skal være større end 0" (or similar)

#### 11C: Network Error During Submit
**Steps:**
1. Open **ProposalForm**
2. Fill form completely
3. Simulate network offline (DevTools → Network → Offline)
4. Click **"Opret forslag"**

**Expected:**
- [ ] Error toast appears: "Kunne ikke gemme forslaget. Prøv igen."
- [ ] Form stays open (not cleared)
- [ ] Can retry after going online

#### 11D: Permission Check (Member can't approve)
**Steps:**
1. Login as **member**
2. Navigate to **"Bøder"** tab
3. Look for **"📋 Nye forslag"** button

**Expected:**
- [ ] Button is **NOT visible** to members
- [ ] Only "Ny forslag" button appears for member role

#### 11E: Proposal Expires (Admin context lost)
**Steps:**
1. Admin opens **AdminProposalDetail** for a proposal
2. Member (in another tab) retracts that same proposal
3. Try to approve in admin tab

**Expected:**
- [ ] Admin sees: "Forslag blev ikke fundet" error message
- [ ] Graceful error handling (no crash)

**Acceptance Criteria:**
- ✅ All validation prevents invalid submissions
- ✅ Error messages are clear (Danish, user-friendly)
- ✅ No unhandled exceptions in console
- ✅ Permission checks enforced on both UI and backend
- ✅ Errors don't leave app in broken state

---

### **SCENARIO 12: Audit Trail & ActivityLog** 📜

**Objective:** Verify all proposal actions are logged in ActivityLog

**Firestore Verification (requires Firestore Console or query tool):**

Navigate to Firebase Console → Firestore → Collections:
- `teams/{teamId}/activityLog` collection

**Check for entries with:**

1. **Proposal Created:**
   - Action: `rule.proposal_created`
   - EntityType: `fine_rule_proposal`
   - Metadata includes: `proposedByName`, `proposalTitle`
   - Creator: member who created

2. **Proposal Approved:**
   - Action: `rule.proposal_approved`
   - EntityType: `fine_rule_proposal`
   - Metadata includes: `proposedByName`, `ruleId` (new FineRule ID)
   - Actor: admin who approved

3. **Proposal Denied:**
   - Action: `rule.proposal_denied`
   - EntityType: `fine_rule_proposal`
   - Metadata includes: `proposedByName`
   - Actor: admin who denied

4. **Proposal NOT logged on:**
   - Edit (updates to pending proposal)
   - Retract (deletion by member)

**Acceptance Criteria:**
- ✅ All 3 actions logged: created, approved, denied
- ✅ Metadata includes relevant context
- ✅ Actor (user ID) correctly recorded
- ✅ Timestamps are accurate (ISO format)
- ✅ Edits and retractions NOT logged (per spec)

---

### **SCENARIO 13: Status Transitions & State Management** 🔄

**Objective:** Verify proposal status flow is correct

**Valid Status Transitions:**
```
pending → [approved | denied]
        → (stays pending if edited)
```

**Invalid Transitions (should NOT happen):**
- pending → pending (stay same)
- approved → * (approved proposals don't exist, converted to FineRule)
- denied → * (denied proposals deleted)

**Test Steps:**
1. Create proposal (status: `pending`)
2. Edit proposal (status: still `pending`)
3. Approve proposal (deleted, FineRule created instead)
4. Create another proposal (status: `pending`)
5. Deny proposal (deleted, no FineRule created)

**Firestore Verification:**
- [ ] Proposals with status other than `pending` should not exist
- [ ] After approval/denial, proposal document doesn't exist
- [ ] FineRule document exists only after approval
- [ ] No orphaned/broken documents

**Acceptance Criteria:**
- ✅ Only pending proposals in fineRuleProposals collection
- ✅ Approved proposals become FineRules (data migrated)
- ✅ Denied proposals cleanly deleted
- ✅ No invalid state transitions possible
- ✅ State consistent across real-time listeners

---

## Final Acceptance Checklist

Before marking F026 as fully tested and acceptable, verify **all** of the following:

### Functionality
- [ ] **Scenario 1:** Member creates proposal — toast + redirect works
- [ ] **Scenario 2:** Member views proposal details — all fields visible
- [ ] **Scenario 3:** Member edits pending proposal — changes saved
- [ ] **Scenario 4:** Member retracts proposal — deleted successfully
- [ ] **Scenario 5:** Admin sees badge — count accurate and updates
- [ ] **Scenario 6:** Admin views proposal list — FIFO order correct
- [ ] **Scenario 7:** Admin approves proposal — converted to FineRule
- [ ] **Scenario 8:** Admin denies proposal — deleted, no FineRule
- [ ] **Scenario 9:** Real-time updates work across tabs/instances
- [ ] **Scenario 11:** Error handling is graceful and user-friendly
- [ ] **Scenario 12:** ActivityLog entries created correctly
- [ ] **Scenario 13:** Status transitions valid, no orphaned docs

### UI/UX
- [ ] **Scenario 10:** Mobile responsive at 430px (all screens)
- [ ] All buttons accessible and tappable (≥ 44px)
- [ ] All text readable (no truncation/overflow)
- [ ] Toast notifications clear and timely
- [ ] Confirmation dialogs prevent accidental actions
- [ ] Back buttons work correctly
- [ ] Form validation prevents invalid input

### Data Integrity
- [ ] Firestore collections properly scoped (teams/{teamId}/...)
- [ ] No data leakage between teams
- [ ] Proposals hard-deleted (not soft-deleted)
- [ ] FineRules created with correct fields
- [ ] ActivityLog entries have correct action types
- [ ] No orphaned documents

### Performance
- [ ] Real-time updates < 2 seconds
- [ ] No console errors or warnings
- [ ] Form submissions responsive
- [ ] List pagination handles large data sets (if applicable)

### Security & Permissions
- [ ] Members can only create, edit, retract their own proposals
- [ ] Members cannot approve/deny proposals
- [ ] Admins can view all proposals
- [ ] Admins can approve/deny proposals
- [ ] No permission bypass possible via URL or API

### Accessibility
- [ ] All interactive elements keyboard-navigable (if applicable)
- [ ] Color-blind friendly (badges not only differentiated by color)
- [ ] Screen reader friendly (semantic HTML, aria labels)

---

## Sign-Off

**Testing Completed By:** _________________  
**Date:** _________________  
**Result:** ☐ PASS (All scenarios verified) | ☐ FAIL (Issues found, see notes below)

**Issues Found (if any):**
```
1. 
2. 
3. 
```

**Notes & Comments:**
```


```

**Screenshots Attached:**
- [ ] ProposalForm
- [ ] MyProposals list
- [ ] AdminProposalList
- [ ] Approval confirmation
- [ ] Mobile 430px viewport (ProposalForm)
- [ ] Mobile 430px viewport (MyProposals)
- [ ] Approved proposal in Bøder catalog

---

## Appendix: Firestore Query Helpers

**View all proposals for a team:**
```
db.collection("teams").doc("{teamId}").collection("fineRuleProposals").orderBy("createdAt").get()
```

**View pending proposals only:**
```
db.collection("teams").doc("{teamId}").collection("fineRuleProposals").where("status", "==", "pending").orderBy("createdAt").get()
```

**View activity log for proposals:**
```
db.collection("teams").doc("{teamId}").collection("activityLog").where("action", "in", ["rule.proposal_created", "rule.proposal_approved", "rule.proposal_denied"]).orderBy("createdAt", "desc").get()
```

**View created FineRules from approvals:**
```
db.collection("teams").doc("{teamId}").collection("fineRules").where("createdBy", "==", "{adminId}").orderBy("createdAt", "desc").get()
```

---

**End of Testing Guide**
