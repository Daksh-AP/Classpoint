/**
 * ClassPoint Account Setup Script
 * 
 * Creates:
 * - 10 grade-wise admin accounts for mobile (Grade1@classpoint.com – Grade10@classpoint.com)
 * - 72 section-wise teacher accounts for desktop (e.g., Grade8Super1@classpoint.com)
 * 
 * Usage:
 *   1. Download your Firebase service account key from Firebase Console
 *   2. Save it as: scripts/serviceAccountKey.json
 *   3. Run: node scripts/setup-accounts.js
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require(path.resolve(__dirname, "serviceAccountKey.json"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ─── Grade/Section Structure ─────────────────────────────────────────────────
const GRADES = {
  1:  { Super: [1,2,3,4],   Whiz: [1,2,3,4]   },
  2:  { Super: [1,2,3,4,5], Whiz: [1,2,3,4]   },
  3:  { Super: [1,2,3,4],   Whiz: [1,2,3,4]   },
  4:  { Super: [1,2,3,4,5], Whiz: [1,2,3,4,5] },
  5:  { Super: [1,2,3,4],   Whiz: [1,2,3,4]   },
  6:  { Super: [1,2,3,4],   Whiz: [1,2,3,4]   },
  7:  { Super: [1,2,3],     Whiz: [1,2,3]     },
  8:  { Super: [1,2,3],     Whiz: [1,2,3]     },
  9:  { Super: [1,2,3],     Whiz: [1,2]       },
  10: { Super: [1,2],       Whiz: [1,2]       },
};

// ─── Helper: Delete all existing Firebase Auth users ─────────────────────────
async function deleteAllUsers() {
  console.log("\n🗑️  Deleting all existing Firebase Auth users...\n");
  let totalDeleted = 0;

  const listAndDelete = async (nextPageToken) => {
    const listResult = await admin.auth().listUsers(1000, nextPageToken);
    if (listResult.users.length === 0) return;

    const uids = listResult.users.map(u => u.uid);
    const deleteResult = await admin.auth().deleteUsers(uids);
    totalDeleted += deleteResult.successCount;

    console.log(`   Deleted batch: ${deleteResult.successCount} users (${deleteResult.failureCount} failed)`);

    if (listResult.pageToken) {
      await listAndDelete(listResult.pageToken);
    }
  };

  await listAndDelete();
  console.log(`\n   ✅ Total deleted: ${totalDeleted} users\n`);
}

// ─── Helper: Create a single Firebase Auth user + Firestore profile ──────────
async function createAccount(email, password, role, displayName, extraFields = {}) {
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });

    const userDoc = {
      uid: userRecord.uid,
      email,
      name: displayName,
      role,
      createdAt: Date.now(),
      ...extraFields,
    };

    await db.collection("users").doc(userRecord.uid).set(userDoc);

    console.log(`   ✅ ${email} (${role}) → uid: ${userRecord.uid}`);
    return userRecord;
  } catch (error) {
    console.error(`   ❌ ${email}: ${error.message}`);
    return null;
  }
}

// ─── Main Setup ──────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║       ClassPoint Account Setup Script           ║");
  console.log("╚══════════════════════════════════════════════════╝");

  // Step 1: Delete all existing users
  await deleteAllUsers();

  // Step 2: Create mobile grade accounts (admin role)
  console.log("📱 Creating MOBILE grade accounts (admin role)...\n");
  const gradeAccounts = [];
  for (let g = 1; g <= 10; g++) {
    const email = `Grade${g}@classpoint.com`;
    const password = `ClassG${g}!2026`;
    const displayName = `Grade ${g}`;
    const result = await createAccount(email, password, "admin", displayName, {
      gradeAccess: `Grade ${g}`,
      grade: `${g}`,
    });
    if (result) {
      gradeAccounts.push({ email, password, uid: result.uid, grade: g });
    }
  }

  // Step 3: Create desktop section accounts (teacher role)
  console.log("\n🖥️  Creating DESKTOP section accounts (teacher role)...\n");
  const sectionAccounts = [];
  for (const [gradeNum, types] of Object.entries(GRADES)) {
    for (const [typeName, numbers] of Object.entries(types)) {
      for (const num of numbers) {
        const typeAbbrev = typeName.charAt(0); // S or W
        const email = `Grade${gradeNum}${typeName}${num}@classpoint.com`;
        const password = `CP${gradeNum}${typeAbbrev}${num}!2026`;
        const displayName = `Grade ${gradeNum} ${typeName} ${num}`;
        const sectionId = `grade${gradeNum}-${typeName.toLowerCase()}${num}`;
        const result = await createAccount(email, password, "teacher", displayName, {
          grade: `${gradeNum}`,
          classId: sectionId,
        });
        if (result) {
          sectionAccounts.push({ email, password, uid: result.uid, grade: gradeNum, section: sectionId });
        }
      }
    }
  }

  // Summary
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║                   SUMMARY                       ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`\n   📱 Mobile grade accounts created: ${gradeAccounts.length}`);
  console.log(`   🖥️  Desktop section accounts created: ${sectionAccounts.length}`);
  console.log(`   📊 Total accounts: ${gradeAccounts.length + sectionAccounts.length}`);

  console.log("\n\n📱 MOBILE ACCOUNTS:");
  console.log("─".repeat(55));
  for (const acc of gradeAccounts) {
    console.log(`   ${acc.email.padEnd(30)} Password: ${acc.password}`);
  }

  console.log("\n🖥️  DESKTOP ACCOUNTS:");
  console.log("─".repeat(55));
  for (const acc of sectionAccounts) {
    console.log(`   ${acc.email.padEnd(38)} Password: ${acc.password}`);
  }

  console.log("\n✅ Setup complete!\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
