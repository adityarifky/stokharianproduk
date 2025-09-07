
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
import type { Query } from 'firebase-admin/firestore';

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
        description: 'Get the current stock for all products, a specific product, or a category of products.',
        inputSchema: z.object({
            query: z.string().optional().describe('The name of the product or category to check. If empty, get all products.'),
        }),
        outputSchema: z.array(z.object({
            name: z.string(),
            stock: z.number(),
            category: z.string(),
        })),
    },
    async (input) => {
        if (!adminDb) {
            console.error("Firestore Admin is not initialized.");
            return [];
        }
        try {
            let productsQuery: Query = adminDb.collection("products");

            if (input.query) {
                const lowerCaseQuery = input.query.toLowerCase();
                
                // Coba query berdasarkan kategori dulu
                const categoryQuery = productsQuery.where('category', '>=', lowerCaseQuery).where('category', '<=', lowerCaseQuery + '\uf8ff');
                let snapshot = await categoryQuery.get();

                // Jika tidak ada hasil, coba cari berdasarkan nama
                if (snapshot.empty) {
                    const nameQuery = productsQuery.orderBy('name').startAt(lowerCaseQuery).endAt(lowerCaseQuery + '\uf8ff');
                    snapshot = await nameQuery.get();
                }

                if (snapshot.empty) return [];

                // Filter manual untuk kasus .includes() yang tidak didukung Firestore
                const allProducts = snapshot.docs.map(doc => doc.data() as Product);
                const filteredProducts = allProducts.filter(p => 
                    p.name.toLowerCase().includes(lowerCaseQuery) ||
                    p.category.toLowerCase().includes(lowerCaseQuery)
                );
                
                return filteredProducts.map(({ name, stock, category }) => ({ name, stock, category }));

            } else {
                // Jika tidak ada query, ambil semua produk
                const snapshot = await productsQuery.get();
                if (snapshot.empty) return [];
                return snapshot.docs.map(doc => {
                    const data = doc.data() as Product;
                    return { name: data.name, stock: data.stock, category: data.category };
                });
            }
        } catch (error) {
            console.error("Error fetching from Firestore:", error);
            // Coba fallback dengan mengambil semua data jika query gagal
             try {
                const snapshot = await adminDb.collection("products").get();
                if (snapshot.empty) return [];
                let allProducts = snapshot.docs.map(doc => doc.data() as Product);
                 if(input.query){
                     const lowerCaseQuery = input.query.toLowerCase();
                     allProducts = allProducts.filter(p => 
                         p.name.toLowerCase().includes(lowerCaseQuery) ||
                         p.category.toLowerCase().includes(lowerCaseQuery)
                     );
                 }
                 return allProducts.map(({ name, stock, category }) => ({ name, stock, category }));
            } catch (fallbackError) {
                 console.error("Fallback fetch from Firestore also failed:", fallbackError);
                 return [];
            }
        }
    }
);


export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const systemPrompt = `You are a friendly and helpful assistant for "Dreampuff", a pastry shop.
Your name is PuffBot. You must use casual Indonesian language ("bro", "sist", "santai aja", "gaskeun", etc.).
Your primary function is to check daily product stock by using the provided tool.
If the user asks about stock for a product or a category, you MUST use the getProductStock tool with the user's query to get the real-time data.
Do not invent or make up stock numbers.
If you use the tool and it returns an empty list, it means the product or category doesn't exist or has no items. You should say something like "Waduh, produk atau kategori itu kayaknya ga ada di catatan deh bro."
Keep your answers concise and to the point.

If the stock is 0, say it's "habis" (sold out).
If the stock is low (1-5), mention that it's "tinggal sedikit" (only a few left) and maybe suggest to hurry up.
When providing stock info for a category, list all product names in that category and their respective stock.

Conversation History is provided below, use it to understand the context of the user's message.
Do not repeat information you have already given unless asked.
If you don't know the answer, just say "Waduh, aku kurang tau bro, coba tanya yang lain ya."
`;

const prompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { schema: ChatInputSchema },
  output: { schema: ChatOutputSchema },
  system: systemPrompt,
  tools: [getProductStockTool],
  prompt: `{{#if history}}
Riwayat Percakapan:
{{{history}}}
{{/if}}

Pesan Baru Pengguna:
{{{message}}}

Balasanmu:`,
});

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
