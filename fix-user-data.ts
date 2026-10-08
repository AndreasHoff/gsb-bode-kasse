import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// Initialize Firebase Admin with service account
const serviceAccountPath = path.resolve("firebase-service-account.json");
const serviceAccountJson = JSON.parse(
  fs.readFileSync(serviceAccountPath, "utf-8")
);

initializeApp({
  credential: cert(serviceAccountJson),
});

const db = getFirestore();

async function fixUserData(userId: string) {
  console.log(`\n=== FIXING USER DATA FOR ${userId} ===\n`);

  try {
    // 1. Get user document
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.error("❌ User document not found");
      return;
    }

    const userData = userDoc.data()!;
    console.log("✓ User document found:");
    console.log(`  Name: ${userData.name}`);
    console.log(`  Email: ${userData.email}`);
    console.log(`  Created: ${userData.createdAt}`);

    // 2. Check for active membership
    const membershipsSnap = await db
      .collectionGroup("members")
      .where("userId", "==", userId)
      .where("isActive", "==", true)
      .get();

    if (!membershipsSnap.empty) {
      console.log(`\n✓ User already has ${membershipsSnap.size} active membership(s)`);
      membershipsSnap.docs.forEach((doc) => {
        const membership = doc.data();
        const ref = doc.ref;
        const teamId = ref.parent.parent?.id;
        console.log(`  - Team: ${teamId} (Role: ${membership.role})`);
      });
      console.log("\n✅ User data is complete. No fix needed.");
      return;
    }

    console.log(`\n⚠️  No active membership found. Creating one...\n`);

    // 3. Find the default team (GSB)
    const teamsSnap = await db
      .collection("teams")
      .where("slug", "==", "gsb")
      .limit(1)
      .get();

    let defaultTeamId: string;

    if (teamsSnap.empty) {
      // Fallback: get first team
      const allTeamsSnap = await db.collection("teams").limit(1).get();
      if (allTeamsSnap.empty) {
        console.error("❌ No teams found in Firestore");
        return;
      }
      defaultTeamId = allTeamsSnap.docs[0].id;
      console.log(`  Using first available team: ${defaultTeamId}`);
    } else {
      defaultTeamId = teamsSnap.docs[0].id;
      console.log(`  Using GSB team: ${defaultTeamId}`);
    }

    // 4. Create membership
    const membershipRef = db
      .collection("teams")
      .doc(defaultTeamId)
      .collection("members")
      .doc(userId);

    const membership = {
      userId,
      role: "member",
      joinedAt: new Date().toISOString(),
      isActive: true,
    };

    await membershipRef.set(membership);

    console.log(`\n✅ Membership created:`);
    console.log(`  - Team ID: ${defaultTeamId}`);
    console.log(`  - User ID: ${userId}`);
    console.log(`  - Role: member`);
    console.log(`  - Active: true`);

    // 5. Create activity log entry
    const activityLogRef = db
      .collection("teams")
      .doc(defaultTeamId)
      .collection("activityLog")
      .doc();

    const logEntry = {
      id: activityLogRef.id,
      teamId: defaultTeamId,
      actorId: "admin-fix-script",
      action: "member.added",
      entityType: "membership",
      entityId: userId,
      metadata: {
        userId,
        role: "member",
        fixedByScript: true,
      },
      createdAt: new Date().toISOString(),
    };

    await activityLogRef.set(logEntry);

    console.log(`\n✅ Activity log entry created`);
    console.log(`\n=== COMPLETED ===\n`);
    console.log(`User ${userId} is now fully set up!`);
    console.log(`They should see their name "${userData.name}" when they refresh the app.\n`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

const userId = process.argv[2];
if (!userId) {
  console.error("❌ Please provide userId as argument:");
  console.error("   npx tsx fix-user-data.ts <userId>");
  process.exit(1);
}

fixUserData(userId);
