// Mengambil output mentah dari AI Agent
const rawOutput = $input.item.json.output;

// Variabel untuk menampung hasil ekstraksi
let productId = null;
let amount = null;
let naturalResponse = "oke, beres bro!"; // Default fallback

// Pola regex untuk menemukan blok tool_code
const toolCodeRegex = /calling tool_code print\(updateStock\((.*?)\)\)/s;
const toolCodeMatch = rawOutput.match(toolCodeRegex);

if (toolCodeMatch) {
  // toolCodeMatch[0] adalah seluruh blok tool_code, cth: "calling tool_code print(updateStock(...))"
  // toolCodeMatch[1] adalah bagian dalam kurung updateStock, cth: "productId='xyz', amount=-1"
  const toolArgs = toolCodeMatch[1];
  
  // 1. Ekstrak productId dan amount HANYA dari dalam argumen tool
  const productIdMatch = toolArgs.match(/productId='([^']+)'/);
  const amountMatch = toolArgs.match(/amount=([-\d]+)/);
  
  if (productIdMatch) {
    productId = productIdMatch[1];
  }
  if (amountMatch) {
    amount = parseInt(amountMatch[1], 10);
  }
  
  // 2. Ekstrak kalimat konfirmasi natural dari AI secara andal
  // Ambil semua teks SETELAH blok tool_code yang kita temukan
  const responseText = rawOutput.substring(toolCodeMatch[0].length).trim();
  if (responseText) {
    naturalResponse = responseText;
  }
}

// 3. Kembalikan semuanya dalam satu output JSON yang rapi
return {
  json: {
    // Data untuk node HTTP Request selanjutnya
    productId: productId,
    amount: amount,
    
    // Kalimat konfirmasi yang akan dikirim ke user
    natural_response: naturalResponse
  }
};
