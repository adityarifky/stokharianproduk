'use server';
/**
 * @fileOverview A conversational chat flow for Dreampuff stock bot.
 *
 * - chat - A function that handles the conversation, including history.
 * - ChatInput - The input type for the chat function.
 * - ChatOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { adminDb } from '@/lib/firebase/server';
import type { Product } from '@/lib/types';

const ChatInputSchema = z.object({
  history: z.string().optional().describe('The conversation history between the user and the assistant.'),
  message: z.string().describe('The latest message from the user.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  reply: z.string().describe('The AI assistant\'s response.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

// Helper function to get product stock from Firestore
const getProductStockTool = ai.defineTool(
    {
        name: 'getProductStock',
        description: 'Get the current stock for a specific product or a category of products. Use this if the user asks about stock.',
        inputSchema: z.object({
            query: z.string().describe('The name of the product or category to check.'),
        }),
        outputSchema: z.array(z.object({
            name: z.string(),
            stock: z.number(),
            category: z.string(),
        })),
    },
    async (input) => {
        console.log(`[getProductStockTool] Received query: "${input.query}"`);
        if (!adminDb) {
            console.error("[getProductStockTool] Firestore Admin is not initialized.");
            return [];
        }
        
        try {
            const lowerCaseQuery = input.query.toLowerCase().trim();
            const productsRef = adminDb.collection("products");

            const allProductsSnapshot = await productsRef.get();
            const allProducts = allProductsSnapshot.docs.map(doc => doc.data() as Product);

            // Filter by category first
            const categoryFiltered = allProducts.filter(p => 
                p.category.toLowerCase().includes(lowerCaseQuery)
            );

            if (categoryFiltered.length > 0) {
                console.log(`[getProductStockTool] Found ${categoryFiltered.length} item(s) by category.`);
                return categoryFiltered.map(({ name, stock, category }) => ({ name, stock, category }));
            }
            
            // If no category match, filter by product name
            const nameFiltered = allProducts.filter(p => 
                p.name.toLowerCase().includes(lowerCaseQuery)
            );

            if (nameFiltered.length > 0) {
                console.log(`[getProductStockTool] Found ${nameFiltered.length} item(s) by name.`);
                return nameFiltered.map(({ name, stock, category }) => ({ name, stock, category }));
            }
            
            console.log("[getProductStockTool] No products found matching query.");
            return [];

        } catch (error) {
            console.error("[getProductStockTool] Error fetching from Firestore:", error);
            return [];
        }
    }
);


export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const systemPrompt = `You are a friendly and helpful assistant for "Dreampuff", a pastry shop.
Your name is PuffBot. You must use casual Indonesian language ("bro", "sist", "santai aja", "gaskeun", etc.).
Your primary function is to check daily product stock.
If the user asks about stock for a product or a category, you MUST use the getProductStock tool.
Do not invent or make up stock numbers.
If the tool returns an empty list, it means the product or category doesn't exist. You should say something like "Waduh, produk atau kategori '{query}' kayaknya ga ada di catatan deh bro."
Keep your answers concise.

If the stock is 0, say it's "habis".
If the stock is low (1-5), mention that it's "tinggal sedikit" and suggest to hurry up.
When providing stock info for a category, list all product names in that category and their respective stock.

Conversation History is provided below, use it to understand the context.
Do not repeat information you have already given unless asked.
If you don't know the answer, just say "Waduh, aku kurang tau bro, coba tanya yang lain ya."
`;

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    
    const llmResponse = await ai.generate({
      prompt: `${input.history ? `HISTORY:\n${input.history}\n\n` : ''}USER MESSAGE:\n${input.message}`,
      model: 'googleai/gemini-1.5-flash-latest',
      tools: [getProductStockTool],
      system: systemPrompt,
    });

    const reply = llmResponse.text();
    
    if (reply) {
      return { reply };
    }

    return { reply: "Waduh, aku bingung bro. Coba tanya lagi dengan cara lain ya." };
  }
);
