'use server';
/**
 * @fileOverview A conversational AI flow for Dreampuff stock management.
 *
 * - conversationalChat - A function that handles the chat conversation.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {type MessageData} from 'genkit';

// Tool: Update Stock Quantity
// Tool ini dieksekusi oleh AI ketika user ingin mengubah jumlah stok.
const updateStockTool = ai.defineTool(
  {
    name: 'updateStock',
    description: "Gunakan tool ini HANYA untuk mengubah jumlah stok produk (menambah atau mengurangi). Contoh: 'tambah 5' -> amount: 5, 'laku 2' -> amount: -2.",
    inputSchema: z.object({
      productId: z.string().describe("ID unik dari produk yang akan diupdate. WAJIB pilih dari daftar produk yang tersedia."),
      amount: z.number().int().describe("Jumlah yang akan ditambahkan (positif) atau dikurangkan (negatif)."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async ({ productId, amount }) => {
    // Logika untuk memanggil API internal-mu untuk update stok
    // Ini hanya contoh, sesuaikan dengan implementasi API-mu
    console.log(`Tool 'updateStock' dipanggil: productId=${productId}, amount=${amount}`);
    
    // Asumsi kamu punya fungsi untuk berinteraksi dengan database
    // import { adminDb } from '@/lib/firebase/server';
    // const productRef = adminDb.collection("products").doc(productId);
    // await productRef.update({ stock: admin.firestore.FieldValue.increment(amount) });

    return { success: true, message: `Stok untuk produk ID ${productId} berhasil diubah.` };
  }
);


// Schema untuk Input Flow yang baru
// Sekarang menerima daftar produk sebagai bagian dari input.
const ChatFlowInputSchema = z.object({
    history: z.custom<MessageData[]>(),
    productList: z.array(z.object({
        id: z.string(),
        name: z.string(),
        stock: z.number(),
        category: z.string(),
    })).describe("Daftar lengkap semua produk yang tersedia beserta ID, nama, stok, dan kategori.")
});

// System Prompt yang diperbarui dan lebih cerdas
const systemPrompt = `Anda adalah PuffBot, asisten AI untuk toko kue Dreampuff. Kepribadian Anda ramah, santai, dan profesional. Selalu panggil pengguna "bro".

# PERATURAN UTAMA
1.  **EKSEKUSI PERINTAH (PRIORITAS #1):** Jika pesan pengguna adalah perintah untuk mengubah data (contoh: "tambah stok", "laku 2", "stoknya jadi 5"), Anda WAJIB langsung memanggil `tool` yang sesuai. JANGAN bertanya untuk konfirmasi. Langsung eksekusi. Gunakan daftar produk di bawah sebagai referensi utama untuk mendapatkan `productId`.
2.  **JAWAB PERTANYAAN (PRIORITAS #2):** Jika bukan perintah, jawab pertanyaan pengguna berdasarkan histori percakapan dan daftar produk yang tersedia.
3.  **BAHASA:** Selalu jawab dalam Bahasa Indonesia yang santai.
4.  **JANGAN HALUSINASI:** Jika produk yang disebut tidak ada di daftar, beri tahu pengguna dengan sopan.

---
Berikut adalah daftar produk yang tersedia saat ini. Gunakan ini sebagai sumber kebenaranmu.

{{{json productList}}}
---
`;

// Flow AI yang sudah diperbarui
const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatFlowInputSchema,
    outputSchema: z.string(),
  },
  async ({ history, productList }) => {
    
    const result = await ai.generate({
      system: systemPrompt,
      prompt: { productList }, // Melewatkan daftar produk ke dalam prompt
      messages: [...history],
      model: 'googleai/gemini-1.5-flash-preview',
      tools: [updateStockTool],
      config: {
        multiTurn: true
      }
    });

    const output = result.output();

    if (!output) {
      return "Maaf, terjadi kesalahan dan aku tidak bisa memberikan jawaban, bro.";
    }

    // Jika AI memanggil tool, eksekusi dan lanjutkan percakapan
    if (output.toolCalls && output.toolCalls.length > 0) {
      const toolCall = output.toolCalls[0];
      console.log('AI memanggil tool:', toolCall);

      const toolResponse = await ai.runTool(toolCall);
      console.log('Respon dari tool:', toolResponse);

      // Lanjutkan percakapan dengan hasil dari tool
      const finalResult = await ai.generate({
          system: systemPrompt,
          prompt: { productList },
          messages: [...history, result.message, { role: 'tool', content: [toolResponse] }],
          model: 'googleai/gemini-1.5-flash-preview',
          tools: [updateStockTool],
      });
      return finalResult.text || "Sip, sudah beres, bro! Ada lagi?";
    }
    
    // Jika tidak ada tool yang dipanggil, kembalikan jawaban teks biasa
    return output.text || "Ada yang bisa dibantu lagi, bro?";
  }
);


// Wrapper function untuk dipanggil dari API route
export async function conversationalChat(input: z.infer<typeof ChatFlowInputSchema>) {
  return await chatFlow(input);
}
