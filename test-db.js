const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyA0kxK-DTY4sGZ4BKVRQ0ADaLzCRJaJBt4",
  authDomain: "classpoint-2.firebaseapp.com",
  projectId: "classpoint-2",
  storageBucket: "classpoint-2.appspot.com",
  messagingSenderId: "798509953266",
  appId: "1:798509953266:web:f133ac64e68b54bba4a06b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  console.log("Fetching grades...");
  try {
    const snap = await getDocs(collection(db, 'schoolData/grades/gradesList'));
    console.log(`Found ${snap.docs.length} docs`);
    snap.docs.forEach(doc => console.log(doc.id, doc.data()));
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
