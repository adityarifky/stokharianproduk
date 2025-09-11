
// --- Kode Final yang Paling Cerdas (Versi 5) ---
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

// Keyword Stok: Dibuat lebih luas
const stockKeywords = ['stok', 'stock', 'produk', 'sisa', 'ada apa', 'cek'];

// Keyword Riwayat: Tetap spesifik
const historyKeywords = ['riwayat', 'history', 'masuk keluar', 'perbandingan', 'penambahan produk', 'aktivitas produk'];

// Keyword Laporan: Tetap spesifik
const reportKeywords = ['laporan', 'report', 'laporan harian'];

// --- Logika Penentuan Intent yang Baru ---
const containsCategory = categories.some(cat => userMessage.includes(cat));
const containsStockKeyword = stockKeywords.some(keyword => userMessage.includes(keyword));

if (reportKeywords.some(keyword => userMessage.includes(keyword))) {
  intent = 'get_reports';
  endpoint = `${baseUrl}/api/reports`;
} else if (historyKeywords.some(keyword => userMessage.includes(keyword))) {
  intent = 'get_history';
  endpoint = `${baseUrl}/api/history`;
} else if (containsStockKeyword || containsCategory) {
  // LOGIKA BARU: Jika pesan mengandung keyword stok ATAU nama kategori,
  // maka kita anggap itu adalah permintaan stok.
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
    apiData = {
      error: `Terjadi masalah saat menghubungi API: ${errorMessage}`
    };
  }
}

const output = {
  user_message: triggerData.message.text,
  intent: intent,
  relevant_data: apiData
};

return [{ json: output }];
