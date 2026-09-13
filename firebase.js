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
  onSnapshot,
  CACHE_SIZE_UNLIMITED,
  persistentLocalCache,
  persistentSingleTabManager
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// Same Firebase project as the desktop app
const firebaseConfig = {
  apiKey: "AIzaSyA0kxK-DTY4sGZ4BKVRQ0ADaLzCRJaJBt4",
  authDomain: "classpoint-2.firebaseapp.com",
  projectId: "classpoint-2",
  storageBucket: "classpoint-2.firebasestorage.app",
  messagingSenderId: "798509953266",
  appId: "1:798509953266:web:f133ac64e68b54bba4a06b",
  measurementId: "G-8PYWSQ7W31",
};

const app = initializeApp(firebaseConfig);

// Use persistent local cache for offline support
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager(),
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  })
});

const auth = getAuth(app);

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
  onSnapshot,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};
