
'use server';
/**
 * @fileOverview A conversational AI flow for Dreampuff stock management.
 *
 * - chatFlow - A function that handles the chat conversation.
 */
import { ai } from '@/ai/genkit';
import { adminDb } from '@/lib/firebase/server';
import type { Product } from '@/lib/types';
import { z } from 'zod';
import { Message } from 'genkit/ai';

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
export const chatFlow = ai.defineFlow(
    {
      name: 'chatFlow',
      inputSchema: z.array(z.custom<Message>()),
      outputSchema: z.string(),
    },
    async (history) => {
      const systemPrompt = `You are a friendly and helpful assistant for Dreampuff, a pastry shop.
Your name is PuffBot.
You can check product stock.
When asked about stock, use the getProductStock tool.
If the user asks a follow-up question, use the context from the conversation history.
Keep your answers concise and friendly.
Always answer in Indonesian.
If a product has 0 stock, explicitly state that it is "habis" (sold out).`;

      const result = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        tools: [getProductStockTool],
        prompt: {
            system: systemPrompt,
            history: history,
        },
      });

      return result.text;
    }
);

// Wrapper function to be called from the API route.
export async function conversationalChat(history: Message[]) {
  return await chatFlow(history);
}
