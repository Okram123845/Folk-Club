
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDD7UyXS23aYJ-vg-5rhlWBjbJ4vTF6v_s",
  authDomain: "kw-romanian-folk-club-37b02.firebaseapp.com",
  projectId: "kw-romanian-folk-club-37b02",
  storageBucket: "kw-romanian-folk-club-37b02.firebasestorage.app",
  messagingSenderId: "160742434938",
  appId: "1:160742434938:web:2c6d82a5bb4b351d8573c3"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("🔥 Firebase initialized successfully");
