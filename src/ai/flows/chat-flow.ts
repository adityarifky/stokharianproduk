'use server';
/**
 * @fileOverview A conversational AI flow for Dreampuff stock management.
 *
 * - conversationalChat - A function that handles the chat conversation.
 */
import { ai } from '@/ai/genkit';
import { adminDb } from '@/lib/firebase/server';
import type { Product } from '@/lib/types';
import { z } from 'zod';
import { type MessageData } from 'genkit';

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
      const productsQuery = adminDb.collection("products");
      const productSnapshot = await productsQuery.get();
      const allProducts: Product[] = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

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

// Tool 4: Update Stock Quantity
const updateStockTool = ai.defineTool(
  {
    name: 'updateStock',
    description: "Use this tool to update the stock quantity of a product. It requires the product ID and the final new stock quantity.",
    inputSchema: z.object({
      productId: z.string().describe("The ID of the product to update."),
      newStock: z.number().int().min(0).describe("The final stock count after the update."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async ({ productId, newStock }) => {
    console.log(`Tool updateStock called for ${productId} with new stock ${newStock}`);
    if (!adminDb) {
      return { success: false, message: "Database error." };
    }
    try {
      const productRef = adminDb.collection("products").doc(productId);
      await productRef.update({ stock: newStock });
      return { success: true, message: "Stock updated successfully." };
    } catch (error: any) {
      return { success: false, message: `Failed to update stock: ${error.message}` };
    }
  }
);

// Define the main chat flow.
const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: z.array(z.any()), // Use z.any() to accept the history array
    outputSchema: z.string(),
  },
  async (history) => {
    const systemPrompt = `You are PuffBot, a friendly and helpful assistant for Dreampuff, a pastry shop.
Your main task is to provide information about product stock and manage it.
Always answer in Indonesian in a friendly, casual, and conversational tone. Make your answers feel natural, not robotic.

Here's how you MUST behave:
1.  **Analyze Conversation History:** ALWAYS analyze the full conversation history to understand the context before answering.
2.  **Use Existing Data:** If the user asks a question that can be answered from information already present in the history (e.g., a list of stocks you just provided), you MUST use that existing data. DO NOT call the tool again.
3.  **Perform Analysis:** If you have provided a list of products and their stock, and the user then asks a follow-up question like "mana yang stoknya paling banyak?" (which one has the most stock?), you MUST analyze the list from the history, find the product with the highest stock, and state the answer clearly. The same applies for finding the lowest stock or other comparisons.
4.  **Smart Tool Use:** Only use tools if the user asks for new information that is NOT available in the conversation history.
5.  **Handle Zero Stock:** If a product has 0 stock, explicitly state that it is "habis" (sold out) or "kosong".
6.  **Be Comprehensive but Conversational:** Provide complete information but in a way that feels like a natural conversation.
7.  **Menambah Produk:** Jika user meminta untuk menambah produk baru, gunakan tool \`addProduct\`. Pastikan kamu menanyakan kategori produk jika user tidak menyediakannya.
8.  **Menghapus Produk:** Jika user meminta untuk menghapus produk, pertama-tama gunakan \`getProductStock\` untuk mencari produk dan mendapatkan ID-nya. Setelah mendapatkan ID, selalu konfirmasi kembali ke user ("Yakin mau hapus [Nama Produk]?") sebelum menggunakan tool \`deleteProduct\` dengan ID tersebut.
9.  **Mengubah Stok**: Jika user ingin menambah atau mengurangi stok (misal: "laku 2" atau "tambah 10"), kamu HARUS melakukan ini:
    a. Pertama, panggil \`getProductStock\` untuk mendapatkan jumlah stok saat ini dari produk tersebut.
    b. Kedua, hitung sendiri jumlah stok akhirnya (stok saat ini - laku, atau stok saat ini + tambah).
    c. Ketiga, panggil tool \`updateStock\` dengan \`productId\` dan jumlah stok akhir yang sudah kamu hitung (\`newStock\`). Jangan pernah bertanya ke user berapa jumlah stok akhirnya, kamu harus menghitungnya.
`;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      tools: [getProductStockTool, addProductTool, deleteProductTool, updateStockTool],
      prompt: {
          system: systemPrompt,
          history: history,
      },
    });

    if (!output) {
      return "Maaf, terjadi kesalahan dan aku tidak bisa memberikan jawaban.";
    }
    return output.text;
  }
);


// Wrapper function to be called from the API route.
export async function conversationalChat(history: MessageData[]) {
  return await chatFlow(history);
}
