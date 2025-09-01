
'use client';

import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Konfigurasi Firebase untuk sisi klien (browser)
const clientConfig: FirebaseOptions = {
  apiKey: "AIzaSyDfMpLH9Pvg6g-nnd307AH5wxpXBDeWbZs",
  authDomain: "stokprodukharian.firebaseapp.com",
  projectId: "stokprodukharian",
  storageBucket: "stokprodukharian.firebasestorage.app",
  messagingSenderId: "580169268436",
  appId: "1:580169268436:web:bfbd3f7e01c0b4a9e6cf41",
  measurementId: "G-XML0ZJ09C1"
};

// Inisialisasi aplikasi sisi klien
const app = !getApps().length ? initializeApp(clientConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
