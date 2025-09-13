
// DREAMPAD V.12 - Respon Natural AI & Pengambilan Sesi Otomatis
// VERSI PERBAIKAN FINAL - Menggunakan referensi node eksplisit

// =========================================================================
// PENJELASAN PERUBAHAN
// =========================================================================
// Bro, ini adalah versi yang sudah diperbaiki total.
// MASALAHNYA: Kode sebelumnya mencoba mengambil data dari 'Telegram Trigger'
// dengan cara yang tidak bisa dilakukan dari dalam node ini.
//
// SOLUSINYA: Kita akan secara EKSPLISIT memberitahu n8n untuk melihat
// kembali ke node 'Telegram Trigger' menggunakan sintaks `$('...').item`.
// Ini adalah cara yang paling anti-error.
// =========================================================================


// Mengambil output dari node sebelumnya (node 'If')
// $input.item.json.output adalah cara yang benar untuk input langsung
const rawOutput = $input.item.json.output;

// MENGAMBIL DATA LANGSUNG DARI SUMBERNYA SECARA EKSPLISIT
// Ini adalah kunci perbaikannya. Kita panggil langsung node 'Telegram Trigger'.
const triggerData = $('Telegram Trigger').item.json;

// --- Validasi Input Penting ---
// Pemeriksaan ini penting untuk mencegah error jika ada data yang kosong.
if (!rawOutput || !triggerData || !triggerData.message) {
  // Jika ada yang salah, kita hentikan dan beri pesan error yang jelas.
  throw new Error('Tidak dapat menemukan output dari AI atau data dari Telegram Trigger.');
}

// 1. Ekstrak productId dan amount dari `tool_code`
const productIdMatch = rawOutput.match(/productId='([^']+)'/);
const amountMatch = rawOutput.match(/amount=([-\d.]+)/); // Ditingkatkan untuk desimal & negatif

const productId = productIdMatch ? productIdMatch[1] : null;
const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

// 2. Ekstrak KALIMAT KONFIRMASI NATURAL dari AI
// PERBAIKAN DI SINI: Mengambil teks SETELAH tag penutup tool_code. Ini lebih andal.
const naturalResponse = rawOutput.split('))').pop().trim();

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
// Ini adalah format return yang benar di n8n.
return [{ json: output }];
