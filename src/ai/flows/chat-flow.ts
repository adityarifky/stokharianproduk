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
import { defineFlow, type MessageData } from 'genkit/ai';

// Define the tool for getting product stock.
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
    console.log(`Tool called with query: ${query}`);
    if (!adminDb) {
      console.error("Firestore Admin is not initialized.");
      return [{ id: "error", name: "Database Error", stock: 0, category: "Error" }];
    }

    try {
      const productsQuery = adminDb.collection("products");
      const productSnapshot = await productsQuery.get();
      const allProducts: Product[] = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

      if (!query) {
        return allProducts;
      }

      const lowerCaseQuery = query.toLowerCase().trim();
      
      const filteredProducts = allProducts.filter(p => 
        p.name.toLowerCase().includes(lowerCaseQuery) || 
        p.category.toLowerCase().includes(lowerCaseQuery)
      );
      
      console.log(`Found ${filteredProducts.length} products for query: ${query}`);
      return filteredProducts;

    } catch (error: any) {
        console.error("Error fetching from Firestore in tool:", error);
        return [{ id: "error", name: `Error fetching data: ${error.message}`, stock: 0, category: "Error" }];
    }
  }
);

// Define the main chat flow.
const chatFlow = defineFlow(
  {
    name: 'chatFlow',
    inputSchema: z.array(z.any()), // Use z.any() to accept the history array
    outputSchema: z.string(),
  },
  async (history) => {
    const systemPrompt = `You are PuffBot, a friendly and helpful assistant for Dreampuff, a pastry shop.
Your main task is to provide information about product stock.
Always answer in Indonesian in a friendly, casual, and conversational tone. Make your answers feel natural, not robotic.

Here's how you MUST behave:
1.  **Analyze Conversation History:** ALWAYS analyze the full conversation history to understand the context before answering.
2.  **Use Existing Data:** If the user asks a question that can be answered from information already present in the history (e.g., a list of stocks you just provided), you MUST use that existing data. DO NOT call the tool again.
3.  **Perform Analysis:** If you have provided a list of products and their stock, and the user then asks a follow-up question like "mana yang stoknya paling banyak?" (which one has the most stock?), you MUST analyze the list from the history, find the product with the highest stock, and state the answer clearly. The same applies for finding the lowest stock or other comparisons.
4.  **Smart Tool Use:** Only use the \`getProductStock\` tool if the user asks for new information that is NOT available in the conversation history. For example, if the user asks for stock for the first time or asks about a different category you haven't discussed.
5.  **Handle Zero Stock:** If a product has 0 stock, explicitly state that it is "habis" (sold out) or "kosong".
6.  **Be Comprehensive but Conversational:** Provide complete information but in a way that feels like a natural conversation.

Example Scenario:
- User: "Cek stok dong"
- You (after using tool): "Oke, ini stoknya bro: [List of all products and stocks]"
- User: "Oke, dari semua itu yang paling banyak stoknya yang mana?"
- You (analyzing the history): "Yang paling banyak stoknya itu [Nama Produk] bro, ada [Jumlah] stok." // THIS IS THE CORRECT BEHAVIOR.
`;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.0-flash',
      tools: [getProductStockTool],
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
