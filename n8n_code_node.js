// --- Versi Final yang Paling Lengkap & Cerdas (Versi 9 - Back to Basics) ---

// Mengambil data input dari node sebelumnya. Ini cara yang paling standar dan andal.
const triggerData = $input.item.json;

// Pengecekan keamanan yang lebih sederhana dan fokus pada input saat ini.
if (!triggerData || !triggerData.message || !triggerData.message.text) {
  // Jika input tidak valid, langsung kirim pesan error yang jelas.
  return [{ json: { error: 'Waduh, bro! Maaf banget nih, kayaknya lagi ada masalah teknis, jadi aku nggak bisa nemuin pesan atau histori yang valid. Coba ulangi lagi ya!' } }];
}

const userMessage = triggerData.message.text.toLowerCase();

const baseUrl = 'https://stokharianproduk.vercel.app'; 
const apiKey = 'Dr3@mPuff_n8n_!nT3gR@t!On-2024#XYZ'; // GANTI DENGAN API KEY-MU

const options = {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
  },
};

let endpoint = '';
let intent = 'general_chat'; // Defaultnya selalu general chat

// --- Kamus Keyword & Kategori yang Lebih Fleksibel ---
const categories = ["creampuff", "cheesecake", "millecrepes", "minuman", "snackbox", "lainnya"];
const stockKeywords = ['stok', 'stock', 'produk', 'sisa', 'ada apa', 'cek'];
const historyKeywords = ['riwayat', 'history', 'masuk keluar', 'perbandingan', 'penambahan produk', 'aktivitas produk'];
const reportKeywords = ['laporan', 'report', 'laporan harian'];
const actionKeywords = ['tambah', 'kurang', 'update', 'ubah', 'ganti', 'hapus', 'laku', 'terjual', 'buat', 'bikin', 'reset'];

// --- Logika Penentuan Intent yang Sudah Terbukti Benar ---
const containsCategory = categories.some(cat => userMessage.includes(cat));
const containsStockKeyword = stockKeywords.some(keyword => userMessage.includes(keyword));
const containsActionKeyword = actionKeywords.some(keyword => userMessage.includes(keyword));

if (containsActionKeyword) {
  intent = 'action_required';
  // Untuk 'action_required', AI butuh daftar semua produk untuk mendapatkan ID.
  endpoint = `${baseUrl}/api/stock`; 
} else if (reportKeywords.some(keyword => userMessage.includes(keyword))) {
  intent = 'get_reports';
  endpoint = `${baseUrl}/api/reports`;
} else if (historyKeywords.some(keyword => userMessage.includes(keyword))) {
  intent = 'get_history';
  endpoint = `${baseUrl}/api/history`;
} else if (containsStockKeyword || containsCategory) {
  intent = 'get_stock';
  endpoint = `${baseUrl}/api/stock`;
  
  const foundCategory = categories.find(cat => userMessage.includes(cat));
  if (foundCategory) {
    endpoint += `?category=${foundCategory}`;
  }
}
// Jika tidak ada kondisi di atas yang terpenuhi, 'intent' akan tetap 'general_chat'.

let apiData = null;
if (endpoint) {
  try {
    apiData = await this.helpers.httpRequest({
        url: endpoint,
        headers: options.headers,
        json: true
    });
  } catch (error) {
    const errorMessage = error.message || 'Unknown error';
    apiData = { error: `Terjadi masalah saat menghubungi API: ${errorMessage}` };
  }
}

// Logika if-else yang sudah benar untuk memastikan hanya satu format output yang dikirim.
if (intent === 'action_required') {
    const output = {
        user_message: triggerData.message.text, 
        intent: intent,
        productList: apiData // AI akan menerima daftar produk lengkap dengan ID dan stok saat ini.
    };
    return [{ json: output }];
} else {
    const output = {
      user_message: triggerData.message.text, 
      intent: intent,
      relevant_data: apiData
    };
    return [{ json: output }];
}
