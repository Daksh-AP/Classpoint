import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// Firebase config (borrowed from mobile app)
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
const db = getFirestore(app);

const email = 'ppg2744@parent.genatis.com';
const password = '123456';
const username = 'ppg2744';

async function setup() {
  console.log('Setting up parent auth...');
  try {
    try {
      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Created user:', userCredential.user.uid);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        console.log('User already exists. Skipping creation.');
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        throw e;
      }
    }

    await setDoc(doc(db, `schoolData/parentPortal/accounts/${username}`), {
      studentId: 's101',
      sectionId: '9a',
      studentName: 'Demo Student',
      parentName: 'Demo Parent',
      username: 'PPG 2744'
    });
    console.log('Successfully created mapping document.');

  } catch (error) {
    console.error('Error:', error);
  }
}

setup().then(() => process.exit(0));
