
// DREAMPAD V.11 - Arsitektur Terpusat dengan Pengambilan Sesi Otomatis

// =========================================================================
// PENJELASAN PERUBAHAN
// =========================================================================
// Bro, ini adalah kode n8n yang sudah disempurnakan.
// Perubahan utamanya adalah sekarang kita tidak perlu lagi bertanya
// nama dan posisi ke pengguna.
//
// ALUR KERJA BARU:
// 1. Telegram Trigger: Menerima pesan dari user, LENGKAP dengan data pengirim (nama, dll).
// 2. Code (Node ini):
//    a. Mengambil teks pesan dari user.
//    b. MENGAMBIL NAMA DEPAN user langsung dari data Telegram Trigger.
//    c. Menentukan posisi default (misal: "Staf").
//    d. Menyiapkan output JSON yang berisi pesan user DAN informasi sesi (nama & posisi).
// 3. HTTP Request: Mengirim SEMUA data ini ke endpoint /api/chat kita.
//
// Dengan cara ini, website kita akan langsung tahu siapa yang mengirim pesan
// dan bisa mencatat riwayat dengan akurat, tanpa perlu interaksi tambahan.
// Jauh lebih cepat dan efisien.
// =========================================================================


// Mengambil data lengkap dari Telegram Trigger.
const triggerData = $('Telegram Trigger').item.json;

// Validasi input awal.
if (!triggerData || !triggerData.message || !triggerData.message.text) {
  return [{ json: { error: 'Tidak dapat menemukan teks pesan dari Telegram Trigger.' } }];
}

// Mengambil teks pesan terakhir dari user.
const latestUserMessage = triggerData.message.text;

// MENGAMBIL INFORMASI PENGGUNA SECARA OTOMATIS
const userName = triggerData.message.from.first_name || "User Telegram";
const userPosition = "Staf"; // Posisi default, bisa diubah jika perlu

// Siapkan output untuk dikirim ke node HTTP Request berikutnya.
// Strukturnya harus cocok dengan yang diharapkan oleh endpoint /api/chat.
const output = {
  history: [
    {
      role: "user",
      content: [{ text: latestUserMessage }]
    }
  ],
  // Kita selipkan informasi sesi di sini
  session: {
    name: userName,
    position: userPosition
  }
};

// Kirim data ini ke node selanjutnya.
return [{ json: output }];
