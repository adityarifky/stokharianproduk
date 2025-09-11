
// --- Versi Final yang Paling Lengkap & Cerdas (Versi 6) ---
const triggerData = $('Telegram Trigger').item.json;

if (!triggerData || !triggerData.message || !triggerData.message.text) {
  return [{ json: { error: 'Tidak dapat menemukan pesan dari Telegram Trigger.' } }];
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
let apiData = null;
let intent = 'general_chat'; // Defaultnya selalu general chat

// --- Kamus Keyword & Kategori yang Lebih Fleksibel ---
const categories = ["creampuff", "cheesecake", "millecrepes", "minuman", "snackbox", "lainnya"];
const stockKeywords = ['stok', 'stock', 'produk', 'sisa', 'ada apa', 'cek'];
const historyKeywords = ['riwayat', 'history', 'masuk keluar', 'perbandingan', 'penambahan produk', 'aktivitas produk'];
const reportKeywords = ['laporan', 'report', 'laporan harian'];

// --- BAGIAN BARU: Keyword untuk Aksi/Perintah ---
const actionKeywords = ['tambah', 'kurang', 'update', 'ubah', 'ganti', 'hapus', 'laku', 'terjual', 'buat', 'bikin', 'reset'];

// --- Logika Penentuan Intent yang Baru dan Disempurnakan ---
const containsCategory = categories.some(cat => userMessage.includes(cat));
const containsStockKeyword = stockKeywords.some(keyword => userMessage.includes(keyword));
const containsActionKeyword = actionKeywords.some(keyword => userMessage.includes(keyword));

if (containsActionKeyword) {
  // Jika ada kata kunci aksi, ini adalah perintah yang butuh 'tool'
  intent = 'action_required';
  // Untuk 'action_required', kita butuh daftar semua produk agar AI tahu ID-nya.
  endpoint = `${baseUrl}/api/stock`; 
} else if (reportKeywords.some(keyword => userMessage.includes(keyword))) {
  intent = 'get_reports';
  endpoint = `${baseUrl}/api/reports`;
} else if (historyKeywords.some(keyword => userMessage.includes(keyword))) {
  intent = 'get_history';
  endpoint = `${baseUrl}/api/history`;
} else if (containsStockKeyword || containsCategory) {
  // Logika lama: Jika mengandung keyword stok ATAU nama kategori, ini permintaan info stok.
  intent = 'get_stock';
  endpoint = `${baseUrl}/api/stock`;
  
  // Cari kategori yang spesifik untuk ditambahkan ke filter
  const foundCategory = categories.find(cat => userMessage.includes(cat));
  if (foundCategory) {
    endpoint += `?category=${foundCategory}`;
  }
}
// Jika tidak ada kondisi di atas yang terpenuhi, 'intent' akan tetap 'general_chat'.

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

// Untuk 'action_required', kita akan ganti nama 'apiData' menjadi 'productList' agar lebih jelas untuk AI.
if (intent === 'action_required' && apiData) {
    // Ubah nama field 'relevant_data' menjadi 'productList' untuk kejelasan di prompt AI
    const output = {
        user_message: triggerData.message.text, 
        intent: intent,
        productList: apiData // AI akan menerima daftar produk lengkap dengan ID dan stok saat ini.
    };
    return [{ json: output }];
}

// Untuk intent lainnya, gunakan struktur output yang lama
const output = {
  user_message: triggerData.message.text, 
  intent: intent,
  relevant_data: apiData
};

return [{ json: output }];
