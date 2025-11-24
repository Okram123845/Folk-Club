import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// --------------------------------------------------------
// PASTE YOUR FIREBASE KEYS HERE FROM STEP 1
// --------------------------------------------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
// We wrap this in a try-catch so the app doesn't crash if keys aren't set yet
let app, auth, db, storage;

try {
  if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
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
