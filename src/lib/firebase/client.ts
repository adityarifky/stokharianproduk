
'use client';

import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Konfigurasi Firebase untuk sisi klien (browser)
const clientConfig: FirebaseOptions = {
  apiKey: "AIzaSyAQJDNLWevpdsGkFP1rtDyyfy0mKVW4nZg",
  authDomain: "dreampuffapp.firebaseapp.com",
  projectId: "dreampuffapp",
  storageBucket: "dreampuffapp.firebasestorage.app",
  messagingSenderId: "962454426578",
  appId: "1:962454426578:web:a59e8a8f87944893e66e0b",
  measurementId: "G-42WX1SHRR3"
};

// Inisialisasi aplikasi sisi klien
const app = !getApps().length ? initializeApp(clientConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
