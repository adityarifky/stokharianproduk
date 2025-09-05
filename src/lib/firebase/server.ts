
import admin from 'firebase-admin';

// Konfigurasi dan inisialisasi Firebase Admin untuk sisi server
// Pastikan variabel lingkungan ini diatur di Vercel

// Periksa apakah variabel lingkungan yang dibutuhkan ada.
// Ini penting untuk mencegah error saat proses build di Vercel.
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.warn("Peringatan: Variabel lingkungan Firebase Admin (PROJECT_ID, PRIVATE_KEY, CLIENT_EMAIL) tidak lengkap. Inisialisasi dilewati.");
} else {
  try {
    const serviceAccount: admin.ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      // Ganti escaped newlines dengan newline character asli.
      privateKey: (process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    // Hanya inisialisasi jika belum ada aplikasi yang berjalan.
    if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin SDK initialized successfully.");
    }
  } catch (error: any) {
    // Log error jika terjadi masalah saat parsing atau inisialisasi
    console.error("Firebase Admin initialization error:", error.message);
  }
}

// Ekspor adminDb, pastikan untuk menanganinya jika tidak terinisialisasi.
// Di dalam route handler, kita harus memeriksa apakah adminDb ada sebelum menggunakannya.
const adminDb = admin.apps.length > 0 ? admin.firestore() : null;

export { adminDb };
