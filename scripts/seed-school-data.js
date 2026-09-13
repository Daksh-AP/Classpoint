import { readFileSync } from 'fs';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://classpoint-2.firebaseio.com"
    });
}

const db = admin.firestore();

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
    console.log('Seeding School Data (Grades, Sections, and Student Counts)...');
    
    try {
        const batch = db.batch();
        let ops = 0;
        let totalSections = 0;
        
        for (const [grade, counts] of Object.entries(gradesConfig)) {
            const gradeRef = db.doc(`schoolData/grades/gradesList/grade${grade}`);
            
            const superArr = Array.from({length: counts.super}, (_, i) => i + 1);
            const whizArr = Array.from({length: counts.whiz}, (_, i) => i + 1);
            
            batch.set(gradeRef, {
                sections: {
                    "Super": superArr,
                    "Whiz": whizArr
                }
            }, { merge: true });
            ops++;
            
            for (let i of superArr) {
                const sectionId = `grade${grade}-super${i}`;
                const sectionRef = gradeRef.collection('sections').doc(sectionId);
                batch.set(sectionRef, {
                    studentCount: 30, // Default to 30 students per class
                    name: `Grade ${grade} Super ${i}`
                }, { merge: true });
                ops++;
                totalSections++;
            }
            
            for (let i of whizArr) {
                const sectionId = `grade${grade}-whiz${i}`;
                const sectionRef = gradeRef.collection('sections').doc(sectionId);
                batch.set(sectionRef, {
                    studentCount: 30,
                    name: `Grade ${grade} Whiz ${i}`
                }, { merge: true });
                ops++;
                totalSections++;
            }
            
            if (ops > 400) {
                await batch.commit();
                ops = 0;
            }
        }
        
        if (ops > 0) {
            await batch.commit();
        }
        
        console.log(`Successfully seeded ${totalSections} sections with 30 students each!`);
        process.exit(0);
        
    } catch (e) {
        console.error("Error seeding school data:", e);
        process.exit(1);
    }
}

run();
