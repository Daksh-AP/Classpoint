const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

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

async function fixGrades() {
  try {
    console.log("Fixing grade8...");
    await setDoc(doc(db, 'schoolData/grades/gradesList/grade8'), {
      grade: '8',
      sections: {
        "Super": [1, 2],
        "Regular": [1, 2]
      }
    }, { merge: true });

    console.log("Fixing grade9...");
    await setDoc(doc(db, 'schoolData/grades/gradesList/grade9'), {
      grade: '9',
      sections: {
        "Super": [1, 2, 3],
        "Whiz": [1, 2]
      }
    }, { merge: true });

    console.log("Fixing grade10...");
    await setDoc(doc(db, 'schoolData/grades/gradesList/grade10'), {
      grade: '10',
      sections: {
        "Super": [1, 2],
        "Whiz": [1]
      }
    }, { merge: true });

    console.log("Successfully fixed grades!");
  } catch (error) {
    console.error("Error fixing grades:", error);
  }
}

fixGrades();
