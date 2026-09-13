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

async function runChatLoadTest() {
    console.log("📣 Starting The Viral Announcement (Chat Load Test)");
    const PARENT_COUNT = 100;
    
    console.log(`Simulating ${PARENT_COUNT} parents replying to a school-wide broadcast simultaneously...`);

    const startTime = Date.now();
    const promises = [];

    // Simulate 100 concurrent message writes to the same chat thread
    for (let p = 0; p < PARENT_COUNT; p++) {
        const messagePromise = db.collection('test_chats').doc('broadcast_thread_1').collection('messages').add({
            text: `Thanks for the update! Parent ${p}`,
            senderId: `parent_${p}`,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        promises.push(messagePromise);
    }

    try {
        await Promise.all(promises);
        const endTime = Date.now();
        console.log(`\n✅ SUCCESS: All ${PARENT_COUNT} concurrent messages delivered!`);
        console.log(`⏱️ Total Execution Time: ${endTime - startTime} ms`);
        
        // Verify no dropped messages
        const snap = await db.collection('test_chats').doc('broadcast_thread_1').collection('messages').get();
        console.log(`📊 Verified Messages in Thread: ${snap.size}/${PARENT_COUNT}`);
        if (snap.size === PARENT_COUNT) {
            console.log("🛡️ ZERO data drops under heavy concurrent load to a single document collection.");
        }
    } catch (err) {
        console.error("❌ FAILED: Database bottleneck detected.", err);
    }

    process.exit(0);
}

runChatLoadTest();
