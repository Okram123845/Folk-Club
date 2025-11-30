
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

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
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

try {
  // Check if apiKey is present and not a generic placeholder
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Initialize Firestore using standard getFirestore for maximum speed (WebSockets)
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
