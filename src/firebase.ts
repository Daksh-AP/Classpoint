import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  persistentLocalCache,
  persistentMultipleTabManager
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { v4 as uuidv4 } from "uuid";
import { getSchoolId } from "./lib/firebase/paths";

// firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA0kxK-DTY4sGZ4BKVRQ0ADaLzCRJaJBt4",
  authDomain: "classpoint-2.firebaseapp.com",
  projectId: "classpoint-2",
  storageBucket: "classpoint-2.appspot.com",
  messagingSenderId: "798509953266",
  appId: "1:798509953266:web:f133ac64e68b54bba4a06b",
  measurementId: "G-8PYWSQ7W31",
};

// init firebase
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {});
const auth = getAuth(app);

// register a new smartboard
const registerSmartboard = async (ownerUid: any, name: string, location: any, schoolId?: string) => {
  const activeSchoolId = schoolId || getSchoolId();
  const smartboardsRef = collection(db, "schools", activeSchoolId, "smartboards");
  const boardId = uuidv4();
  const newSmartboardRef = doc(smartboardsRef, boardId);

  try {
    await setDoc(newSmartboardRef, {
      boardId,
      ownerUid,
      name,
      location,
      status: 'offline',
      createdAt: new Date().toISOString(),
    });
// /* console.log */ ("✅ Smartboard registered:", boardId);
    return { boardId, name, location };
  } catch (error) {
// /* console.error */ ("🔥 Error registering smartboard:", error);
    throw error;
  }
};

// get smartboard by id
const getSmartboard = async (boardId: string, schoolId?: string) => {
  const activeSchoolId = schoolId || getSchoolId();
  const smartboardRef = doc(db, "schools", activeSchoolId, "smartboards", boardId);
  try {
    const docSnap = await getDoc(smartboardRef);
    if (docSnap.exists()) {
// /* console.log */ ("📘 Smartboard data:", docSnap.data());
      return docSnap.data();
    } else {
// /* console.warn */ ("⚠️ No such smartboard!");
      return null;
    }
  } catch (error) {
// /* console.error */ ("🔥 Error fetching smartboard:", error);
    throw error;
  }
};

// get all smartboards owned by a user
const getUserSmartboards = async (ownerUid: any, schoolId?: string) => {
  const activeSchoolId = schoolId || getSchoolId();
  const smartboardsRef = collection(db, "schools", activeSchoolId, "smartboards");
  const q = query(smartboardsRef, where("ownerUid", "==", ownerUid));

  try {
    const querySnapshot = await getDocs(q);
    const boards = querySnapshot.docs.map((doc: any) => doc.data());
// /* console.log */ ("📋 Smartboards fetched:", boards);
    return boards;
  } catch (error) {
// /* console.error */ ("🔥 Error fetching registered smartboards:", error);
    throw error;
  }
};

// 🔥 EXPORT EVERYTHING CLEANLY 🔥
export {
  app,
  db,
  auth,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  writeBatch,
  registerSmartboard,
  getSmartboard,
  getUserSmartboards,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};

