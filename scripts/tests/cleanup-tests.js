import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(readFileSync(path.join(__dirname, '..', 'serviceAccountKey.json'), 'utf8'));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function deleteCollection(collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();
  const batchSize = snapshot.docs.length;
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
    deleteQueryBatch(db, query, resolve);
  });
}

async function clearTestData() {
    console.log("🧹 Clearing stress test data...");
    
    try {
        await deleteCollection('test_attendance', 500);
        await deleteCollection('test_smartboards', 500);
        await deleteCollection('test_contexts', 500);
        
        // Delete chats (subcollections are harder to delete in admin sdk without recursion, but we only have 1 doc)
        const messages = await db.collection('test_chats').doc('broadcast_thread_1').collection('messages').get();
        const batch = db.batch();
        messages.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        await db.collection('test_chats').doc('broadcast_thread_1').delete();

        console.log("✅ Stress test data cleared successfully!");
    } catch (e) {
        console.error("❌ Failed to clear data:", e);
    }
    process.exit(0);
}

clearTestData();
