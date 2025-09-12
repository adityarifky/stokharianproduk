

// --- Kode Final yang Lebih Cerdas dan Cepat (Versi 9) ---
const triggerData = $('Telegram Trigger').item.json;

// Validasi input awal, jika tidak ada pesan, hentikan lebih awal.
if (!triggerData || !triggerData.message || !triggerData.message.text) {
  return [{ json: { error: 'Tidak dapat menemukan teks pesan dari Telegram Trigger.' } }];
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
let intent = 'general_chat'; // Default intent

// --- Definisi Keyword yang Jelas ---
const stockKeywords = ['stok', 'stock', 'produk', 'sisa', 'ada apa', 'cek', 'punya apa'];
const reportKeywords = ['laporan', 'report', 'laporan harian'];
const historyKeywords = ['riwayat', 'history', 'masuk keluar', 'aktivitas'];
const categories = ["creampuff", "cheesecake", "millecrepes", "minuman", "snackbox", "lainnya"];

// --- Logika Penentuan Intent yang Lebih Cepat dan Efisien ---

// Cek intent yang paling spesifik terlebih dahulu
if (reportKeywords.some(keyword => userMessage.includes(keyword))) {
  intent = 'get_reports';
  endpoint = `${baseUrl}/api/reports`;
} else if (historyKeywords.some(keyword => userMessage.includes(keyword))) {
  intent = 'get_history';
  endpoint = `${baseUrl}/api/history`;
} else if (stockKeywords.some(keyword => userMessage.includes(keyword)) || categories.some(cat => userMessage.includes(cat))) {
  // Jika ini adalah permintaan stok, set intent dan bangun endpoint
  intent = 'get_stock';
  endpoint = `${baseUrl}/api/stock`;
  
  // Cari kategori spesifik jika ada, untuk memfilter hasil.
  // Ini memastikan bahwa jika user menyebut "millecrepes", kita hanya akan mengirimkan data millecrepes.
  const foundCategory = categories.find(cat => userMessage.includes(cat));
  if (foundCategory) {
    endpoint += `?category=${foundCategory}`;
  }
}
// Jika tidak ada keyword yang cocok, intent akan tetap 'general_chat' dan tidak ada panggilan API yang dilakukan.

// --- Panggilan API Hanya Jika Diperlukan ---
// Panggilan ke API hanya terjadi jika salah satu dari intent di atas terdeteksi dan endpoint di-set.
// Untuk 'general_chat', blok ini akan dilewati, membuat respons jauh lebih cepat.
if (endpoint) {
  try {
    apiData = await this.helpers.httpRequest({
      url: endpoint,
      headers: options.headers,
      json: true
    });
  } catch (error) {
    // Tangani error jika API gagal dihubungi
    apiData = {
      error: `Terjadi masalah saat menghubungi API: ${error.message || 'Unknown error'}`
    };
  }
}

// --- PERUBAHAN DIMULAI DI SINI: Bersihkan data sebelum dikirim ke AI ---

// Buat salinan data yang aman untuk dimodifikasi
let relevantDataForAI = apiData ? JSON.parse(JSON.stringify(apiData)) : null;

// Jika datanya adalah array (daftar produk), loop dan hapus field 'image'
if (Array.isArray(relevantDataForAI)) {
  relevantDataForAI.forEach(item => {
    if (item && typeof item === 'object') {
      delete item.image; // Hapus data gambar
    }
  });
}

// --- Siapkan Output untuk Node Berikutnya (AI Agent) dengan data yang sudah bersih ---
const output = {
  user_message: triggerData.message.text,
  intent: intent,
  relevant_data: relevantDataForAI // Ini data yang sudah ringan tanpa gambar
};

return [{ json: output }];
