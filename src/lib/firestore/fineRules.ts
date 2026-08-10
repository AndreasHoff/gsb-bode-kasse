import { getDocs, getDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { fineRulesCol, fineRuleDoc, activityLogCol } from "./refs";
import type { FineRule, ActivityLog } from "../../types/domain";

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

/**
 * Creates a FineRule and writes a `rule.created` ActivityLog entry atomically.
 */
export async function createFineRule(
  data: Omit<FineRule, "id">,
  actorId: string,
): Promise<FineRule> {
  const batch = writeBatch(db);

  const colRef = fineRulesCol(data.teamId);
  const ruleRef = doc(colRef);
  const rule: FineRule = { id: ruleRef.id, ...data };
  batch.set(ruleRef, rule);

  const logColRef = activityLogCol(data.teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId: data.teamId,
    actorId,
    action: "rule.created",
    entityType: "fineRule",
    entityId: ruleRef.id,
    metadata: { title: data.title, amount: data.amount },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  await batch.commit();
  return rule;
}

/**
 * Updates a FineRule and writes a `rule.updated` ActivityLog entry atomically.
 */
export async function updateFineRule(
  teamId: string,
  ruleId: string,
  updates: Partial<Omit<FineRule, "id" | "teamId" | "createdBy" | "createdAt">>,
  actorId: string,
): Promise<FineRule> {
  const existing = await getFineRule(teamId, ruleId);
  if (!existing) throw new Error(`FineRule ${ruleId} not found in team ${teamId}`);

  const updated: FineRule = { ...existing, ...updates };

  const batch = writeBatch(db);

  batch.set(fineRuleDoc(teamId, ruleId), updated);

  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "rule.updated",
    entityType: "fineRule",
    entityId: ruleId,
    metadata: { title: updated.title, amount: updated.amount },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  await batch.commit();
  return updated;
}

/**
 * Deactivates a fine rule and writes a `rule.deactivated` ActivityLog entry atomically.
 * Does not affect existing assigned fines.
 */
export async function deactivateFineRule(
  teamId: string,
  ruleId: string,
  actorId: string,
): Promise<void> {
  const existing = await getFineRule(teamId, ruleId);
  if (!existing) throw new Error(`FineRule ${ruleId} not found in team ${teamId}`);

  const batch = writeBatch(db);

  batch.set(fineRuleDoc(teamId, ruleId), { ...existing, isActive: false });

  const logColRef = activityLogCol(teamId);
  const logRef = doc(logColRef);
  const logEntry: ActivityLog = {
    id: logRef.id,
    teamId,
    actorId,
    action: "rule.deactivated",
    entityType: "fineRule",
    entityId: ruleId,
    metadata: { title: existing.title },
    createdAt: new Date().toISOString(),
  };
  batch.set(logRef, logEntry);

  await batch.commit();
}

/**
 * Bulk-imports fine rules from a seed data array.
 * Processes in batches of ~40 rules (80 writes per batch, within 500-op Firestore limit).
 * Skips rules that already exist (by title).
 * Returns summary of created/skipped rules.
 */
export async function bulkCreateFineRules(
  teamId: string,
  seedRules: Array<{
    title: string;
    amount: number;
    emoji?: string;
    description?: string;
  }>,
  actorId: string,
  onProgress?: (created: number, total: number) => void,
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const existing = await getFineRules(teamId);
  const existingTitles = new Set(existing.map((r) => r.title));

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  const total = seedRules.length;

  // Batch in groups of 40 (2 writes per rule = 80 ops, under 500 limit)
  const batchSize = 40;

  for (let i = 0; i < seedRules.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchRules = seedRules.slice(i, i + batchSize);
    let opsInBatch = 0;

    for (const seedRule of batchRules) {
      if (existingTitles.has(seedRule.title)) {
        skipped += 1;
        continue;
      }

      const colRef = fineRulesCol(teamId);
      const ruleRef = doc(colRef);
      const rule: FineRule = {
        id: ruleRef.id,
        teamId,
        title: seedRule.title,
        amount: seedRule.amount,
        emoji: seedRule.emoji,
        description: seedRule.description,
        isActive: true,
        createdBy: actorId,
        createdAt: new Date().toISOString(),
      };
      batch.set(ruleRef, rule);
      opsInBatch += 1;

      const logColRef = activityLogCol(teamId);
      const logRef = doc(logColRef);
      const logEntry: ActivityLog = {
        id: logRef.id,
        teamId,
        actorId,
        action: "rule.created",
        entityType: "fineRule",
        entityId: ruleRef.id,
        metadata: { title: rule.title, amount: rule.amount },
        createdAt: new Date().toISOString(),
      };
      batch.set(logRef, logEntry);
      opsInBatch += 1;

      created += 1;
    }

    if (opsInBatch > 0) {
      try {
        await batch.commit();
      } catch (err) {
        errors.push(`Batch ${i}-${i + batchSize} failed: ${err}`);
      }
    }

    onProgress?.(created + skipped, total);
  }

  return { created, skipped, errors };
}
