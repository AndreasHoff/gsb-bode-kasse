/**
 * Simple reconciliation utility (CommonJS)
 * Run with: node src/scripts/reconcile-seasons.cjs <teamId>
 */

const { config } = require("dotenv");
const { initializeApp } = require("firebase/app");
const { getFirestore, getDocs, collection } = require("firebase/firestore");

config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error("❌ Firebase config not found. Make sure .env.local exists with VITE_FIREBASE_* variables");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listTeams() {
  console.log("📋 Available teams:\n");
  
  try {
    const teamsSnapshot = await getDocs(collection(db, "teams"));
    
    if (teamsSnapshot.empty) {
      console.log("⚠️  No teams found.\n");
      return;
    }

    const teams = teamsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
    }));

    teams.forEach((team, idx) => {
      console.log(`  ${idx + 1}. ${team.name}`);
      console.log(`     ID: ${team.id}\n`);
    });

    console.log("💡 Copy a team ID and run:\n");
    console.log(`   node src/scripts/reconcile-seasons.cjs <teamId>\n`);
  } catch (error) {
    console.error("❌ Error fetching teams:", error.message);
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2];

  if (!command) {
    console.error("❌ Missing argument: teamId or --list");
    console.error("\nUsage:");
    console.error("  node src/scripts/reconcile-seasons.cjs --list          (list all teams)");
    console.error("  node src/scripts/reconcile-seasons.cjs <teamId>        (reconcile specific team)\n");
    process.exit(1);
  }

  if (command === "--list") {
    await listTeams();
  } else {
    console.log(`Team ID to reconcile: ${command}\n`);
    console.log("This script requires TypeScript compilation.");
    console.log("For now, use the --list command to see your teams.\n");
    console.log("Then run: npx tsx src/scripts/reconcile-seasons.ts <teamId>\n");
  }
}

main().catch(error => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
