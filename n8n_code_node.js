// DREAMPAD V.10 - Arsitektur Terpusat (Disarankan)

// =========================================================================
// PENJELASAN ARSITEKTUR BARU
// =========================================================================
// Bro, workflow ini sekarang jadi super simpel. Semua logika "otak"-nya
// (mendeteksi maksud, bertanya nama, memanggil tool, menjawab) sudah 
// dipindahkan ke dalam kode aplikasi Next.js kita di file:
// -> src/ai/flows/chat-flow.ts
// -> src/app/api/chat/route.ts
//
// Workflow N8N ini sekarang hanya bertugas sebagai "KURIR" atau "JEMBATAN"
// antara Telegram dan API aplikasi kita.
//
// ALUR KERJA:
// 1. Telegram Trigger: Menerima pesan dari user.
// 2. Code (Node ini): Mengambil teks pesan dari user.
// 3. HTTP Request: Mengirim pesan user ke endpoint /api/chat di aplikasi kita.
// 4. Send a text message: Mengambil jawaban FINAL dari API dan mengirimnya ke user.
//
// Ini adalah praktik terbaik karena membuat semuanya terpusat, lebih mudah 
// di-debug, dan jauh lebih powerful.
// =========================================================================


// Mengambil data dari Telegram Trigger.
const triggerData = $('Telegram Trigger').item.json;

// Validasi input awal.
if (!triggerData || !triggerData.message || !triggerData.message.text) {
  // Jika tidak ada pesan, kita hentikan di sini.
  // Sebaiknya, tambahkan node "NoOp" (Do Nothing) setelah ini untuk error handling.
  return [{ json: { error: 'Tidak dapat menemukan teks pesan dari Telegram Trigger.' } }];
}

// Hanya mengambil history chat terakhir dari user.
// Aplikasi kita sekarang yang akan mengelola history lengkap.
const latestUserMessage = triggerData.message.text;

// Siapkan output untuk dikirim ke node HTTP Request berikutnya.
// Strukturnya harus cocok dengan yang diharapkan oleh endpoint /api/chat.
const output = {
  history: [
    {
      role: "user",
      content: [{ text: latestUserMessage }]
    }
  ]
};

// Kirim data ini ke node selanjutnya.
return [{ json: output }];
