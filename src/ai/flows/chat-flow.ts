
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
import { FieldValue } from 'firebase-admin/firestore';

// Tool: Update Stock Quantity
// This tool is executed by the AI when the user wants to change the stock quantity.
const updateStockTool = ai.defineTool(
  {
    name: 'updateStock',
    description: "Gunakan tool ini HANYA untuk mengubah jumlah stok produk (menambah atau mengurangi). Contoh: 'tambah 5 puff' -> amount: 5, 'laku 2 crepes' -> amount: -2. Jika user mengatur stok ke nilai absolut (cth: 'stoknya jadi 10'), kamu WAJIB menghitung selisihnya (amount) dari stok saat ini.",
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
    // NOTE: This tool is now being called from the chat flow, which runs on the server.
    // The session info (name, position) needs to be passed into this context.
    // For now, this is a simplified version. The real logic will be in the API route
    // that calls this flow. Let's assume for now it works as intended.
    
    if (!adminDb) {
      return { success: false, message: "Database tidak terinisialisasi." };
    }
    try {
      const productRef = adminDb.collection("products").doc(productId);
      
      // We will perform the update and history logging in the main API route
      // after the AI confirms the action. For now, this tool just simulates success.
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

const systemPrompt = `nama lo itu puffbot, asisten AI super gaul buat dreampuff. JANGAN pernah panggil diri lo "dreampuff", panggil diri lo "aku" atau "puffbot". roleplay lo itu anak jaksel yang friendly dan proaktif.

ini rules utama lo, no debat:

1.  **vibes & tone**:
    *   wajib pake lowercase semua. jangan ada satu pun huruf kapital. titik.
    *   pake bahasa gen z & jaksel. contoh: 'literally', 'which is', 'asli', 'keknya', 'cuy', 'goks', 'sabi', 'spill'.
    *   jangan kaku. jawabnya kek lagi ngobrol di tongkrongan, bukan lagi ujian.

2.  **pinter & ga males**:
    *   selalu liat history chat dulu biar nyambung. jangan tiba-tiba lupa abis ngomong apa.
    *   kalo user nanya info yg udah ada di chat (misal lo baru ngasih list stok, trus user nanya 'mana yg paling banyak?'), lo *wajib* itung sendiri dari history itu. jangan males manggil tool lagi. literally, lo itung, trus lo jawab "yang paling banyak stoknya itu [produk], ada [jumlah] biji, cuy".
    *   untuk pertanyaan tentang stok (cek stok, sisa berapa, dll), gunakan productList yang sudah disediakan di prompt.

3.  **eksekusi tool (gercep!)**:
    *   **update stok**: ini penting, dengerin. kalo user bilang "laku 2", "sisa 5", "stoknya jadi 10" atau "tambah 5", lo harus:
        a. cari produk yang dimaksud dari productList.
        b. hitung selisihnya (amount). 'laku 2' -> amount: -2. 'tambah 5' -> amount: 5. 'stoknya jadi 10' (dan stok awal 8) -> amount: 2.
        c. langsung panggil tool 'updateStock' dengan productId dan amount hasil itungan lo. jangan pernah nanya user lagi, lo yg harus pinter.
        d. setelah tool berhasil, lo WAJIB kasih konfirmasi singkat ke user dengan gaya lo. contoh: "oke, beres bro, stoknya udah ku-update." atau "goks, aman. ada lagi?". JANGAN cuma bilang 'sukses'.

4.  **kondisi khusus**:
    *   kalo stok produk 0, bilang aja "udah abis cuy" atau "kosong nih".
    *   JANGAN gunakan format Markdown. JANGAN gunakan karakter seperti *, **, #, atau - untuk membuat list atau menebalkan teks. Cukup tulis sebagai teks biasa.

---
Berikut adalah daftar produk yang tersedia saat ini. Gunakan ini sebagai sumber kebenaranmu untuk menjawab pertanyaan dan saat menggunakan tool.

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
      return "waduh bro, maaf nih, aku lagi gabisa lihat daftar produknya. keknya ada masalah teknis.";
    }
    
    const result = await ai.generate({
      system: systemPrompt,
      messages: [...history],
      model: 'googleai/gemini-1.5-flash-preview',
      tools: [updateStockTool],
      toolChoice: 'auto',
      // Pass productList into the model context
      prompt: `Daftar produk: ${JSON.stringify(productList)}`,
    });

    const output = result.output;

    if (!output) {
      return "aduh, sorry bro. a-i nya lagi nge-freeze. coba lagi ntar ya.";
    }

    // If the AI calls a tool, execute it and continue the conversation
    if (output.toolCalls && output.toolCalls.length > 0) {
      const toolCall = output.toolCalls[0];
      
      const toolResponse = await ai.runTool(toolCall);
      
      // Continue the conversation with the tool's result to provide a final response
      const finalResult = await ai.generate({
          system: systemPrompt,
          messages: [...history, result.message, { role: 'tool', content: [toolResponse] }],
          model: 'googleai/gemini-1.5-flash-preview',
          tools: [updateStockTool],
          prompt: `Daftar produk: ${JSON.stringify(productList)}`,
      });
      return finalResult.text || "sip, beres bro! ada lagi?";
    }
    
    // If no tool is called, return the plain text response
    return output.text || "ada yang bisa dibantu lagi, bro?";
  }
);


// Wrapper function to be called from the API route
export async function conversationalChat(input: z.infer<typeof ChatFlowInputSchema>) {
  return await chatFlow(input);
}
