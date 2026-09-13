import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA0kxK-DTY4sGZ4BKVRQ0ADaLzCRJaJBt4",
  authDomain: "classpoint-2.firebaseapp.com",
  projectId: "classpoint-2",
  storageBucket: "classpoint-2.appspot.com",
  messagingSenderId: "798509953266",
  appId: "1:798509953266:web:f133ac64e68b54bba4a06b",
  measurementId: "G-8PYWSQ7W31",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const testAccounts = [
  { email: 'teacher9@genatis.com', pass: 'password123' },
  { email: 'admin@genatis.com', pass: 'password123' },
  { email: 'board_grade9_super1@genatis.com', pass: 'genatis2026' },
  { email: 'admin_grade9@genatis.com', pass: 'genatis2026' },
];

async function testAll() {
  for (const acc of testAccounts) {
    try {
      const userCred = await signInWithEmailAndPassword(auth, acc.email, acc.pass);
      console.log(`✅ SUCCESS: ${acc.email} (UID: ${userCred.user.uid})`);
    } catch (e) {
      console.log(`❌ FAILED: ${acc.email} -> ${e.code}: ${e.message}`);
    }
  }
}

testAll();
