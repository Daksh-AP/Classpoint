const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.resolve(__dirname, "serviceAccountKey.json"));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

async function checkPaths() {
    const idsToCheck = ['1', '8', 'grade1', 'grade8'];
    
    for (const id of idsToCheck) {
        console.log(`\n=== Checking ID: ${id} ===`);
        
        // Check grade doc itself
        const d = await db.collection("schoolData/grades/gradesList").doc(id).get();
        if(d.exists) console.log(`Doc exists in gradesList: YES`, d.data());
        else console.log(`Doc exists in gradesList: NO`);
        
        // Check sections subcollection
        const sectionsRef = db.collection(`schoolData/grades/gradesList/${id}/sections`);
        const sectionsSnap = await sectionsRef.get();
        console.log(`Sections count in subcollection: ${sectionsSnap.size}`);
        
        if (sectionsSnap.size > 0) {
            sectionsSnap.forEach(s => {
                console.log(`  - ${s.id}`);
            });
        }
    }
}

checkPaths().catch(console.error);
