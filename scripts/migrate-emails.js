import { readFileSync } from 'fs';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://classpoint-2.firebaseio.com"
});

const db = admin.firestore();
const auth = admin.auth();

async function run() {
    console.log('🚀 Starting Email Migration: @classora.com -> @genatis.com');
    
    // 1. Migrate Firebase Auth Users
    const listUsersResult = await auth.listUsers(1000);
    for (const userRecord of listUsersResult.users) {
        if (userRecord.email && userRecord.email.endsWith('@classora.com')) {
            const newEmail = userRecord.email.replace('@classora.com', '@genatis.com');
            try {
                await auth.updateUser(userRecord.uid, { email: newEmail });
                console.log(`✅ Auth: Updated ${userRecord.email} to ${newEmail}`);
            } catch (e) {
                console.error(`❌ Error updating auth for ${userRecord.email}: ${e.message}`);
            }
        }
    }

    // 2. Migrate Firestore Users collection
    const usersSnap = await db.collection('users').get();
    for (const doc of usersSnap.docs) {
        const data = doc.data();
        if (data.email && data.email.endsWith('@classora.com')) {
            const newEmail = data.email.replace('@classora.com', '@genatis.com');
            try {
                await doc.ref.update({ email: newEmail });
                console.log(`✅ Firestore: Updated user doc ${doc.id} to ${newEmail}`);
            } catch (e) {
                console.error(`❌ Error updating doc ${doc.id}: ${e.message}`);
            }
        }
    }

    console.log('🎉 Migration Complete!');
    process.exit(0);
}

run();
