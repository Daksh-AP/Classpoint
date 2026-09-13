import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function runAttendanceStressTest() {
    console.log("🔥 Starting The 8:00 AM Rush (Attendance Stress Test)");
    const TEACHER_COUNT = 50;
    const STUDENTS_PER_CLASS = 30;
    
    console.log(`Simulating ${TEACHER_COUNT} teachers simultaneously marking attendance for ${STUDENTS_PER_CLASS} students each...`);
    console.log(`Total database writes triggered: ${TEACHER_COUNT * STUDENTS_PER_CLASS}`);

    const startTime = Date.now();
    const promises = [];

    for (let t = 0; t < TEACHER_COUNT; t++) {
        const teacherPromise = (async () => {
            const batch = db.batch();
            for (let s = 0; s < STUDENTS_PER_CLASS; s++) {
                const docRef = db.collection('test_attendance').doc(`class_${t}_student_${s}`);
                batch.set(docRef, {
                    status: Math.random() > 0.1 ? 'present' : 'absent',
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    teacherId: `teacher_${t}`
                });
            }
            await batch.commit();
        })();
        promises.push(teacherPromise);
    }

    try {
        await Promise.all(promises);
        const endTime = Date.now();
        console.log(`\n✅ SUCCESS: All ${TEACHER_COUNT * STUDENTS_PER_CLASS} attendance records committed!`);
        console.log(`⏱️ Total Execution Time: ${endTime - startTime} ms`);
        console.log(`⚡ Throughput: ${((TEACHER_COUNT * STUDENTS_PER_CLASS) / ((endTime - startTime) / 1000)).toFixed(2)} writes/sec`);
    } catch (err) {
        console.error("❌ FAILED: Database bottleneck detected.", err);
    }

    process.exit(0);
}

runAttendanceStressTest();
