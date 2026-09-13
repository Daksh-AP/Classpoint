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

async function seedGoldenPath() {
    console.log('🚀 Starting Golden Path Seeding...');

    try {
        // 1. Create a Teacher for Grade 9
        const teacherUid = 'teacher_grade9_super1';
        try {
            await auth.createUser({
                uid: teacherUid,
                email: 'teacher9@classora.com',
                password: 'password123',
                displayName: 'Mr. Smith'
            });
            console.log('✅ Created Teacher Auth User');
        } catch (e) {
            if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
                console.log('✅ Teacher Auth User already exists');
                // Ensure password is correct
                await auth.updateUser(teacherUid, { password: 'password123' }).catch(console.error);
            } else {
                throw e;
            }
        }

        // 2. Set Teacher Data in "users" collection
        await db.collection('users').doc(teacherUid).set({
            role: 'teacher',
            grade: '9',
            name: 'Mr. Smith',
            email: 'teacher9@classora.com',
            subjects: ['Math', 'Science'],
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Created Teacher Document');

        // 3. Ensure an Admin user has access to Grade 9
        const adminUid = 'admin_demo_super';
        try {
            await auth.createUser({
                uid: adminUid,
                email: 'admin@classora.com',
                password: 'password123',
                displayName: 'Principal Admin'
            });
            console.log('✅ Created Admin Auth User');
        } catch (e) {
            if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
                console.log('✅ Admin Auth User already exists');
                await auth.updateUser(adminUid, { password: 'password123' }).catch(console.error);
            } else {
                throw e;
            }
        }
        await db.collection('users').doc(adminUid).set({
            role: 'admin',
            gradeAccess: ['Grade 8', 'Grade 9', 'Grade 10'],
            activeGrade: 'Grade 9',
            name: 'Principal Admin',
            email: 'admin@classora.com'
        });
        console.log('✅ Created Admin Document');

        // 4. Create Grade 9 structure and Section 9a
        await db.doc('schoolData/grades/gradesList/9/sections/9a').set({
            name: 'Grade 9 Super 1',
            teacherId: teacherUid,
            room: '101A'
        }, { merge: true });
        console.log('✅ Created Section 9a');

        // 5. Create Students in Section 9a
        const students = [
            { id: 's101', name: 'Demo Student', points: 450, attendance: 'present' },
            { id: 's102', name: 'Alice Walker', points: 320, attendance: 'absent' },
            { id: 's103', name: 'Bob Harris', points: 410, attendance: 'present' }
        ];
        
        for (const student of students) {
            await db.doc(`schoolData/grades/gradesList/9/sections/9a/students/${student.id}`).set(student);
        }
        console.log('✅ Created 3 Students in 9a');

        // 6. Create Smartboard mapping for Admin App
        const boardId = 'SB-001';
        await db.collection('smartboards').doc(boardId).set({
            name: 'Grade 9 Super Board',
            ownerUid: teacherUid,
            sectionId: '9a',
            status: 'online',
            location: 'Room 101A',
            lastActive: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Created Smartboard SB-001');

        // Set Desktop App user settings so it automatically connects
        await db.collection('user_settings').doc(teacherUid).set({
            connectedSmartboardId: boardId,
            selectedSection: { id: '9a', name: 'Grade 9 Super 1' },
            settings: { theme: 'dark' }
        }, { merge: true });
        console.log('✅ Bound Smartboard to Desktop App');

        // 7. Seed Learning Loss & Context
        await db.doc(`classContexts/9`).set({
            currentTopic: 'Algebraic Expressions',
            learningGap: 'Fractions and basic probability',
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        // 8. Seed Timetable for teacher
        const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        await db.collection('timetables').doc(teacherUid).set({
            [currentDay]: [
                { startTime: '08:00 AM', endTime: '09:00 AM', subject: 'Mathematics' },
                { startTime: '09:00 AM', endTime: '10:00 AM', subject: 'Science' }
            ]
        }, { merge: true });
        console.log('✅ Seeded Timetable');

        // 9. Create a Dummy Teacher for Grade 8 (To prove Security Segregation)
        const dummyUid = 'teacher_grade8_dummy';
        try {
            await auth.createUser({
                uid: dummyUid,
                email: 'teacher8@classora.com',
                password: 'password123',
                displayName: 'Ms. Dummy'
            });
            console.log('✅ Created Dummy Teacher 8 Auth User');
        } catch (e) {
            if (e.code === 'auth/uid-already-exists' || e.code === 'auth/email-already-exists') {
                console.log('✅ Dummy Teacher 8 Auth User already exists');
                await auth.updateUser(dummyUid, { password: 'password123' }).catch(console.error);
            } else {
                throw e;
            }
        }
        await db.collection('users').doc(dummyUid).set({
            role: 'teacher',
            grade: '8',
            assignedSections: ['8a'],
            name: 'Ms. Dummy',
            email: 'teacher8@classora.com',
            subjects: ['History'],
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Created Dummy Teacher 8 Document');

        // Also ensure Teacher 9 has explicit section assignment
        await db.collection('users').doc(teacherUid).set({
            assignedSections: ['9a']
        }, { merge: true });

        console.log('🎉 Golden Path Seeding Complete!');
    } catch (err) {
        console.error('❌ Seeding failed:', err);
    }
}

seedGoldenPath().then(() => process.exit(0));
