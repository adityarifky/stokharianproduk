
import { NextRequest, NextResponse } from 'next/server';
import { MessageData, generate } from 'genkit';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/server'; // Pastikan adminDb diimpor
import type { Product } from '@/lib/types';


export const revalidate = 0;


// --- 1. DEFINISI TOOLS UNTUK AI ---


const getStockTool = ai.defineTool(
  {
    name: 'getStock',
    description: 'Mendapatkan daftar stok produk yang tersedia.',
    inputSchema: z.object({
      productName: z.string().optional().describe('Nama spesifik produk yang ingin dicek, e.g., "Puff Cokelat"'),
    }),
    outputSchema: z.array(z.object({
      id: z.string(),
      name: z.string(),
      stock: z.number(),
      category: z.string(),
    })),
  },
  async ({ productName }) => {
    if (!adminDb) {
      console.error("TOOL ERROR: Firestore Admin not initialized.");
      return [];
    }
    console.log(`Tool 'getStock' dipanggil dengan parameter:`, { productName });
    try {
      let query: admin.firestore.Query<admin.firestore.DocumentData>;
      if (productName) {
        // Query untuk nama yang mirip (case-insensitive)
        const lowerCaseName = productName.toLowerCase();
        const productsRef = adminDb.collection("products");
        const snapshot = await productsRef.get();
        const filteredDocs = snapshot.docs.filter(doc => 
            doc.data().name.toLowerCase().includes(lowerCaseName)
        );
        if (filteredDocs.length > 0) {
            return filteredDocs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        }
        return [];
      } else {
        query = adminDb.collection("products").orderBy("name");
      }
      const snapshot = await query.get();
      const products: Product[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      return products;
    } catch (error) {
      console.error("Error fetching stock from tool:", error);
      return [];
    }
  }
);


const updateStockTool = ai.defineTool(
  {
      name: 'updateStock',
      description: "Memperbarui jumlah stok produk. Gunakan untuk menambah atau mengurangi stok. Wajib menanyakan nama dan posisi user SEBELUM memanggil tool ini.",
      inputSchema: z.object({
          productName: z.string().describe("Nama produk yang akan diupdate."),
          amount: z.number().int().describe("Jumlah yang akan diubah. Gunakan angka negatif untuk mengurangi (terjual), positif untuk menambah."),
          session: z.object({
              name: z.string().describe("Nama pengguna yang melakukan update."),
              position: z.string().describe("Posisi pengguna (e.g., Kasir, Kitchen).")
          }).describe("Informasi sesi pengguna yang melakukan perubahan.")
      }),
      outputSchema: z.object({
          success: z.boolean(),
          message: z.string(),
          newStock: z.number().optional(),
      })
  },
  async ({ productName, amount, session }) => {
      if (!adminDb) {
        console.error("TOOL ERROR: Firestore Admin not initialized.");
        return { success: false, message: 'Database tidak terhubung.' };
      }
      console.log(`Tool 'updateStock' dipanggil dengan parameter:`, { productName, amount, session });


      try {
        const productsRef = adminDb.collection("products");
        const snapshot = await productsRef.where('name', '==', productName).limit(1).get();


        if (snapshot.empty) {
            return { success: false, message: `Produk '${productName}' tidak ditemukan.` };
        }


        const productDoc = snapshot.docs[0];
        const productData = productDoc.data() as Product;
        const newStock = (productData.stock || 0) + amount;


        await productDoc.ref.update({ stock: newStock });
        
        // Di sini kita bisa menambahkan logic untuk mencatat riwayat ke collection lain jika perlu
        // (stock_history atau sales_history)


        return {
            success: true,
            message: `Stok untuk ${productName} berhasil diperbarui menjadi ${newStock}.`,
            newStock: newStock,
        };
      } catch (error: any) {
        console.error("Error updating stock from tool:", error);
        return { success: false, message: `Gagal memperbarui stok: ${error.message}` };
      }
  }
);




// --- 2. PROMPT UTAMA UNTUK AI ---


const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  system: `
    Kamu adalah PuffBot, asisten AI untuk toko kue Dreampuff. Kamu ramah, gaul, dan selalu pakai bahasa tongkrongan anak Jaksel. Panggil user dengan "bro".

    Tugas utamamu:
    1.  **Menjawab Pertanyaan Stok:** Jika user bertanya tentang stok ("cek stok", "sisa berapa", dll.), gunakan tool \`getStock\` untuk mendapatkan data terbaru. Sajikan data dalam format yang ringkas dan mudah dibaca.
    2.  **Memproses Update Stok:**
        - Jika user ingin mengubah stok ("tambah", "kurang", "terjual", "update"), **JANGAN LANGSUNG PANGGIL TOOL \`updateStock\`**.
        - Sebagai gantinya, kamu **WAJIB** merespons dengan pertanyaan untuk meminta nama dan posisi user. Contoh responsmu: "oke, siap bro! sebelum aku proses, nama & posisi lo apa? (contoh: budi kasir)".
        - Biarkan user menjawab pertanyaan itu. Alur kerja di n8n akan menangani jawaban user dan memanggil tool \`updateStock\` di langkah selanjutnya. Kamu tidak perlu khawatir tentang itu.
    3.  **Obrolan Santai:** Jika user hanya menyapa atau ngobrol santai, balas dengan gaya khasmu.

    Aturan Penting:
    - Selalu gunakan bahasa yang santai dan gaul.
    - Jangan pernah menampilkan output dalam format JSON atau teknis kepada user.
    - Untuk update stok, selalu konfirmasi dulu dengan menanyakan nama dan posisi. Ini adalah aturan wajib.
  `,
  tools: [getStockTool, updateStockTool],
});




// --- 3. API ROUTE HANDLER ---


export async function POST(req: NextRequest) {
  try {
    const { history } = await req.json() as { history: MessageData[] };


    if (!history || !Array.isArray(history)) {
      return NextResponse.json({ error: 'Invalid request body, "history" is required.' }, { status: 400 });
    }


    const result = await generate({
      model: ai.model,
      prompt: history,
      system: chatPrompt.system,
      tools: chatPrompt.tools,
    });


    const answer = result.text;
    const toolCalls = result.toolCalls;
    const toolOutputs = result.toolOutputs;


    console.log("AI Response:", { answer, toolCalls, toolOutputs });


    // Mengembalikan respons natural dari AI, termasuk pertanyaan untuk nama/posisi
    return NextResponse.json({ answer, toolCalls, toolOutputs });


  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    const errorMessage = error.message || 'An unexpected error occurred.';
    const errorDetails = error.cause || 'No additional details.';
    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 });
  }
}
