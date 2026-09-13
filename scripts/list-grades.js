// Quick script to list all grades and sections from Firestore
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, orderBy } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyA0kxK-DTY4sGZ4BKVRQ0ADaLzCRJaJBt4",
  authDomain: "classpoint-2.firebaseapp.com",
  projectId: "classpoint-2",
  storageBucket: "classpoint-2.firebasestorage.app",
  messagingSenderId: "798509953266",
  appId: "1:798509953266:web:f133ac64e68b54bba4a06b",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listGrades() {
  try {
    const gradesRef = collection(db, "schoolData/grades/gradesList");
    const q = query(gradesRef, orderBy("grade"));
    const snapshot = await getDocs(q);
    
    console.log("=== Grades and Sections in Firestore ===\n");
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Grade ${data.grade}:`);
      if (data.sections) {
        for (const [type, numbers] of Object.entries(data.sections)) {
          console.log(`  ${type}: ${JSON.stringify(numbers)}`);
        }
      }
      console.log();
    });
    
    if (snapshot.empty) {
      console.log("No grades found in schoolData/grades/gradesList");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
  process.exit(0);
}

listGrades();
