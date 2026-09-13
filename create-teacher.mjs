import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA0kxK-DTY4sGZ4BKVRQ0ADaLzCRJaJBt4",
  authDomain: "classpoint-2.firebaseapp.com",
  projectId: "classpoint-2",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function createTeacher() {
  try {
    const cred = await createUserWithEmailAndPassword(auth, 'teacher9@genatis.com', 'genatis2026');
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: 'teacher9@genatis.com',
      name: 'Grade 9 Teacher',
      role: 'teacher',
      grade: '9',
      createdAt: Date.now()
    });
    console.log('Created teacher9@genatis.com');
  } catch(e) {
    console.log(e);
  }
  process.exit(0);
}
createTeacher();
