
// DREAMPAD V.12 - Respon Natural AI & Pengambilan Sesi Otomatis

// =========================================================================
// PENJELASAN PERUBAHAN
// =========================================================================
// Bro, ini adalah versi paling sempurna dari kode n8n kita.
// Perubahan utamanya adalah:
// 1. Mengambil nama pengguna secara OTOMATIS dari data Telegram.
// 2. Mengekstrak RESPON NATURAL dari AI untuk dikirim kembali ke user.
//
// ALUR KERJA BARU YANG POWERFUL:
// 1. Telegram Trigger: Menerima pesan dari user + data pengirim (nama, dll).
// 2. AI Agent: Menghasilkan output yang berisi DUA bagian:
//    a. Perintah `tool_code` untuk update stok.
//    b. Kalimat konfirmasi natural ("goks, beres bro!", dll).
// 3. Code (Node ini):
//    a. Mengekstrak `productId` dan `amount` dari tool_code.
//    b. Mengekstrak KALIMAT NATURAL dari output AI.
//    c. MENGAMBIL NAMA DEPAN user langsung dari data Telegram Trigger.
//    d. Menyiapkan output JSON berisi SEMUA data ini.
// 4. HTTP Request: Mengirim SEMUA data ini ke endpoint /api/stock.
// 5. Send a text message: Mengirim KALIMAT NATURAL yang sudah diekstrak ke user.
//
// Dengan cara ini, riwayat tercatat rapi DAN respons bot terasa hidup.
// =========================================================================

// Mengambil output mentah dari node AI Agent sebelumnya
const rawOutput = $('AI Agent').item.json.output;

// Mengambil data lengkap dari Telegram Trigger untuk mendapatkan info user
const triggerData = $('Telegram Trigger').item.json;

// --- Validasi Input Penting ---
if (!rawOutput || !triggerData || !triggerData.message) {
  return [{ json: { error: 'Tidak dapat menemukan output dari AI atau data dari Telegram.' } }];
}

// 1. Ekstrak productId dan amount dari `tool_code`
const productIdMatch = rawOutput.match(/productId='([^']+)'/);
const amountMatch = rawOutput.match(/amount=([-\d.]+)/); // Ditingkatkan untuk desimal dan negatif

const productId = productIdMatch ? productIdMatch[1] : null;
// Diubah untuk menangani angka desimal dan negatif dengan benar
const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

// 2. Ekstrak KALIMAT KONFIRMASI NATURAL dari AI
// Ini akan mengambil semua teks SETELAH baris 'print(updateStock...))'
const naturalResponse = rawOutput.split('\n').slice(2).join('\n').trim();

// 3. Ambil informasi user (nama & posisi) secara OTOMATIS dari Telegram
const userName = triggerData.message.from.first_name || "User Telegram";
const userPosition = "Staf"; // Posisi default, bisa diubah jika perlu

// 4. Siapkan output JSON yang lengkap untuk node-node selanjutnya
const output = {
    // Data untuk node HTTP Request (mengupdate stok)
    productId: productId,
    amount: amount,
    session: {
        name: userName,
        position: userPosition
    },
    
    // Data untuk node "Send a text message" (mengirim balasan ke user)
    natural_response: naturalResponse || "oke, beres bro!" // Fallback jika AI lupa bikin kalimat
};

// Kirim data yang sudah diekstrak ini ke node selanjutnya.
return [{ json: output }];
