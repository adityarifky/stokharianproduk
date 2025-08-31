
import admin from 'firebase-admin';

// Konfigurasi dan inisialisasi Firebase Admin untuk sisi server
// Pastikan variabel lingkungan ini diatur di Vercel
const serviceAccount: admin.ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("Firebase Admin initialization error:", error.message);
  }
}

const adminDb = admin.firestore();

export { adminDb };
