
'use server';

import { ai } from '@/ai/genkit';
import { NextRequest, NextResponse } from 'next/server';
import { defineTool } from 'genkit';
import { z } from 'zod';

const updateStockSchema = z.object({
    productId: z.string().describe("The unique ID of the product to update."),
    amount: z.number().int().describe("The amount to add (positive) or subtract (negative) from the stock."),
});

const updateStock = defineTool(
  {
    name: 'updateStock',
    description: 'Update the stock quantity for a specific product. Use for adding or subtracting stock.',
    inputSchema: updateStockSchema,
    outputSchema: z.any(),
  },
  async (input) => {
    // This is a placeholder. The actual stock update will be handled by n8n.
    // This tool's purpose is to structure the data for the n8n workflow.
    console.log(`Tool 'updateStock' called with:`, input);
    return { success: true, message: `Stock update for product ${input.productId} prepared.` };
  }
);

// --- PERBAIKAN PROMPT AI DI SINI ---
const chatPrompt = ai.definePrompt(
    {
        name: 'chatPrompt',
        tools: [updateStock],
        system: `
        Kamu adalah PuffBot, asisten AI untuk toko kue Dreampuff.
        TAPI, kamu bukan bot kaku. Kamu adalah anak gaul Jaksel banget.
        Gunakan sapaan seperti "bro", "sis", "goks", "mantap", "aman".
        Gaya bicaramu santai, friendly, dan to the point.
        
        Tugas utamamu adalah membantu pengguna mengelola stok produk.
        - Jika pengguna meminta menambah atau mengurangi stok, SELALU gunakan tool 'updateStock'.
        - JANGAN PERNAH menampilkan hasil dari tool call.
        - Setelah memanggil tool, SELALU berikan respons konfirmasi yang natural dan gaul dalam BAHASA INDONESIA.

        CONTOH INTERAKSI:
        User: "bro kurangin stok baby puff 2"
        AI: (Memanggil tool 'updateStock' dengan productId untuk "baby puff" dan amount -2)
        AI: "Okee, stok baby puff udah ku kurangin 2 ya bro. Aman!"

        User: "tambahin stok risol mayo 5 dong"
        AI: (Memanggil tool 'updateStock' dengan productId untuk "risol mayo" dan amount 5)
        AI: "Goks, siap! 5 risol mayo meluncur ke stok. Udah ku-update!"

        User: "cek stok dong"
        AI: "Waduh, buat sekarang aku belum bisa cek semua stok bro, masih belajar nih. Coba tanya spesifik aja, misalnya 'tambahin stok puff keju 3'."
        `
    }
);


export async function POST(req: NextRequest) {
  const { history } = await req.json();

  if (!history) {
    return NextResponse.json({ error: 'No history provided' }, { status: 400 });
  }

  try {
    const response = await ai.generate({
      prompt: {
        history: history,
      },
      model: ai.model('gemini-2.0-flash'),
      tools: [updateStock],
      config: {
        temperature: 0.7, // Sedikit lebih kreatif
      },
    });

    const answer = response.text;
    const toolCalls = response.toolRequests;

    // Gabungkan tool calls dan jawaban natural dalam satu output
    let finalOutput = '';
    if (toolCalls && toolCalls.length > 0) {
        // Ambil hanya tool call yang pertama untuk dieksekusi
        const call = toolCalls[0];
        finalOutput += `tool_code: print(${call.tool.name}(productId='${call.input.productId}', amount=${call.input.amount}))\n\n`;
    }
    finalOutput += answer || "Oke, beres bro!"; // Fallback jika AI lupa

    return NextResponse.json({ output: finalOutput });
    
  } catch (error: any) {
    console.error("Error processing chat:", error);
    const errorMessage = error.message || "An unknown error occurred";
    const errorDetails = error.details || "No details available";

    return NextResponse.json(
      { 
        error: `AI generation failed: ${errorMessage}`,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}
