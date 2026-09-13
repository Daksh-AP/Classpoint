const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.resolve(__dirname, "serviceAccountKey.json"));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}
const db = admin.firestore();

async function seed() {
    console.log("Seeding Grade 9 Super 1 data for Admin Dashboard...");
    
    // 1. Grade 9 Structure for getGradeSections()
    await db.doc("schoolData/grades/gradesList/grade9").set({
        sections: {
            "Super": [1, 2, 3],
            "Whiz": [1, 2]
        }
    });
    console.log("- Set Grade 9 structure");

    // 2. We need a teacher for the smartboard count
    // Find the Grade9Super1 teacher uid
    const teacherSnap = await db.collection("users").where("email", "==", "Grade9Super1@classpoint.com").get();
    let teacherUid = "demo_teacher_grade9";
    if (!teacherSnap.empty) {
        teacherUid = teacherSnap.docs[0].id;
    } else {
        await db.doc("users/demo_teacher_grade9").set({
            name: "Mr. Smith",
            email: "smith@school.edu",
            role: "teacher",
            grade: "9",
            classId: "grade9-super1"
        });
    }
    console.log(`- Teacher is ${teacherUid}`);

    // 3. Setup Smartboard mapped to this teacher
    await db.doc("smartboards/demo_board_9_1").set({
        name: "Board 9 Super 1",
        ownerUid: teacherUid,
        status: "online",
        currentLesson: "Mathematics"
    });
    console.log("- Created Smartboard");

    // 4. Create 32 students for Grade 9 Super 1 to show up in Admin Dashboard stats
    const batch = db.batch();
    for (let i = 1; i <= 32; i++) {
        const studentRef = db.doc(`schoolData/grades/gradesList/grade9/sections/grade9-super1/students/std_${i}`);
        batch.set(studentRef, {
            name: `Student ${i}`,
            id: `std_${i}`,
            attendance: "present"
        });
    }
    await batch.commit();
    console.log("- Created 32 Students");

    // 5. Ensure the Admin User has "Grade Access" array instead of string
    // In setup-accounts.js, gradeAccess was passed as a string `Grade 9` instead of an array. The app expects an array!
    const usersSnap = await db.collection("users").where("role", "==", "admin").get();
    for (const adminDoc of usersSnap.docs) {
        let access = adminDoc.data().gradeAccess;
        if (typeof access === "string") {
            await adminDoc.ref.update({ gradeAccess: [access], activeGrade: access });
            console.log(`- Admin ${adminDoc.id} gradeAccess updated to array`);
        } else if (!access) {
             await adminDoc.ref.update({ gradeAccess: ["Grade 9"], activeGrade: "Grade 9" });
        }
    }

    // Update Grade 9 specifically to make sure it has access to 9
    const grade9AdminSnap = await db.collection("users").where("email", "==", "Grade9@classpoint.com").get();
    for (const adminDoc of grade9AdminSnap.docs) {
         await adminDoc.ref.update({ gradeAccess: ["Grade 9"], activeGrade: "Grade 9" });
    }

    console.log("Seeding Complete!");
    process.exit(0);
}

seed().catch(err => {
    console.error("Error:", err);
    process.exit(1);
});
