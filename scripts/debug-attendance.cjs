const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function check() {
    const d = new Date().toISOString().split("T")[0];
    console.log("Checking date:", d);
    const path = `schoolData/grades/gradesList/grade9/sections/grade9-whiz1/attendance/${d}`;
    const doc = await db.doc(path).get();
    if (doc.exists) {
        console.log("Doc exists! Data:", JSON.stringify(doc.data(), null, 2));
    } else {
        console.log("Doc DOES NOT EXIST at path:", path);
    }
}
check();
