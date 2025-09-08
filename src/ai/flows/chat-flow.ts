
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

// Tool 1: Get Product Stock
const getProductStockTool = ai.defineTool(
  {
    name: 'getProductStock',
    description: 'Get the current stock for products. You can filter by product name or category.',
    inputSchema: z.object({
      query: z.string().optional().describe('The name or category of the product to search for. e.g., "creampuff", "baby puff", "millecrepes".'),
    }),
    outputSchema: z.array(z.object({
        id: z.string(),
        name: z.string(),
        stock: z.number(),
        category: z.string(),
    })),
  },
  async ({ query }) => {
    console.log(`Tool getProductStock called with query: ${query}`);
    if (!adminDb) {
      console.error("Firestore Admin is not initialized.");
      return [{ id: "error", name: "Database Error", stock: 0, category: "Error" }];
    }
    try {
      let productsQuery: admin.firestore.Query = adminDb.collection("products");
      
      const productSnapshot = await productsQuery.get();
      let allProducts: Product[] = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

      if (!query) return allProducts;
      
      const lowerCaseQuery = query.toLowerCase().trim();
      const filteredProducts = allProducts.filter(p => 
        p.name.toLowerCase().includes(lowerCaseQuery) || 
        p.category.toLowerCase().includes(lowerCaseQuery)
      );
      
      console.log(`Found ${filteredProducts.length} products for query: ${query}`);
      return filteredProducts;
    } catch (error: any) {
        console.error("Error in getProductStockTool:", error);
        return [{ id: "error", name: `Error fetching data: ${error.message}`, stock: 0, category: "Error" }];
    }
  }
);

// Tool 2: Add New Product
const addProductTool = ai.defineTool(
  {
    name: 'addProduct',
    description: 'Use this tool to add a new product to the stock list. This tool requires the product name and category.',
    inputSchema: z.object({
      name: z.string().describe('The name of the new product.'),
      category: z.enum(["Creampuff", "Cheesecake", "Millecrepes", "Minuman", "Snackbox", "Lainnya"]).describe('The category of the new product.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async ({ name, category }) => {
    console.log(`Tool addProduct called with: ${name}, ${category}`);
    if (!adminDb) {
      return { success: false, message: "Database error." };
    }
    try {
      const newProductRef = adminDb.collection("products").doc();
      await newProductRef.set({
        id: newProductRef.id,
        name,
        category,
        stock: 0,
        image: "https://placehold.co/600x400.png",
      });
      return { success: true, message: `Product "${name}" created successfully.` };
    } catch (error: any) {
      return { success: false, message: `Failed to add product: ${error.message}` };
    }
  }
);

// Tool 3: Delete a Product
const deleteProductTool = ai.defineTool(
  {
    name: 'deleteProduct',
    description: 'Use this tool to permanently delete a product from the stock list. Requires the product ID.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the product to delete.'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async ({ id }) => {
    console.log(`Tool deleteProduct called with id: ${id}`);
    if (!adminDb) {
      return { success: false, message: "Database error." };
    }
    try {
      await adminDb.collection("products").doc(id).delete();
      return { success: true, message: `Product with ID ${id} deleted successfully.` };
    } catch (error: any) {
      return { success: false, message: `Failed to delete product: ${error.message}` };
    }
  }
);

// Tool 4: Update Stock Quantity (REVISED LOGIC)
const updateStockTool = ai.defineTool(
  {
    name: 'updateStock',
    description: "Use this tool to add or subtract stock for a specific product. This tool is for INCREMENTAL changes. For example, if a user says 'tambah 5', use amount: 5. If a user says 'laku 2', use amount: -2.",
    inputSchema: z.object({
      productName: z.string().describe("The name of the product to update. e.g., 'Baby Puff', 'Millecrepes Coklat'."),
      amount: z.number().int().describe("The amount to add or subtract. Positive for adding stock, negative for reducing stock (sold)."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async ({ productName, amount }) => {
    console.log(`Tool updateStock called for "${productName}" with amount ${amount}`);
    if (!adminDb) {
      return { success: false, message: "Database error." };
    }

    try {
      // Find the product by name first
      const productsRef = adminDb.collection("products");
      const snapshot = await productsRef.where('name', '==', productName).limit(1).get();

      if (snapshot.empty) {
        return { success: false, message: `Produk dengan nama "${productName}" tidak ditemukan.` };
      }

      const productDoc = snapshot.docs[0];
      const productRef = productDoc.ref;

      // Use a transaction to safely update the stock
      await adminDb.runTransaction(async (transaction) => {
        const doc = await transaction.get(productRef);
        if (!doc.exists) {
          throw new Error("Document does not exist!");
        }
        const currentStock = doc.data()?.stock || 0;
        const newStock = currentStock + amount;

        if (newStock < 0) {
          throw new Error(`Stok tidak mencukupi. Sisa stok ${currentStock}, mau dikurangi ${Math.abs(amount)}.`);
        }
        
        transaction.update(productRef, { stock: newStock });
      });

      return { success: true, message: `Stok untuk "${productName}" berhasil diupdate.` };
    } catch (error: any) {
      return { success: false, message: `Gagal mengupdate stok: ${error.message}` };
    }
  }
);

const systemPrompt = `You are PuffBot, a friendly and helpful assistant for Dreampuff, a pastry shop.
Your main task is to provide information about product stock and manage it.
Always answer in Indonesian in a friendly, casual, and conversational tone. Make your answers feel natural, not robotic.

Here's how you MUST behave:
1.  **Analyze Conversation History:** ALWAYS analyze the full conversation history to understand the context before answering.
2.  **Use Existing Data:** If the user asks a question that can be answered from information already present in the history (e.g., a list of stocks you just provided), you MUST use that existing data. DO NOT call the tool again.
3.  **Perform Analysis:** If you have provided a list of products and their stock, and the user then asks a follow-up question like "mana yang stoknya paling banyak?" (which one has the most stock?), you MUST analyze the list from the history, find the product with the highest stock, and state the answer clearly.
4.  **Smart Tool Use:** Only use tools if the user asks for new information that is NOT available in the conversation history.
5.  **Handle Zero Stock:** If a product has 0 stock, explicitly state that it is "habis" (sold out) or "kosong".
6.  **Menambah Produk:** Jika user meminta untuk menambah produk baru, gunakan tool \`addProduct\`. Pastikan kamu menanyakan kategori produk jika user tidak menyediakannya.
7.  **Menghapus Produk:** Jika user meminta untuk menghapus produk, pertama-tama gunakan \`getProductStock\` untuk mencari produk dan mendapatkan ID-nya. Setelah mendapatkan ID, selalu konfirmasi kembali ke user ("Yakin mau hapus [Nama Produk]?") sebelum menggunakan tool \`deleteProduct\` dengan ID tersebut.
8.  **Mengubah Stok (PENTING!):** Jika user ingin menambah atau mengurangi stok (misal: "laku 2" atau "tambah 10"), kamu HARUS langsung menggunakan tool \`updateStock\`.
    -   Kamu HARUS memberikan nama produk yang jelas di parameter \`productName\`.
    -   Kamu HARUS memberikan jumlah perubahan di parameter \`amount\`. Gunakan angka positif untuk menambah (misal: tambah 5 -> amount: 5) dan angka negatif untuk mengurangi (misal: laku 2 -> amount: -2).
    -   JANGAN memanggil tool lain dulu. Langsung panggil \`updateStock\`.
9.  **Confirm After Action**: After you have successfully used a tool (like addProduct, deleteProduct, or updateStock), you MUST provide a friendly confirmation message to the user in Indonesian, for example: "Oke, sudah beres ya!" or "Sip, produknya sudah aku update."`;


const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: z.custom<MessageData[]>(),
    outputSchema: z.string(),
  },
  async (history) => {
    // Construct the prompt for the model.
    const prompt = {
      system: systemPrompt,
      messages: [...history],
      model: 'googleai/gemini-pro',
      tools: [getProductStockTool, addProductTool, deleteProductTool, updateStockTool],
      config: {
        multiTurn: true
      }
    };

    // Generate a response.
    const result = await ai.generate(prompt);
    const output = result.output();

    if (!output) {
      return "Maaf, terjadi kesalahan dan aku tidak bisa memberikan jawaban.";
    }

    // Check for tool calls
    if (output.toolCalls && output.toolCalls.length > 0) {
      const toolCall = output.toolCalls[0];
      const toolResponse = await ai.runTool(toolCall);

      const finalResult = await ai.generate({
          system: systemPrompt,
          messages: [...history, result.message, { role: 'tool', content: [toolResponse] }],
          model: 'googleai/gemini-pro',
          tools: [getProductStockTool, addProductTool, deleteProductTool, updateStockTool],
      });
      return finalResult.text;
    }
    
    // Return the text response.
    return output.text || "Ada yang bisa dibantu lagi?";
  }
);


// Wrapper function to be called from the API route.
export async function conversationalChat(history: MessageData[]) {
  return await chatFlow(history);
}
