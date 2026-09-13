import { readFileSync } from 'fs';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://classpoint-2.firebaseio.com"
});

const db = admin.firestore();
const auth = admin.auth();

const gradesConfig = {
    1: { super: 4, whiz: 4 },
    2: { super: 4, whiz: 4 },
    3: { super: 4, whiz: 4 },
    4: { super: 5, whiz: 4 },
    5: { super: 5, whiz: 4 },
    6: { super: 4, whiz: 4 },
    7: { super: 4, whiz: 3 },
    8: { super: 3, whiz: 3 },
    9: { super: 3, whiz: 3 },
    10: { super: 3, whiz: 3 }
};

async function deleteQueryBatch(query, resolve) {
    const snapshot = await query.get();
    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(query, resolve);
    });
}

async function deleteCollection(collectionPath, batchSize = 500) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.limit(batchSize);
    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve).catch(reject);
    });
}

async function run() {
    console.log('🚀 Starting Mass Wipe and Reseed...');

    // 1. Wipe Auth Users
    console.log('🗑️ Deleting all Auth Users...');
    try {
        const listUsersResult = await auth.listUsers(1000);
        const uids = listUsersResult.users.map(user => user.uid);
        if (uids.length > 0) {
            await auth.deleteUsers(uids);
            console.log(`✅ Deleted ${uids.length} auth users.`);
        }
    } catch (e) {
        console.error('Error deleting auth users:', e);
    }

    // 2. Wipe Users Collection
    console.log('🗑️ Deleting users collection...');
    await deleteCollection('users');
    console.log('✅ Wiped users collection.');

    // 3. Wipe schoolData/grades/gradesList
    console.log('🗑️ Wiping existing grades and sections...');
    try {
        if (db.recursiveDelete) {
            const gradesRef = db.collection('schoolData').doc('grades').collection('gradesList');
            await db.recursiveDelete(gradesRef);
            console.log('✅ Wiped existing grades tree.');
        } else {
            console.log('⚠️ recursiveDelete not available, relying on overwriting.');
        }
    } catch (e) {
        console.warn('Could not recursively delete grades (maybe already empty or unsupported). Continuing...', e.message);
    }

    // 4. Create new sections
    console.log('🌱 Seeding new sections...');
    let totalSections = 0;
    
    for (const [grade, counts] of Object.entries(gradesConfig)) {
        const gradeDocPath = `schoolData/grades/gradesList/grade${grade}`;
        // Ensure grade doc exists
        await db.doc(gradeDocPath).set({ grade: `Grade ${grade}` }, { merge: true });

        // Create Super sections
        for (let i = 1; i <= counts.super; i++) {
            const sectionId = `super${i}`;
            await db.doc(`${gradeDocPath}/sections/${sectionId}`).set({
                id: sectionId,
                name: `Super ${i}`,
                room: `Room ${grade}0${i}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            totalSections++;
        }
        
        // Create Whiz sections
        for (let i = 1; i <= counts.whiz; i++) {
            const sectionId = `whiz${i}`;
            await db.doc(`${gradeDocPath}/sections/${sectionId}`).set({
                id: sectionId,
                name: `Whiz ${i}`,
                room: `Room ${grade}1${i}`,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            totalSections++;
        }
    }
    
    console.log(`✅ Seeded ${totalSections} sections across ${Object.keys(gradesConfig).length} grades.`);

    // 5. Recreate Default Admin and Teacher
    console.log('👤 Recreating default Admin and Teacher accounts...');
    
    // Admin
    const adminUid = 'admin_demo_super';
    try {
        await auth.createUser({
            uid: adminUid,
            email: 'admin@classora.com',
            password: 'password123',
            displayName: 'Principal Admin'
        });
        await db.collection('users').doc(adminUid).set({
            role: 'admin',
            gradeAccess: ['Grade 4', 'Grade 5', 'Grade 6'],
            activeGrade: 'Grade 4',
            name: 'Principal Admin',
            email: 'admin@classora.com'
        });
        console.log('✅ Admin created (admin@classora.com)');
    } catch (e) { console.error('Error creating admin:', e.message); }

    // Teacher
    const teacherUid = 'teacher_grade4_super1';
    try {
        await auth.createUser({
            uid: teacherUid,
            email: 'teacher4@classora.com',
            password: 'password123',
            displayName: 'Mr. Smith'
        });
        await db.collection('users').doc(teacherUid).set({
            role: 'teacher',
            grade: '4',
            assignedSections: ['super1', 'super2'],
            name: 'Mr. Smith',
            email: 'teacher4@classora.com',
            subjects: ['Math', 'Science'],
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Teacher created (teacher4@classora.com)');
    } catch (e) { console.error('Error creating teacher:', e.message); }

    console.log('🎉 Reseed complete!');
    process.exit(0);
}

run();
