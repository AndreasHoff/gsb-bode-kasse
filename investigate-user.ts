import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
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
const auth = getAuth();

async function investigateUser() {
  const userId = "Dj3LOCfTRjhVX0655NpCkqzGkxw2";

  console.log("\n=== INVESTIGATING USER ===\n");
  console.log(`UserId: ${userId}\n`);

  try {
    // 1. Check Firebase Auth
    console.log("1. FIREBASE AUTH INFO:");
    const authUser = await auth.getUser(userId);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Display Name: ${authUser.displayName}`);
    console.log(`   Created At: ${authUser.metadata.creationTime}`);
    console.log(`   Last Sign-In: ${authUser.metadata.lastSignInTime}\n`);
  } catch (error) {
    console.error(`   ❌ Error fetching auth user: ${error}\n`);
  }

  // 2. Check Firestore User Document
  console.log("2. FIRESTORE USER DOCUMENT:");
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log(`   ✓ User document exists`);
      console.log(`   Data:`, JSON.stringify(userData, null, 2));
    } else {
      console.log(`   ❌ User document DOES NOT exist in Firestore`);
    }
    console.log();
  } catch (error) {
    console.error(`   ❌ Error fetching user document: ${error}\n`);
  }

  // 3. Check Memberships (collection group query)
  console.log("3. TEAM MEMBERSHIPS (Collection Group Query):");
  try {
    const membershipsSnap = await db
      .collectionGroup("members")
      .where("userId", "==", userId)
      .get();

    if (membershipsSnap.empty) {
      console.log(`   ❌ No memberships found for this user`);
    } else {
      console.log(`   ✓ Found ${membershipsSnap.size} membership(s):\n`);
      membershipsSnap.docs.forEach((doc) => {
        const membership = doc.data();
        const ref = doc.ref;
        const teamId = ref.parent.parent?.id;
        console.log(`   Team: ${teamId}`);
        console.log(`   Data:`, JSON.stringify(membership, null, 2));
        console.log();
      });
    }
  } catch (error) {
    console.error(`   ❌ Error fetching memberships: ${error}\n`);
  }

  // 4. Check if any teams exist
  console.log("4. ALL TEAMS IN FIRESTORE:");
  try {
    const teamsSnap = await db.collection("teams").get();
    if (teamsSnap.empty) {
      console.log(`   No teams found`);
    } else {
      console.log(`   Found ${teamsSnap.size} team(s):\n`);
      for (const teamDoc of teamsSnap.docs) {
        const teamData = teamDoc.data();
        console.log(`   - Team ID: ${teamDoc.id}`);
        console.log(`     Name: ${teamData.name}`);

        // Check members in this team
        const membersSnap = await db
          .collection("teams")
          .doc(teamDoc.id)
          .collection("members")
          .get();
        console.log(`     Members count: ${membersSnap.size}`);

        if (!membersSnap.empty) {
          console.log(`     Members:`);
          membersSnap.docs.forEach((memberDoc) => {
            const memberData = memberDoc.data();
            console.log(
              `       - ${memberDoc.id} (${memberData.role}) - Active: ${memberData.isActive}`
            );
          });
        }
        console.log();
      }
    }
  } catch (error) {
    console.error(`   ❌ Error fetching teams: ${error}\n`);
  }

  console.log("=== END INVESTIGATION ===\n");
  process.exit(0);
}

investigateUser();
