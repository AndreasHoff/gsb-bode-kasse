# Issue: F019 - Implement Fine Rules Editor Versioning

Summary
---
Fine rules editing does not currently record versions or support reverting to previous rule versions.

Missing work
---
- Add `versions` subcollection under each fine rule (e.g. `fineRules/{ruleId}/versions`) and write a version document on each edit
- Provide `createRuleVersion(teamId, ruleId, actorId)` and `revertRuleVersion(teamId, ruleId, versionId, actorId)` helpers in `src/lib/firestore/fineRules.ts`
- Add UI in `FineRulesCatalog` / `FineRuleForm` to view history and revert
- Add ActivityLog entries for version creation and revert
- Add tests for versioning and revert flows

Acceptance criteria
---
- Each edit creates a version entry
- Admins can view and revert to previous versions
- Reverts write ActivityLog entries

References
---
- `src/lib/firestore/fineRules.ts`
- `docs/specs/features/F019-fine-rules-editor-versioning.md`
