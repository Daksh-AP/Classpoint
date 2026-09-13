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

async function run() {
    console.log('🚀 Starting Grade Admins Seeding...');
    let totalAdmins = 0;
    
    for (let grade = 1; grade <= 10; grade++) {
        const email = `admin_grade${grade}@genatis.com`;
        const uid = `admin_g${grade}`;
        
        try {
            await auth.createUser({
                uid: uid,
                email: email,
                password: 'genatis2026',
                displayName: `Grade ${grade} Admin`
            });
            
            await db.collection('users').doc(uid).set({
                role: 'admin',
                gradeAccess: [`Grade ${grade}`],
                name: `Grade ${grade} Admin`,
                email: email,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Created ${email}`);
            totalAdmins++;
        } catch (e) {
            if (e.code === 'auth/email-already-exists' || e.code === 'auth/uid-already-exists') {
                console.log(`⚠️ Account ${email} already exists. Updating role...`);
                await db.collection('users').doc(uid).set({
                    role: 'admin',
                    gradeAccess: [`Grade ${grade}`],
                    name: `Grade ${grade} Admin`,
                    email: email
                }, { merge: true });
                totalAdmins++;
            } else {
                console.error(`❌ Error creating ${email}:`, e.message);
            }
        }
    }
    
    console.log(`✅ Processed ${totalAdmins} admin accounts successfully!`);
    process.exit(0);
}

run();
