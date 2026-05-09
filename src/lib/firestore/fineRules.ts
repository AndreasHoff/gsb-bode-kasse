import { getDocs, getDoc, doc, setDoc } from "firebase/firestore";
import { fineRulesCol, fineRuleDoc } from "./refs";
import type { FineRule } from "../../types/domain";

export async function getFineRules(teamId: string): Promise<FineRule[]> {
  const snap = await getDocs(fineRulesCol(teamId));
  return snap.docs.map((d) => d.data());
}

export async function getFineRule(
  teamId: string,
  ruleId: string,
): Promise<FineRule | null> {
  const snap = await getDoc(fineRuleDoc(teamId, ruleId));
  return snap.exists() ? snap.data() : null;
}

export async function createFineRule(
  data: Omit<FineRule, "id">,
): Promise<FineRule> {
  const colRef = fineRulesCol(data.teamId);
  const docRef = doc(colRef);
  const rule: FineRule = { id: docRef.id, ...data };
  await setDoc(docRef, rule);
  return rule;
}

export async function updateFineRule(
  teamId: string,
  ruleId: string,
  updates: Partial<Omit<FineRule, "id" | "teamId" | "createdBy" | "createdAt">>,
): Promise<FineRule> {
  const existing = await getFineRule(teamId, ruleId);
  if (!existing) throw new Error(`FineRule ${ruleId} not found in team ${teamId}`);
  const updated: FineRule = { ...existing, ...updates };
  await setDoc(fineRuleDoc(teamId, ruleId), updated);
  return updated;
}

/**
 * Deactivates a fine rule. Does not affect existing assigned fines.
 * No ActivityLog entry is required per spec (no defined action string).
 */
export async function deactivateFineRule(
  teamId: string,
  ruleId: string,
): Promise<void> {
  const existing = await getFineRule(teamId, ruleId);
  if (!existing) throw new Error(`FineRule ${ruleId} not found in team ${teamId}`);
  await setDoc(fineRuleDoc(teamId, ruleId), { ...existing, isActive: false });
}
