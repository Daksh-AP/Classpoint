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

async function run() {
    console.log('🚀 Starting Board Accounts Seeding...');
    let totalBoards = 0;
    
    for (const [grade, counts] of Object.entries(gradesConfig)) {
        // Super sections
        for (let i = 1; i <= counts.super; i++) {
            const sectionId = `super${i}`;
            await createBoardAccount(grade, sectionId);
            totalBoards++;
        }
        
        // Whiz sections
        for (let i = 1; i <= counts.whiz; i++) {
            const sectionId = `whiz${i}`;
            await createBoardAccount(grade, sectionId);
            totalBoards++;
        }
    }
    
    console.log(`✅ Created ${totalBoards} board accounts successfully!`);
    process.exit(0);
}

async function createBoardAccount(grade, sectionId) {
    const email = `board_grade${grade}_${sectionId}@genatis.com`;
    const uid = `board_g${grade}_${sectionId}`;
    
    try {
        await auth.createUser({
            uid: uid,
            email: email,
            password: 'genatis2026',
            displayName: `Board Grade ${grade} ${sectionId}`
        });
        
        await db.collection('users').doc(uid).set({
            role: 'board',
            grade: grade,
            assignedSections: [sectionId],
            name: `Board Grade ${grade} ${sectionId}`,
            email: email,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Created ${email}`);
    } catch (e) {
        if (e.code === 'auth/email-already-exists' || e.code === 'auth/uid-already-exists') {
            console.log(`⚠️ Account ${email} already exists. Updating role...`);
            await db.collection('users').doc(uid).set({
                role: 'board',
                grade: grade,
                assignedSections: [sectionId],
                name: `Board Grade ${grade} ${sectionId}`,
                email: email
            }, { merge: true });
        } else {
            console.error(`❌ Error creating ${email}:`, e.message);
        }
    }
}

run();
