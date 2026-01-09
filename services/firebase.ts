
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// --------------------------------------------------------
// Firebase Configuration
// --------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDD7UyXS23aYJ-vg-5rhlWBjbJ4vTF6v_s",
  authDomain: "kw-romanian-folk-club-37b02.firebaseapp.com",
  projectId: "kw-romanian-folk-club-37b02",
  storageBucket: "kw-romanian-folk-club-37b02.firebasestorage.app",
  messagingSenderId: "160742434938",
  appId: "1:160742434938:web:2c6d82a5bb4b351d8573c3"
};

// Initialize Firebase Core
const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize and export services
// This ensures that sub-modules like Auth register correctly with the initialized app
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

console.log("🔥 Firebase initialized successfully");

export { auth, db, storage };
