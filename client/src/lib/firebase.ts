// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAHJTzaycRMyKRJ_zGHjdRGgstEl4W__VQ",
  authDomain: "squadron-121-drill-plan-system.firebaseapp.com",
  databaseURL: "https://squadron-121-drill-plan-system-default-rtdb.firebaseio.com",
  projectId: "squadron-121-drill-plan-system",
  storageBucket: "squadron-121-drill-plan-system.firebasestorage.app",
  messagingSenderId: "802558272123",
  appId: "1:802558272123:web:6b58b596bd9c669c80f8de",
  measurementId: "G-FXFVGV5358"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, analytics, db, storage, auth };