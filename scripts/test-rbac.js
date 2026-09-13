import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA0kxK-DTY4sGZ4BKVRQ0ADaLzCRJaJBt4",
  authDomain: "classpoint-2.firebaseapp.com",
  projectId: "classpoint-2",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testRBAC() {
    console.log("🔒 Starting RBAC Security Test...\n");

    try {
        // Test 1: Log in as Teacher 8 (Grade 8)
        console.log("Signing in as Teacher 8 (teacher8@genatis.com)...");
        await signInWithEmailAndPassword(auth, 'teacher8@genatis.com', 'password123');
        console.log("✅ Successfully signed in as Teacher 8");

        // Attempt to write to Grade 9 section (Should FAIL)
        console.log("\n🛑 Attemping malicious write: Teacher 8 trying to modify Grade 9, Section 9a...");
        try {
            await setDoc(doc(db, 'schoolData/grades/gradesList/9/sections/9a/files/hacked_file'), {
                hacked: true
            });
            console.log("❌ CRITICAL FAILURE: Teacher 8 was able to write to Grade 9!");
        } catch (error) {
            if (error.code === 'permission-denied') {
                console.log("✅ SUCCESS: Firebase blocked the malicious write! (Permission Denied)");
            } else {
                console.log("❓ Unexpected error:", error.message);
            }
        }

        // Test 2: Log in as Teacher 9 (Grade 9)
        console.log("\nSigning in as Teacher 9 (teacher9@genatis.com)...");
        await signInWithEmailAndPassword(auth, 'teacher9@genatis.com', 'password123');
        console.log("✅ Successfully signed in as Teacher 9");

        // Attempt to write to Grade 9 section (Should SUCCEED)
        console.log("\n🟢 Attempting valid write: Teacher 9 modifying their own Grade 9, Section 9a...");
        try {
            await setDoc(doc(db, 'schoolData/grades/gradesList/9/sections/9a/files/valid_file'), {
                success: true
            });
            console.log("✅ SUCCESS: Teacher 9 was allowed to write to their own section.");
        } catch (error) {
            console.log("❌ FAILURE: Teacher 9 was blocked from their own section! Error:", error.message);
        }

    } catch (err) {
        console.error("Test framework error:", err);
    }
    
    process.exit(0);
}

testRBAC();
