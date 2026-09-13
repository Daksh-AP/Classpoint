const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.resolve(__dirname, "scripts", "serviceAccountKey.json"));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}
const db = admin.firestore();

async function fixGrades() {
  try {
    console.log("Fixing grade8...");
    await db.doc('schoolData/grades/gradesList/grade8').set({
      grade: '8',
      sections: {
        "Super": [1, 2],
        "Regular": [1, 2]
      }
    }, { merge: true });

    console.log("Fixing grade9...");
    await db.doc('schoolData/grades/gradesList/grade9').set({
      grade: '9',
      sections: {
        "Super": [1, 2, 3],
        "Whiz": [1, 2]
      }
    }, { merge: true });

    console.log("Fixing grade10...");
    await db.doc('schoolData/grades/gradesList/grade10').set({
      grade: '10',
      sections: {
        "Super": [1, 2],
        "Whiz": [1]
      }
    }, { merge: true });

    console.log("Successfully fixed grades!");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing grades:", error);
    process.exit(1);
  }
}

fixGrades();
