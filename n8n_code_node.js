
// DREAMPAD V.13 - Perbaikan Logika Ekstraksi Total
// =========================================================================
// PENJELASAN PERUBAHAN
// =========================================================================
// Bro, ini adalah perbaikan total berdasarkan screenshot-mu.
// MASALAHNYA: Logika sebelumnya gagal memisahkan antara perintah tool_code
// dan kalimat balasan natural dari AI, menyebabkan data yang diekstrak salah.
//
// SOLUSINYA: Kita akan menggunakan Regex (Regular Expressions) yang lebih
// canggih untuk secara spesifik menargetkan dan mengekstrak setiap bagian
// yang kita butuhkan dari string output AI. Ini adalah cara yang paling andal.
// =========================================================================

// Mengambil output mentah dari node 'If'
const rawOutput = $input.item.json.output;

// 1. Ekstrak HANYA perintah `tool_code` yang pertama.
// Ini penting untuk mencegah kebingungan jika AI menghasilkan banyak perintah.
const toolCodeMatch = rawOutput.match(/print\(updateStock\(.*?\)\)/);
const toolCode = toolCodeMatch ? toolCodeMatch[0] : '';

// 2. Dari dalam `toolCode` itu, ekstrak productId dan amount.
const productIdMatch = toolCode.match(/productId='([^']+)'/);
const amountMatch = toolCode.match(/amount=([-\d.]+)/);

const productId = productIdMatch ? productIdMatch[1] : null;
const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

// 3. Ekstrak KALIMAT KONFIRMASI NATURAL dari AI.
// Logika ini membuang semua bagian `tool_code` dan hanya menyisakan kalimat bersih.
const naturalResponse = rawOutput
  .replace(/calling tool_code/g, '')
  .replace(/print\(updateStock\(.*?\)\)/g, '')
  .replace(/\\n/g, ' ') // Ganti newline dengan spasi
  .replace(/\s+/g, ' ') // Hapus spasi berlebih
  .trim();

// 4. Siapkan output JSON yang lengkap dan bersih.
// Kita tidak lagi butuh referensi ke Telegram Trigger di sini.
const output = {
    productId: productId,
    amount: amount,
    natural_response: naturalResponse || "oke, beres bro!" // Fallback jika AI lupa
};

// 5. Kirim data yang sudah diekstrak ini ke node selanjutnya.
return [{ json: output }];
