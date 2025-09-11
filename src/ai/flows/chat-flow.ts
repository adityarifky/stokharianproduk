'use server';
/**
 * @fileOverview A conversational AI flow for Dreampuff stock management.
 *
 * - conversationalChat - A function that handles the chat conversation.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {type MessageData} from 'genkit';
import { adminDb } from '@/lib/firebase/server';
import { FieldValue }s from 'firebase-admin/firestore';

// Tool: Update Stock Quantity
// This tool is executed by the AI when the user wants to change the stock quantity.
const updateStockTool = ai.defineTool(
  {
    name: 'updateStock',
    description: "Gunakan tool ini HANYA untuk mengubah jumlah stok produk (menambah atau mengurangi). Contoh: 'tambah 5' -> amount: 5, 'laku 2' -> amount: -2. ATAU untuk mengatur stok ke nilai absolut, contoh: 'stoknya jadi 5'. Jika user mengatur nilai absolut, hitung selisih dari stok saat ini.",
    inputSchema: z.object({
      productId: z.string().describe("ID unik dari produk yang akan diupdate. WAJIB pilih dari daftar produk yang tersedia."),
      amount: z.number().int().describe("Jumlah yang akan ditambahkan (positif) atau dikurangkan (negatif). Jika user mengatur stok ke nilai absolut (cth: 'stoknya jadi 10'), kamu WAJIB menghitung selisihnya (amount) dari stok saat ini."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async ({ productId, amount }) => {
    if (!adminDb) {
      return { success: false, message: "Database tidak terinisialisasi." };
    }
    try {
      const productRef = adminDb.collection("products").doc(productId);
      await productRef.update({ stock: FieldValue.increment(amount) });
      return { success: true, message: `Stok untuk produk ID ${productId} berhasil diubah.` };
    } catch (error) {
      console.error(`Tool 'updateStock' gagal:`, error);
      return { success: false, message: `Gagal mengubah stok untuk produk ID ${productId}.` };
    }
  }
);

// Schema for the new Flow Input
// Now accepts a product list as part of the input.
const ChatFlowInputSchema = z.object({
    history: z.custom<MessageData[]>(),
    productList: z.array(z.object({
        id: z.string(),
        name: z.string(),
        stock: z.number(),
        category: z.string(),
    })).optional().describe("Daftar lengkap semua produk yang tersedia beserta ID, nama, stok, dan kategori.")
});

// Updated and smarter System Prompt (Cleaned for Syntax)
const systemPrompt = `Anda adalah PuffBot, asisten AI untuk toko kue Dreampuff. Kepribadian Anda ramah, santai, dan profesional. Selalu panggil pengguna "bro".

PERATURAN UTAMA:

1. EKSEKUSI PERINTAH (PRIORITAS #1): Jika pesan pengguna adalah perintah untuk mengubah data (contoh: "tambah stok", "laku 2", "stoknya jadi 5"), Anda WAJIB langsung memanggil 'tool' yang sesuai. JANGAN bertanya untuk konfirmasi. Langsung eksekusi. Gunakan daftar produk di bawah sebagai referensi utama untuk mendapatkan 'productId'. Jika produk tidak ditemukan, beri tahu user.

2. JAWAB PERTANYAAN (PRIORITAS #2): Jika bukan perintah, jawab pertanyaan pengguna berdasarkan histori percakapan dan daftar produk yang tersedia. Jika tidak ada daftar produk, minta maaf dan katakan ada masalah.

3. BAHASA: Selalu jawab dalam Bahasa Indonesia yang santai.

4. PERHITUNGAN AMOUNT: Jika user bilang "sisa 5" dan stok awal 12, maka 'amount' adalah -7. Jika user bilang "stoknya jadi 10" dan stok awal 8, maka 'amount' adalah 2. Anda harus bisa menghitung selisih ini.

---
Berikut adalah daftar produk yang tersedia saat ini. Gunakan ini sebagai sumber kebenaranmu.

{{{json productList}}}
---
`;

// Updated AI Flow
const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatFlowInputSchema,
    outputSchema: z.string(),
  },
  async ({ history, productList }) => {
    
    // Check if product list is empty or not provided
    if (!productList || productList.length === 0) {
      return "Waduh bro, maaf nih, aku lagi gabisa lihat daftar produknya. Kayaknya ada masalah teknis.";
    }
    
    const result = await ai.generate({
      system: systemPrompt,
      prompt: `Berikut adalah daftar produk yang tersedia: ${JSON.stringify(productList)}`,
      messages: [...history],
      model: 'googleai/gemini-1.5-flash-preview',
      tools: [updateStockTool],
      toolChoice: 'auto',
    });

    const output = result.output;

    if (!output) {
      return "Maaf, terjadi kesalahan dan aku tidak bisa memberikan jawaban, bro.";
    }

    // If the AI calls a tool, execute it and continue the conversation
    if (output.toolCalls && output.toolCalls.length > 0) {
      const toolCall = output.toolCalls[0];
      console.log('AI memanggil tool:', toolCall);

      const toolResponse = await ai.runTool(toolCall);
      console.log('Respon dari tool:', toolResponse);

      // Continue the conversation with the tool's result to provide a final response
      const finalResult = await ai.generate({
          system: systemPrompt,
          prompt: `Berikut adalah daftar produk yang tersedia: ${JSON.stringify(productList)}`,
          messages: [...history, result.message, { role: 'tool', content: [toolResponse] }],
          model: 'googleai/gemini-1.5-flash-preview',
          tools: [updateStockTool],
      });
      return finalResult.text || "Sip, sudah beres, bro! Ada lagi?";
    }
    
    // If no tool is called, return the plain text response
    return output.text || "Ada yang bisa dibantu lagi, bro?";
  }
);


// Wrapper function to be called from the API route
export async function conversationalChat(input: z.infer<typeof ChatFlowInputSchema>) {
  return await chatFlow(input);
}
