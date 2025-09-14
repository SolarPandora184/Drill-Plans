// Server-side Firebase configuration (no analytics on server)
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration (same as client but no analytics)
const firebaseConfig = {
  apiKey: "AIzaSyD6LPigxx9Z7tLLppCuLyVFZL2ivPi9SPQ",
  authDomain: "drill-plan-system.firebaseapp.com",
  projectId: "drill-plan-system",
  storageBucket: "drill-plan-system.firebasestorage.app",
  messagingSenderId: "302757144421",
  appId: "1:302757144421:web:10fdf2f69e1d5c24a6238c"
  // measurementId removed for server-side config
};

// Initialize Firebase for server (no analytics)
const app = initializeApp(firebaseConfig, 'server-app');

// Initialize Firebase services (only server-compatible ones)
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };