
'use client';

import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Konfigurasi Firebase untuk sisi klien (browser)
const clientConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDfMpLH9Pvg6g-nnd307AH5wxpXBDeWbZs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "stokprodukharian.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "stokprodukharian",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "stokprodukharian.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "580169268436",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:580169268436:web:bfbd3f7e01c0b4a9e6cf41"
};

// Inisialisasi aplikasi sisi klien
const app = !getApps().length ? initializeApp(clientConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
