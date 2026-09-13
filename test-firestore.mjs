import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA0kxK-DTY4sGZ4BKVRQ0ADaLzCRJaJBt4",
  authDomain: "classpoint-2.firebaseapp.com",
  projectId: "classpoint-2",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function getUsers() {
  await signInWithEmailAndPassword(auth, 'admin_grade9@genatis.com', 'genatis2026');
  const snap = await getDocs(collection(db, 'users'));
  snap.forEach(doc => console.log(doc.id, doc.data().email, doc.data().name, doc.data().role, doc.data().grade));
  process.exit(0);
}
getUsers();
