#!/usr/bin/env node
/**
 * CLI script to reconcile season totals for a team.
 * Standalone version with all logic inline to avoid module resolution issues.
 * 
 * Usage (from project root):
 *   npx tsx src/scripts/reconcile-seasons.ts <teamId>
 *   npx tsx src/scripts/reconcile-seasons.ts --list
 */

import { config } from "dotenv";
import * as admin from "firebase-admin";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

// Load environment variables
config({ path: ".env.local" });

// Try to initialize Firebase Admin SDK with service account
let db: admin.firestore.Firestore;

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (serviceAccountPath) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    db = getFirestore();
    console.log("✓ Authenticated as service account\n");
  } catch (error) {
    console.error("❌ Failed to load service account:", error instanceof Error ? error.message : String(error));
    console.error("\nTo fix this:");
    console.error("1. Download service account key from Firebase Console:");
    console.error("   - Go to Project Settings > Service Accounts");
    console.error("   - Click 'Generate New Private Key'");
    console.error("   - Save it as 'firebase-service-account.json' in project root");
    console.error("2. Add to .env.local:");
    console.error("   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json\n");
    process.exit(1);
  }
} else {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT_PATH not found in .env.local");
  console.error("\nTo fix this:");
  console.error("1. Download service account key from Firebase Console:");
  console.error("   - Go to Project Settings > Service Accounts");
  console.error("   - Click 'Generate New Private Key'");
  console.error("   - Save it as 'firebase-service-account.json' in project root");
  console.error("2. Add to .env.local:");
  console.error("   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json\n");
  process.exit(1);
}

interface Season {
  id: string;
  name: string;
  totalOutstanding?: number;
  totalPendingBalance?: number;
  totalApprovedBalance?: number;
}

interface UserSeasonBalance {
  outstandingBalance: number;
  pendingBalance: number;
  approvedBalance: number;
}

interface ReconciliationResult {
  seasonId: string;
  seasonName: string;
  before: {
    totalOutstanding: number;
    totalPendingBalance: number;
    totalApprovedBalance: number;
  };
  after: {
    totalOutstanding: number;
    totalPendingBalance: number;
    totalApprovedBalance: number;
  };
  changes: {
    outstandingDelta: number;
    pendingDelta: number;
    approvedDelta: number;
  };
  healed: boolean;
}

async function getSeasons(teamId: string): Promise<Season[]> {
  const snap = await db.collection(`teams/${teamId}/seasons`).get();
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  } as Season));
}

async function getSeason(teamId: string, seasonId: string): Promise<Season | null> {
  const snap = await db.collection(`teams/${teamId}/seasons`).doc(seasonId).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Season) : null;
}

async function getSeasonBalances(teamId: string, seasonId: string): Promise<UserSeasonBalance[]> {
  const snap = await db
    .collection(`teams/${teamId}/userSeasonBalances`)
    .where("seasonId", "==", seasonId)
    .get();
  return snap.docs.map((d) => d.data() as UserSeasonBalance);
}

async function getTeam(teamId: string) {
  const snap = await db.collection("teams").doc(teamId).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function reconcileSeasonTotals(teamId: string, seasonId: string): Promise<ReconciliationResult> {
  const [season, balances] = await Promise.all([
    getSeason(teamId, seasonId),
    getSeasonBalances(teamId, seasonId),
  ]);

  if (!season) {
    throw new Error(`Season ${seasonId} not found in team ${teamId}`);
  }

  let correctOutstanding = 0;
  let correctPending = 0;
  let correctApproved = 0;

  for (const balance of balances) {
    correctOutstanding += balance.outstandingBalance;
    correctPending += balance.pendingBalance;
    correctApproved += balance.approvedBalance;
  }

  const before = {
    totalOutstanding: season.totalOutstanding ?? 0,
    totalPendingBalance: season.totalPendingBalance ?? 0,
    totalApprovedBalance: season.totalApprovedBalance ?? 0,
  };

  const after = {
    totalOutstanding: correctOutstanding,
    totalPendingBalance: correctPending,
    totalApprovedBalance: correctApproved,
  };

  const changes = {
    outstandingDelta: correctOutstanding - (season.totalOutstanding ?? 0),
    pendingDelta: correctPending - (season.totalPendingBalance ?? 0),
    approvedDelta: correctApproved - (season.totalApprovedBalance ?? 0),
  };

  const healed =
    changes.outstandingDelta !== 0 ||
    changes.pendingDelta !== 0 ||
    changes.approvedDelta !== 0;

  if (healed) {
    const batch = db.batch();
    const seasonRef = db.collection(`teams/${teamId}/seasons`).doc(seasonId);
    const updated: Season = {
      ...season,
      totalOutstanding: correctOutstanding,
      totalPendingBalance: correctPending,
      totalApprovedBalance: correctApproved,
    };
    batch.set(seasonRef, updated);
    await batch.commit();
  }

  return {
    seasonId,
    seasonName: season.name,
    before,
    after,
    changes,
    healed,
  };
}

async function reconcileAllSeasons(teamId: string): Promise<ReconciliationResult[]> {
  const seasons = await getSeasons(teamId);
  const results: ReconciliationResult[] = [];

  for (const season of seasons) {
    try {
      const result = await reconcileSeasonTotals(teamId, season.id);
      results.push(result);
    } catch (error) {
      console.error(`Failed to reconcile season ${season.id}:`, error);
    }
  }

  return results;
}

async function listTeams() {
  console.log("📋 Available teams:\n");

  try {
    const teamsSnapshot = await db.collection("teams").get();

    if (teamsSnapshot.empty) {
      console.log("⚠️  No teams found.\n");
      return;
    }

    const teams = teamsSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      name: docSnap.data().name,
    }));

    teams.forEach((team, idx) => {
      console.log(`  ${idx + 1}. ${team.name}`);
      console.log(`     ID: ${team.id}\n`);
    });

    console.log("💡 Copy a team ID and run:\n");
    console.log(`   npx tsx src/scripts/reconcile-seasons.ts <teamId>\n`);
  } catch (error) {
    console.error("❌ Error fetching teams:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function reconcileTeam(teamId: string) {
  console.log(`🔧 Reconciling all seasons for team: ${teamId}\n`);

  try {
    const team = await getTeam(teamId);
    if (!team) {
      console.error(`❌ Team "${teamId}" not found.`);
      console.error("\nRun with --list to see available teams:\n");
      console.error("   npx tsx src/scripts/reconcile-seasons.ts --list\n");
      process.exit(1);
    }

    console.log(`✓ Found team: ${team.name}`);
    console.log("This will rebuild season totals from individual member balances...\n");

    const results = await reconcileAllSeasons(teamId);

    if (results.length === 0) {
      console.log("⚠️  No seasons found for this team.");
      process.exit(0);
    }

    console.log(`\n✓ Reconciliation complete for ${results.length} season(s)\n`);
    console.log("─".repeat(100));

    for (const result of results) {
      const healed = result.healed ? "🔧 HEALED" : "✓ OK";
      console.log(`\n${healed} | ${result.seasonName} (${result.seasonId})`);

      if (result.healed) {
        console.log(
          `  Before: Outstanding ${result.before.totalOutstanding}, Pending ${result.before.totalPendingBalance}, Approved ${result.before.totalApprovedBalance}`,
        );
        console.log(
          `  After:  Outstanding ${result.after.totalOutstanding}, Pending ${result.after.totalPendingBalance}, Approved ${result.after.totalApprovedBalance}`,
        );
        console.log(
          `  Δ       Outstanding ${result.changes.outstandingDelta > 0 ? "+" : ""}${result.changes.outstandingDelta}, Pending ${result.changes.pendingDelta > 0 ? "+" : ""}${result.changes.pendingDelta}, Approved ${result.changes.approvedDelta > 0 ? "+" : ""}${result.changes.approvedDelta}`,
        );
      } else {
        console.log(
          `  Total: Outstanding ${result.after.totalOutstanding}, Pending ${result.after.totalPendingBalance}, Approved ${result.after.totalApprovedBalance}`,
        );
      }
    }

    console.log(`\n${"─".repeat(100)}\n`);

    const healedCount = results.filter((r) => r.healed).length;
    if (healedCount > 0) {
      console.log(`✅ Successfully healed ${healedCount} season(s)!`);
      console.log("\nThe 'Udstedt bøder', 'Skyldigt', and 'Indbetalt' numbers should now add up correctly.\n");
    } else {
      console.log("✓ All seasons are already consistent.\n");
    }
  } catch (error) {
    console.error("❌ Error during reconciliation:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2];

  if (!command) {
    console.error("❌ Missing argument: teamId or --list");
    console.error("\nUsage:");
    console.error("  npx tsx src/scripts/reconcile-seasons.ts --list          (list all teams)");
    console.error("  npx tsx src/scripts/reconcile-seasons.ts <teamId>        (reconcile specific team)\n");
    process.exit(1);
  }

  if (command === "--list") {
    await listTeams();
  } else {
    await reconcileTeam(command);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
