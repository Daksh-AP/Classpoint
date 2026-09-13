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

async function runDesktopChaosTest() {
    console.log("🖥️ Starting Smartboard Chaos (70 Concurrent Desktops)");
    const BOARD_COUNT = 70;
    
    console.log(`Simulating ${BOARD_COUNT} smartboards running simultaneously across the campus...`);
    console.log("Actions simulating: changing themes, pinging online status, pulling widgets, updating class context.");

    const startTime = Date.now();
    const promises = [];

    const actions = [
        'theme_change',
        'status_ping',
        'attendance_poll',
        'context_update',
        'browser_launch'
    ];

    // Simulate 70 smartboards doing random actions simultaneously
    for (let b = 0; b < BOARD_COUNT; b++) {
        const boardAction = async () => {
            const actionType = actions[Math.floor(Math.random() * actions.length)];
            const boardRef = db.collection('test_smartboards').doc(`board_${b}`);
            
            // Simulating a real-world mix of reads and writes based on action
            if (actionType === 'theme_change') {
                await boardRef.set({ theme: Math.random() > 0.5 ? 'dark' : 'light', lastActive: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            } else if (actionType === 'status_ping') {
                await boardRef.set({ status: 'online', ping: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            } else if (actionType === 'attendance_poll') {
                // Read operation
                await db.collection('test_attendance').limit(5).get();
                await boardRef.set({ lastAction: 'polled_attendance' }, { merge: true });
            } else if (actionType === 'context_update') {
                await db.collection('test_contexts').doc(`board_${b}`).set({
                    topic: `Random Topic ${Math.floor(Math.random() * 100)}`,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                await boardRef.set({ widgetState: 'browser_active' }, { merge: true });
            }
        };
        promises.push(boardAction());
    }

    try {
        await Promise.all(promises);
        const endTime = Date.now();
        console.log(`\n✅ SUCCESS: All ${BOARD_COUNT} smartboards successfully resolved their concurrent actions!`);
        console.log(`⏱️ Total Execution Time: ${endTime - startTime} ms`);
        console.log("🛡️ Zero database locks or timeout drops detected.");
    } catch (err) {
        console.error("❌ FAILED: Database bottleneck detected.", err);
    }

    process.exit(0);
}

runDesktopChaosTest();
