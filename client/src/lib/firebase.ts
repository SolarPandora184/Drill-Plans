// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD6LPigxx9Z7tLLppCuLyVFZL2ivPi9SPQ",
  authDomain: "drill-plan-system.firebaseapp.com",
  databaseURL: "https://drill-plan-system-default-rtdb.firebaseio.com",
  projectId: "drill-plan-system",
  storageBucket: "drill-plan-system.firebasestorage.app",
  messagingSenderId: "302757144421",
  appId: "1:302757144421:web:10fdf2f69e1d5c24a6238c",
  measurementId: "G-YZ1YTYWPNW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
const db = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, analytics, db, storage, auth };