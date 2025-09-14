// Server-side Firebase configuration (no analytics on server)
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration (same as client but no analytics)
const firebaseConfig = {
  apiKey: "AIzaSyAHJTzaycRMyKRJ_zGHjdRGgstEl4W__VQ",
  authDomain: "squadron-121-drill-plan-system.firebaseapp.com",
  databaseURL: "https://squadron-121-drill-plan-system-default-rtdb.firebaseio.com",
  projectId: "squadron-121-drill-plan-system",
  storageBucket: "squadron-121-drill-plan-system.firebasestorage.app",
  messagingSenderId: "802558272123",
  appId: "1:802558272123:web:6b58b596bd9c669c80f8de"
  // measurementId removed for server-side config
};

// Initialize Firebase for server (no analytics)
const app = initializeApp(firebaseConfig, 'server-app');

// Initialize Firebase services (only server-compatible ones)
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };