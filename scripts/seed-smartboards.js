import { readFileSync } from 'fs';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://classpoint-2.firebaseio.com"
    });
}

const db = admin.firestore();

async function run() {
    console.log('Starting Auto-Registration of Smartboards...');
    let totalBoards = 0;
    
    try {
        const usersSnap = await db.collection('users').where('role', '==', 'board').get();
        
        const batch = db.batch();
        
        usersSnap.forEach((doc) => {
            const userData = doc.data();
            const boardId = `board_${doc.id}`; // Generate a unique board ID based on UID
            
            const boardRef = db.collection('smartboards').doc(boardId);
            
            // Convert sectionId (e.g. "whiz1") to Display Name (e.g. "Whiz 1")
            let sectionName = userData.assignedSections?.[0] || "Unknown";
            const typeMatch = sectionName.match(/([a-zA-Z]+)(\d+)/);
            let displaySection = sectionName;
            if (typeMatch) {
                const typeStr = typeMatch[1];
                const typeCap = typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
                displaySection = `${typeCap} ${typeMatch[2]}`;
            }

            batch.set(boardRef, {
                boardId: boardId,
                ownerUid: doc.id,
                name: `Grade ${userData.grade} ${displaySection} Board`,
                location: `Grade ${userData.grade} ${displaySection} Classroom`,
                status: 'offline', // default
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Also automatically "link" the smartboard to the board account's user settings
            const settingsRef = db.collection('user_settings').doc(doc.id);
            batch.set(settingsRef, {
                connectedSmartboardId: boardId
            }, { merge: true });
            
            totalBoards++;
        });
        
        await batch.commit();
        console.log(`Successfully auto-registered and linked ${totalBoards} smartboards!`);
        process.exit(0);
        
    } catch (e) {
        console.error("Error auto-registering smartboards:", e);
        process.exit(1);
    }
}

run();
