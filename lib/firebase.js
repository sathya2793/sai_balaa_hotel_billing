// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD1eqy8DPWIsklPvaCkD7qeJOlQmnGxbi4",
  authDomain: "sai-balaa.firebaseapp.com",
  projectId: "sai-balaa",
  storageBucket: "sai-balaa.firebasestorage.app",
  messagingSenderId: "359014426749",
  appId: "1:359014426749:web:95df75b7b4edaa9d42e914",
  measurementId: "G-LSQ5ZD2FRZ"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);