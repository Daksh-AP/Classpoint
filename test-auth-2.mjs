import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA0kxK-DTY4sGZ4BKVRQ0ADaLzCRJaJBt4",
  authDomain: "classpoint-2.firebaseapp.com",
  projectId: "classpoint-2",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const testAccounts = [
  { email: 'teacher_grade9@genatis.com', pass: 'classora2026' },
  { email: 'teacher9@genatis.com', pass: 'classora2026' },
  { email: 'teacher_g9@genatis.com', pass: 'classora2026' },
  { email: 'teacher@genatis.com', pass: 'classora2026' },
];

async function testAll() {
  for (const acc of testAccounts) {
    try {
      await signInWithEmailAndPassword(auth, acc.email, acc.pass);
      console.log('SUCCESS: ' + acc.email);
    } catch (e) {
      console.log('FAILED: ' + acc.email);
    }
  }
  process.exit(0);
}
testAll();
