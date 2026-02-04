import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCaeJr5gHYXJEwPFzZQKDaHZCA5YyTActg",
  authDomain: "xdd-ai.firebaseapp.com",
  projectId: "xdd-ai",
  storageBucket: "xdd-ai.firebasestorage.app",
  messagingSenderId: "334239466823",
  appId: "1:334239466823:web:8392635790bbfb2429b862",
  measurementId: "G-M1G6R4TS0L"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
