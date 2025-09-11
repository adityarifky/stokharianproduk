// --- Versi Final yang Paling Sederhana & Stabil (Versi 11) ---

// Mengambil data input dari node sebelumnya. Ini cara yang paling standar dan andal.
const triggerData = $input.item.json;

// Pengecekan keamanan yang fokus pada input saat ini.
if (!triggerData || !triggerData.message || !triggerData.message.text) {
  // Jika input tidak valid, langsung kirim pesan error yang jelas.
  return [{ json: { error: 'Waduh, bro! Maaf banget nih, kayaknya lagi ada masalah teknis, jadi aku nggak bisa nemuin pesan atau histori yang valid. Coba ulangi lagi ya!' } }];
}

// Tidak perlu lagi memanggil API dari sini, karena API `/api/chat` sudah pintar.
// Tugas node ini hanya meneruskan pesan dari user.

const output = {
  // Kita hanya perlu meneruskan pesan user. 
  // Histori akan dikelola oleh node Memory atau langsung di-build di node HTTP Request.
  user_message: triggerData.message.text, 
};

// Kirim output sederhana ini ke node selanjutnya.
return [{ json: output }];
