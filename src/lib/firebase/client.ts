
'use client';

import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Konfigurasi Firebase untuk sisi klien (browser)
// GANTI SEMUA NILAI DI BAWAH INI DENGAN KREDENSIAL DARI PROYEK FIREBASE YANG BENAR
const clientConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "GANTI_DENGAN_API_KEY_YANG_BENAR",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "GANTI_DENGAN_AUTH_DOMAIN_YANG_BENAR",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "GANTI_DENGAN_PROJECT_ID_YANG_BENAR",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "GANTI_DENGAN_STORAGE_BUCKET_YANG_BENAR",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "GANTI_DENGAN_MESSAGING_SENDER_ID_YANG_BENAR",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "GANTI_DENGAN_APP_ID_YANG_BENAR"
};

// Inisialisasi aplikasi sisi klien
const app = !getApps().length ? initializeApp(clientConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
