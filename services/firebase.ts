import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --------------------------------------------------------
// PASTE YOUR FIREBASE KEYS HERE FROM STEP 1
// --------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyC7QjJKCKmDSobxToDvzU7EAF2PY-thrpc",
  authDomain: "kw-romanian-folk-club.firebaseapp.com",
  projectId: "kw-romanian-folk-club",
  storageBucket: "kw-romanian-folk-club.firebasestorage.app",
  messagingSenderId: "1006030603730",
  appId: "1:1006030603730:web:deaed80503617901c4340b"
};

// Initialize Firebase
// We wrap this in a try-catch so the app doesn't crash if keys aren't set yet
let app, auth, db, storage;

try {
  if (firebaseConfig.apiKey !== "AIzaSyC7QjJKCKmDSobxToDvzU7EAF2PY-thrpc") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("🔥 Firebase Connected Successfully");
  } else {
    console.warn("⚠️ Firebase keys not set. App running in LOCAL DEMO MODE.");
  }
} catch (error) {
  console.error("Firebase Initialization Error:", error);
}

export { auth, db, storage };
