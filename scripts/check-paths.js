const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.resolve(__dirname, "serviceAccountKey.json"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

async function checkPaths() {
    const gradesRef = db.collection("schoolData/grades/gradesList");
    const gradesSnap = await gradesRef.get();
    
    console.log("Grades List Collection:");
    for (const doc of gradesSnap.docs) {
        console.log(`- Doc ID: ${doc.id}`);
        console.log(`  Data:`, doc.data());
        
        // Also check if there's a sections subcollection
        const sectionsRef = db.collection(`schoolData/grades/gradesList/${doc.id}/sections`);
        const sectionsSnap = await sectionsRef.get();
        console.log(`  Sections in ${doc.id}: ${sectionsSnap.size}`);
        if(sectionsSnap.size > 0) {
            sectionsSnap.forEach(s => console.log(`    - Section Doc ID: ${s.id}`));
        }
    }
}

checkPaths().catch(console.error);
