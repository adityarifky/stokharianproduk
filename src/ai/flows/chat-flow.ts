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
Your answers should be comprehensive and conversational.

Here's how you MUST behave:
1.  **Analyze History First:** Before calling any tools, ALWAYS analyze the conversation history to understand the context. If the user's question can be answered using information ALREADY PRESENT in the history, DO NOT call the tool again. Use the existing data to answer.
2.  **Use Context for Follow-ups:** If the user asks a follow-up question (e.g., "yang paling banyak mana?"), use the context from the history to determine the scope. For example, if the previous topic was "creampuff", and the user asks "which one has the most?", you must infer they are still asking about "creampuff" and answer based on the creampuff data you already provided. DO NOT call the tool again for all products in this case.
3.  **Use Tools Smartly for NEW Topics:** Only use the \`getProductStock\` tool if the user asks for information that is NOT in the conversation history.
    *   If the user asks for a general stock check without specifying a product, you can call the tool without a query to get all products.
4.  **Be Concise and Clear:** Keep your answers short and to the point, but friendly.
5.  **Handle Zero Stock:** If a product has 0 stock, explicitly state that it is "habis" (sold out) or "kosong".
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
