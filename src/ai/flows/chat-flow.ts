
'use server';
/**
 * @fileOverview A conversational AI flow for Dreampuff stock management.
 *
 * - conversationalChat - A function that handles the chat conversation.
 */
import {ai} from '@/ai/genkit';
import {adminDb} from '@/lib/firebase/server';
import type {Product} from '@/lib/types';
import {z} from 'zod';
import {type MessageData} from 'genkit';
import * as admin from 'firebase-admin';

// Tool: Update Stock Quantity
// Ini adalah tool yang akan dieksekusi. Dibuat lebih sederhana dan kuat.
const updateStockTool = ai.defineTool(
  {
    name: 'updateStock',
    description: "Use this tool to add or subtract stock for a specific product. This tool is for INCREMENTAL changes. For example, if a user says 'tambah 5', use amount: 5. If a user says 'laku 2' or 'terjual 2', use amount: -2.",
    inputSchema: z.object({
      productId: z.string().describe("The UNIQUE ID of the product to update. MUST be one of the IDs from the product list provided in the prompt."),
      amount: z.number().int().describe("The amount to add or subtract. Positive for adding stock, negative for reducing stock (sold)."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async ({ productId, amount }) => {
    console.log(`Tool updateStock called for ID "${productId}" with amount ${amount}`);
    if (!adminDb) {
      return { success: false, message: "Database error." };
    }

    try {
      const productRef = adminDb.collection("products").doc(productId);
      
      await adminDb.runTransaction(async (transaction) => {
        const doc = await transaction.get(productRef);
        if (!doc.exists) {
          throw new Error(`Product with ID ${productId} not found.`);
        }
        const currentStock = doc.data()?.stock || 0;
        const newStock = currentStock + amount;

        if (newStock < 0) {
          throw new Error(`Stok tidak mencukupi. Sisa stok ${currentStock}, mau dikurangi ${Math.abs(amount)}.`);
        }
        
        transaction.update(productRef, { stock: newStock });
      });
      
      const updatedDoc = await productRef.get();
      const productName = updatedDoc.data()?.name || `Produk ID ${productId}`;

      return { success: true, message: `Stok untuk "${productName}" berhasil diupdate.` };
    } catch (error: any) {
      return { success: false, message: `Gagal mengupdate stok: ${error.message}` };
    }
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
    })).optional().describe("A list of all available products with their details, including ID.")
});

// System Prompt Baru yang Lebih Sederhana
const systemPrompt = `You are PuffBot, a friendly and helpful assistant for Dreampuff, a pastry shop.
Your main task is to provide information about product stock and manage it.
Always answer in Indonesian in a friendly and conversational tone.

Here is the list of available products. Use this as your primary source of truth for product names, current stock, and especially their IDs.
ALWAYS use the product ID from this list when you need to call a tool.

{{{json productList}}}

RULES:
1.  **Don't Hallucinate**: If the user mentions a product not in the list, inform them it doesn't exist.
2.  **Update Stock (PENTING!):** If the user wants to add or reduce stock (e.g., "laku 2", "terjual 5", "tambah 10"), you MUST immediately use the \`updateStock\` tool.
    -   Find the correct product from the product list above to get its UNIQUE ID.
    -   Provide the \`productId\` and the change amount in the \`amount\` parameter.
    -   Use a positive number for adding stock (e.g., tambah 5 -> amount: 5).
    -   Use a negative number for reducing/sold stock (e.g., laku 2 -> amount: -2).
    -   DO NOT ask for confirmation. Just call the tool.
3.  **General Questions**: If the user asks for stock information, use the data from the product list provided above. Do not call any tools for this.
4.  **Confirm After Action**: After you have successfully used a tool, you MUST provide a friendly confirmation message to the user in Indonesian, for example: "Oke, sudah beres ya!" or "Sip, stok Baby Puff sudah aku update."`;

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
      model: 'googleai/gemini-1.5-flash-preview', // Menggunakan model yang lebih baru
      tools: [updateStockTool], // Hanya tool yang relevan
      config: {
        multiTurn: true
      }
    });

    const output = result.output();

    if (!output) {
      return "Maaf, terjadi kesalahan dan aku tidak bisa memberikan jawaban.";
    }

    // Penanganan pemanggilan tool
    if (output.toolCalls && output.toolCalls.length > 0) {
      const toolCall = output.toolCalls[0];
      console.log('AI is calling a tool:', toolCall);

      // Eksekusi tool
      const toolResponse = await ai.runTool(toolCall);
      console.log('Tool response:', toolResponse);

      // Lanjutkan percakapan dengan hasil dari tool
      const finalResult = await ai.generate({
          system: systemPrompt,
          prompt: { productList },
          messages: [...history, result.message, { role: 'tool', content: [toolResponse] }],
          model: 'googleai/gemini-1.5-flash-preview',
          tools: [updateStockTool],
      });
      return finalResult.text;
    }
    
    // Jika tidak ada tool yang dipanggil, kembalikan teks biasa
    return output.text || "Ada yang bisa dibantu lagi?";
  }
);


// Wrapper function untuk dipanggil dari API route
// Disesuaikan untuk menerima input baru
export async function conversationalChat(input: z.infer<typeof ChatFlowInputSchema>) {
  return await chatFlow(input);
}
