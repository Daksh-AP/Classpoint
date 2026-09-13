const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.resolve(__dirname, "serviceAccountKey.json"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}
const db = admin.firestore();

async function migrateUsers() {
    try {
        console.log("Starting user migration...");
        const usersRef = db.collection("users");
        
        // Find users who have string gradeAccess
        const snapshot = await usersRef.where("role", "==", "admin").get();
        if (snapshot.empty) {
            console.log("No admin users found.");
            return;
        }

        let count = 0;
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            if (data.gradeAccess && typeof data.gradeAccess === 'string') {
                await doc.ref.update({
                    gradeAccess: [data.gradeAccess],
                    activeGrade: data.gradeAccess,
                    // Optionally assign another grade to demonstrate multi-grade support
                    // if it's Grade 8, maybe add Grade 9 just for testing:
                    ...(data.gradeAccess === 'Grade 8' && {
                        gradeAccess: ['Grade 8', 'Grade 9']
                    })
                });
                console.log(`Updated user ${data.email} with activeGrade = ${data.gradeAccess}`);
                count++;
            } else if (!data.activeGrade && Array.isArray(data.gradeAccess) && data.gradeAccess.length > 0) {
                // If it was already converted but missing activeGrade
                await doc.ref.update({
                    activeGrade: data.gradeAccess[0]
                });
                console.log(`Added activeGrade to ${data.email}`);
                count++;
            }
        }
        
        console.log(`Migration complete! Successfully updated ${count} users.`);
    } catch (e) {
        console.error("Migration failed:", e);
    }
}

migrateUsers();
