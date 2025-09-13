
// Mengambil data dari input
const rawOutput = $input.item.json.output;
const triggerMessage = $('Telegram Trigger').first().json.message.text;
// --- BARU: Ambil daftar produk asli dari node sebelumnya ---
const productList = $('Get All Products').all().map(item => item.json);

// Variabel untuk menampung hasil
let productId = null;
let productName = null; // Untuk pencarian
let amount = null;
let naturalResponse = "oke, beres bro!";
let sessionName = null;
let sessionPosition = null;

// Regex untuk mencari tool_code
const toolCodeRegex = /calling\s+tool_code\s+print\(updateStock\((.*?)\)\)/s;
const toolCodeMatch = rawOutput.match(toolCodeRegex);

if (toolCodeMatch) {
  // Ambil nama & posisi dari trigger message
  const parts = triggerMessage.trim().split(/\s+/);
  if (parts.length > 0) {
    sessionName = parts[0]; 
    sessionPosition = parts.slice(1).join(' ') || 'User';
  }

  // Ekstrak argumen dari tool_code
  const toolArgs = toolCodeMatch[1];
  const amountMatch = toolArgs.match(/amount=([-\d]+)/);
  if (amountMatch) amount = parseInt(amountMatch[1], 10);
  
  // Ambil respon natural dari AI
  const responseText = rawOutput.substring(rawOutput.indexOf(toolCodeMatch[0]) + toolCodeMatch[0].length).trim();
  if (responseText) naturalResponse = responseText;

  // --- LOGIKA BARU & PALING PENTING ---
  // Ekstrak NAMA produk dari kalimat natural AI
  // Kita cari nama produk yang ada di productList di dalam kalimat AI
  for (const product of productList) {
    if (naturalResponse.toLowerCase().includes(product.name.toLowerCase())) {
      productName = product.name; // Dapet namanya
      productId = product.id;     // Dapet ID aslinya!
      break; 
    }
  }
  
} else {
  naturalResponse = rawOutput.trim();
}

// Kembalikan semuanya, ID asli dan nama produk untuk fallback
return {
  json: {
    productId: productId, // Sekarang ini ID yang BENAR
    name: productName,    // Tambahkan nama untuk dikirim ke API
    amount: amount,
    natural_response: naturalResponse,
    session: {
      name: sessionName,
      position: sessionPosition
    }
  }
};
